/**
 * BundleWhatsNew
 * ──────────────
 * The "Yenilikler" (what's new) dialog logic, owned by the bundle so it
 * can be hot-reloaded without an exe rebuild.
 *
 * Behavior
 *   - Shows the latest 4 version notes (current + last 3 history items)
 *     fetched from the server's /version endpoint.
 *   - "Tamam" → close, dialog re-shows on next launch.
 *   - "Bir daha gösterme" → persist dismissal, won't show until a new
 *     version arrives.
 *
 * Why this lives in the bundle
 *   The launcher (.exe) ships with an older version of this dialog whose
 *   "Tamam" wrongly dismisses forever. We can't change the launcher
 *   without an exe rebuild, so the bundle pre-emptively writes the
 *   launcher's "last-seen" state to the current version. That makes the
 *   launcher's old call short-circuit, and the bundle's own dialog runs
 *   instead.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import { app, dialog, BrowserWindow } from 'electron';
import { DESKTOP_CODE_BASE_URL } from '../launcher/config';

interface VersionEntry {
  version: string;
  whatsNew: string;
}

interface VersionResponse {
  version: string;
  whatsNew?: string;
  history?: VersionEntry[];
}

const BUNDLE_STATE_FILE = 'bundle-whats-new-dismissed.txt';
const LAUNCHER_STATE_FILE = 'last-seen-code-version.txt';

function suppressLauncherWhatsNew(currentVersion: string): void {
  try {
    fs.writeFileSync(
      path.join(app.getPath('userData'), LAUNCHER_STATE_FILE),
      currentVersion,
      'utf-8',
    );
  } catch {
    /* non-critical */
  }
}

function readBundleDismissed(): string {
  try {
    return fs
      .readFileSync(path.join(app.getPath('userData'), BUNDLE_STATE_FILE), 'utf-8')
      .trim();
  } catch {
    return '';
  }
}

function writeBundleDismissed(version: string): void {
  try {
    fs.writeFileSync(
      path.join(app.getPath('userData'), BUNDLE_STATE_FILE),
      version,
      'utf-8',
    );
  } catch {
    /* non-critical */
  }
}

function fetchVersionWithHistory(timeoutMs = 5000): Promise<VersionResponse> {
  return new Promise((resolve, reject) => {
    const u = new URL(`${DESKTOP_CODE_BASE_URL}/version`);
    const client = u.protocol === 'https:' ? https : http;
    const req = client.request(
      {
        method: 'GET',
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        headers: { Accept: 'application/json' },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
            if (typeof data?.version !== 'string') {
              reject(new Error('Missing "version" field'));
              return;
            }
            const out: VersionResponse = { version: data.version };
            if (typeof data.whatsNew === 'string' && data.whatsNew.trim()) {
              out.whatsNew = data.whatsNew;
            }
            if (Array.isArray(data.history)) {
              out.history = data.history
                .filter(
                  (h: any) =>
                    h && typeof h.version === 'string' && typeof h.whatsNew === 'string',
                )
                .map((h: any) => ({ version: h.version, whatsNew: h.whatsNew }));
            }
            resolve(out);
          } catch (err: any) {
            reject(new Error(`Invalid JSON: ${err.message}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.end();
  });
}

/**
 * Synchronously block the launcher's older dialog from running.
 * Call this BEFORE any await in start(ctx) so it lands before the
 * launcher's `showCodeWhatsNewIfPending` call.
 */
export function suppressLauncherWhatsNewIfPossible(currentVersion: string | null): void {
  if (!currentVersion) return;
  suppressLauncherWhatsNew(currentVersion);
}

/**
 * Show the bundle's what's-new dialog. Safe to call multiple times —
 * each call no-ops unless the user hasn't dismissed this version yet.
 */
export async function showBundleWhatsNew(win: BrowserWindow): Promise<void> {
  if (!win || win.isDestroyed()) return;

  let versionData: VersionResponse;
  try {
    versionData = await fetchVersionWithHistory();
  } catch (err: any) {
    console.warn(`[BundleWhatsNew] Fetch failed: ${err?.message ?? err}`);
    return;
  }

  if (!versionData.whatsNew) return;
  if (readBundleDismissed() === versionData.version) return;
  if (win.isDestroyed()) return;

  // Build entry list: current + up to 3 history items, max 4 total.
  const entries: VersionEntry[] = [
    { version: versionData.version, whatsNew: versionData.whatsNew },
  ];
  if (Array.isArray(versionData.history)) {
    for (const h of versionData.history) {
      if (entries.length >= 4) break;
      if (h.version === versionData.version) continue;
      entries.push({ version: h.version, whatsNew: h.whatsNew });
    }
  }

  const detail = entries
    .map((e) => `v${e.version}\n${e.whatsNew}`)
    .join('\n\n──────────\n\n');

  let response: number;
  try {
    const result = await dialog.showMessageBox(win, {
      type: 'info',
      title: `Yenilikler — v${versionData.version}`,
      message: 'Uygulama güncellendi',
      detail,
      buttons: ['Tamam', 'Bir daha gösterme'],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });
    response = result.response;
  } catch (err: any) {
    console.warn(`[BundleWhatsNew] Dialog failed: ${err?.message ?? err}`);
    return;
  }

  // "Tamam" (response 0) → leave unseen, dialog re-shows next launch.
  // "Bir daha gösterme" (response 1) → mark dismissed for this version.
  if (response === 1) {
    writeBundleDismissed(versionData.version);
    console.log(
      `[BundleWhatsNew] User dismissed what's new for v${versionData.version}.`,
    );
  }
}
