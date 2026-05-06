/**
 * RemoteCodeLoader
 * ────────────────
 * Downloads scripts from the desktop-service backend and keeps them in
 * memory so they can be updated without rebuilding the exe.
 *
 * SECURITY
 *   All traffic uses the encrypted desktop channel:
 *     - POST /desktop-code/manifest  → encrypted JSON {files:{path:sha256}}
 *     - POST /desktop-code/file      → encrypted file bytes
 *   Requests are HMAC-signed and server-validated. See
 *   `desktop-crypto-client.ts` for the wire format.
 *
 *   Decrypted bytes NEVER touch disk — they live only in this process's
 *   memory and are discarded on exit. This keeps script source out of
 *   reach of anyone with file-system access to the client machine.
 *
 * SERVER LAYOUT  (backend/storage/desktop-code/)
 *   scripts/<name>.js
 *   version.json   { "version": "1.2.6.006", "whatsNew": "<optional release notes>" }
 *
 * UPDATING SCRIPTS (no exe rebuild required):
 *   scp -r desktop\remote-code\scripts ^
 *       mtsk@ekullanici_i86:/home/mtsk/mtsk.app/backend/storage/desktop-code/
 *   The backend rescans the folder on each manifest request — no restart
 *   needed. Clients re-fetch on next `sync()` whenever the version bumps
 *   or a hash changes.
 */

import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';
import { app, dialog, BrowserWindow } from 'electron';
import {
  IS_DEV,
  DESKTOP_CODE_BASE_URL,
  FORCE_REMOTE_CODE_IN_DEV,
  VERSION_POLL_SECONDS,
} from './config';
import {
  postSignedBinary,
  decryptPayload,
  signRequestBody,
} from './desktop-crypto-client';

interface CodeManifest {
  /** Map of relative path → hex SHA-256 hash */
  files: Record<string, string>;
  /** Remote code version string, e.g. "1.2.4.001" */
  version?: string;
}

interface VersionInfo {
  version: string;
  whatsNew?: string;
}

interface CachedFile {
  hash: string;
  content: Buffer;
}

const VERSION_UPDATED_CHANNEL = 'code-version-updated';

class RemoteCodeLoader {
  private files = new Map<string, CachedFile>();
  private _codeVersion: string | null = null;
  private _whatsNew: string | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private restartPromptShown = false;

  // ─────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────

  /**
   * Pulls the encrypted manifest, downloads any files whose hash differs
   * from the in-memory cache, and stores them in memory. Never throws —
   * silently falls back to whatever is already cached if the server is
   * unreachable. If no prior cache exists, callers will fall through to
   * their bundled fallback script.
   */
  async sync(opts: { force?: boolean } = {}): Promise<void> {
    if (IS_DEV && !FORCE_REMOTE_CODE_IN_DEV && !opts.force) {
      console.log('[CodeLoader] Dev mode — skipping remote code sync. (Set DESKTOP_FORCE_REMOTE_CODE=1 or call sync({force:true}) to enable.)');
      return;
    }
    if (IS_DEV) {
      console.log(`[CodeLoader] Dev mode — syncing (${opts.force ? 'forced' : 'env-flag'}).`);
    }
    try {
      console.log('[CodeLoader] Checking for code updates...');
      const manifest = await this.fetchManifest();

      if (!manifest.files || typeof manifest.files !== 'object') {
        throw new Error('Manifest missing "files" map');
      }

      let updatedCount = 0;
      const wantedPaths = new Set<string>();

      for (const [relPath, expectedHash] of Object.entries(manifest.files)) {
        const safePath = this.sanitizePath(relPath);
        wantedPaths.add(safePath);

        const cached = this.files.get(safePath);
        if (cached && cached.hash === expectedHash) continue;

        let content: Buffer;
        try {
          content = await this.fetchFile(safePath);
        } catch (dlErr: any) {
          console.warn(`[CodeLoader] Failed to download ${safePath}: ${dlErr.message}`);
          continue;
        }

        const actualHash = crypto.createHash('sha256').update(content).digest('hex');
        if (actualHash !== expectedHash) {
          console.warn(
            `[CodeLoader] Hash mismatch for ${safePath} (expected ${expectedHash}, got ${actualHash}) — skipped.`,
          );
          continue;
        }

        this.files.set(safePath, { hash: expectedHash, content });
        updatedCount++;
        console.log(`[CodeLoader] Updated: ${safePath}`);
      }

      // Drop in-memory entries that are no longer in the manifest
      // (server-side delete propagates).
      for (const cachedPath of this.files.keys()) {
        if (!wantedPaths.has(cachedPath)) {
          this.files.delete(cachedPath);
          console.log(`[CodeLoader] Pruned stale entry: ${cachedPath}`);
        }
      }

      // Manifest carries the authoritative version. whatsNew comes from the
      // lightweight /version endpoint (manifest doesn't include it to keep
      // payload size minimal for the heavy-fetch path).
      if (manifest.version) {
        const whatsNew = await this.fetchPlainVersion()
          .then((v) => v.whatsNew)
          .catch(() => undefined);
        this.setVersion(manifest.version, whatsNew);
      }

      console.log(
        updatedCount > 0
          ? `[CodeLoader] Sync complete — ${updatedCount} file(s) updated. version=${manifest.version ?? 'n/a'}`
          : `[CodeLoader] Already up to date. version=${manifest.version ?? 'n/a'}`,
      );
    } catch (err: any) {
      console.warn(`[CodeLoader] Sync failed: ${err.message}. Using in-memory cache.`);
    }
  }

  /**
   * Returns the remote code version string (e.g. "1.2.4.001"), or null if not yet synced.
   */
  getVersion(): string | null {
    return this._codeVersion;
  }

  /**
   * Returns the latest fetched whatsNew text, or null if none/not yet synced.
   */
  getWhatsNew(): string | null {
    return this._whatsNew;
  }

  /**
   * Returns the contents of a cached script as a string, or null if not cached.
   */
  getScript(relativePath: string): string | null {
    const safePath = this.sanitizePath(relativePath);
    const entry = this.files.get(safePath);
    return entry ? entry.content.toString('utf-8') : null;
  }

  /**
   * Returns the raw bytes of a cached file, or null if not cached.
   * Used by the renderer protocol handler and the main-bundle loader.
   */
  getFileBuffer(relativePath: string): Buffer | null {
    const safePath = this.sanitizePath(relativePath);
    const entry = this.files.get(safePath);
    return entry ? entry.content : null;
  }

  /**
   * UNIFIED INJECTION HELPER (use this for every remotely-updateable script).
   * Picks the cached script if available, otherwise uses the supplied fallback.
   * Substitutes any `__KEY__` placeholders with `JSON.stringify(params[key])`.
   */
  async runScriptOrFallback(
    win: BrowserWindow,
    scriptName: string,
    fallbackJs: string,
    params: Record<string, unknown> = {},
  ): Promise<unknown> {
    if (win.isDestroyed()) return undefined;
    const remote = this.getScript(scriptName);
    const source = remote ?? fallbackJs;
    const finalScript = this.substituteParams(source, params);
    try {
      return await win.webContents.executeJavaScript(finalScript);
    } catch (err: any) {
      console.error(`[CodeLoader] Script "${scriptName}" failed: ${err?.message ?? err}`);
      return undefined;
    }
  }

  /**
   * Starts a periodic background poll of `GET /desktop-code/version`. When
   * the server's version differs from the in-memory baseline (set by the
   * last successful sync), prompts the user to restart so the new code
   * loads on next launch.
   *
   * - No mid-session live-swap: scripts in memory stay frozen until restart.
   * - Idempotent: calling twice is a no-op.
   * - Skipped in dev unless DESKTOP_FORCE_REMOTE_CODE=1.
   * - Transient network failures are silently logged; next tick retries.
   */
  startVersionPolling(getMainWindow: () => BrowserWindow | null): void {
    if (this.pollTimer) return;
    if (IS_DEV && !FORCE_REMOTE_CODE_IN_DEV) {
      console.log('[CodeLoader] Dev mode — version polling skipped.');
      return;
    }
    const intervalMs = VERSION_POLL_SECONDS * 1000;
    console.log(`[CodeLoader] Version polling enabled (every ${VERSION_POLL_SECONDS}s)`);
    this.pollTimer = setInterval(() => {
      this.pollOnce(getMainWindow).catch(() => {});
    }, intervalMs);
  }

  stopVersionPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Show the post-update "Yenilikler" dialog if:
   *   - whatsNew text exists (server provided it),
   *   - the user hasn't seen this version's notes yet, and
   *   - the user hasn't globally opted out of code-version what's new.
   * Buttons:
   *   - "Tamam" → mark this version seen (won't show again for THIS version)
   *   - "Bir daha gösterme" → opt out forever (also marks seen)
   * Safe to call multiple times — each call no-ops unless eligible.
   */
  async showCodeWhatsNewIfPending(win: BrowserWindow): Promise<void> {
    if (!win || win.isDestroyed()) return;
    const version = this._codeVersion;
    const whatsNew = this._whatsNew;
    if (!version || !whatsNew) return;
    if (this.isCodeWhatsNewDisabled()) return;
    if (this.readLastSeenCodeVersion() === version) return;

    let response: number;
    try {
      const result = await dialog.showMessageBox(win, {
        type: 'info',
        title: `Yenilikler — v${version}`,
        message: 'Uygulama güncellendi',
        detail: whatsNew,
        buttons: ['Tamam', 'Bir daha gösterme'],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
      });
      response = result.response;
    } catch (err: any) {
      console.warn(`[CodeLoader] What's-new dialog failed: ${err?.message ?? err}`);
      return;
    }

    this.writeLastSeenCodeVersion(version);
    if (response === 1) {
      this.setCodeWhatsNewDisabled();
      console.log('[CodeLoader] User opted out of code-version what\'s new.');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // PRIVATE
  // ─────────────────────────────────────────────────────────────

  private setVersion(version: string, whatsNew?: string): void {
    const versionChanged = this._codeVersion !== version;
    this._codeVersion = version;
    this._whatsNew = whatsNew ?? null;
    if (versionChanged) {
      this.broadcastVersion(version);
    }
  }

  /** Push the version to every renderer so badges/UI can refresh live. */
  private broadcastVersion(version: string): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (win.isDestroyed()) continue;
      try {
        win.webContents.send(VERSION_UPDATED_CHANNEL, version);
      } catch {
        // ignore — renderer may not be ready
      }
    }
  }

  private async pollOnce(getMainWindow: () => BrowserWindow | null): Promise<void> {
    if (this.restartPromptShown) return;
    if (!this._codeVersion) return; // No baseline yet — wait for first sync.

    let latest: VersionInfo;
    try {
      latest = await this.fetchPlainVersion();
    } catch (err: any) {
      console.warn(`[CodeLoader] Version poll failed: ${err.message}`);
      return;
    }
    if (latest.version === this._codeVersion) return;

    const previousVersion = this._codeVersion;
    console.log(`[CodeLoader] New version detected: ${previousVersion} → ${latest.version}`);
    this.restartPromptShown = true;

    const win = getMainWindow();
    if (!win || win.isDestroyed()) {
      this.restartPromptShown = false; // try again next tick
      return;
    }

    try {
      const whatsNewSection = latest.whatsNew
        ? `\nBu sürümdeki yenilikler:\n${latest.whatsNew}\n`
        : '';
      await dialog.showMessageBox(win, {
        type: 'info',
        title: 'Güncelleme Mevcut',
        message: 'Yeni bir güncelleme yüklendi',
        detail:
          `Devam edebilmek için uygulamanın yeniden başlatılması gerekiyor.\n\n` +
          `Mevcut sürüm: v${previousVersion}\nYeni sürüm: v${latest.version}` +
          whatsNewSection,
        buttons: ['Yeniden Başlat'],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
      });
      app.relaunch();
      app.exit(0);
    } catch (err: any) {
      console.warn(`[CodeLoader] Restart dialog failed: ${err?.message ?? err}`);
      this.restartPromptShown = false;
    }
  }

  private fetchPlainVersion(timeoutMs = 5000): Promise<VersionInfo> {
    return new Promise((resolve, reject) => {
      const u = new URL(`${DESKTOP_CODE_BASE_URL}/version`);
      const client = u.protocol === 'https:' ? https : http;
      const req = client.request(
        {
          method: 'GET',
          protocol: u.protocol,
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
              const out: VersionInfo = { version: data.version };
              if (typeof data.whatsNew === 'string' && data.whatsNew.trim()) {
                out.whatsNew = data.whatsNew;
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
        reject(new Error('Timeout'));
      });
      req.end();
    });
  }

  private sanitizePath(relPath: string): string {
    return relPath.replace(/\.\./g, '').replace(/^\/+/, '');
  }

  private substituteParams(source: string, params: Record<string, unknown>): string {
    if (!params || Object.keys(params).length === 0) return source;
    return source.replace(/__([A-Z0-9_]+)__/g, (match, key: string) => {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        return JSON.stringify(params[key]);
      }
      return match;
    });
  }

  private async fetchManifest(): Promise<CodeManifest> {
    const body = signRequestBody('__manifest__');
    const encrypted = await postSignedBinary(`${DESKTOP_CODE_BASE_URL}/manifest`, body);
    const plaintext = decryptPayload(encrypted).toString('utf-8');
    try {
      return JSON.parse(plaintext) as CodeManifest;
    } catch {
      throw new Error('Invalid manifest JSON');
    }
  }

  private async fetchFile(relPath: string): Promise<Buffer> {
    const body = signRequestBody(relPath);
    const encrypted = await postSignedBinary(`${DESKTOP_CODE_BASE_URL}/file`, body);
    return decryptPayload(encrypted);
  }

  // ── What's-new state files ────────────────────────────────
  // Stored under userData. Single-line text files; missing == default.

  private lastSeenPath(): string {
    return path.join(app.getPath('userData'), 'last-seen-code-version.txt');
  }

  private disabledPath(): string {
    return path.join(app.getPath('userData'), 'code-whats-new-disabled.txt');
  }

  private readLastSeenCodeVersion(): string {
    try {
      return fs.readFileSync(this.lastSeenPath(), 'utf-8').trim();
    } catch {
      return '';
    }
  }

  private writeLastSeenCodeVersion(version: string): void {
    try {
      fs.writeFileSync(this.lastSeenPath(), version, 'utf-8');
    } catch {
      // non-critical
    }
  }

  private isCodeWhatsNewDisabled(): boolean {
    return fs.existsSync(this.disabledPath());
  }

  private setCodeWhatsNewDisabled(): void {
    try {
      fs.writeFileSync(this.disabledPath(), '1', 'utf-8');
    } catch {
      // non-critical
    }
  }
}

let _instance: RemoteCodeLoader | null = null;

/**
 * Returns the singleton RemoteCodeLoader instance.
 * Must be called after Electron's app.whenReady().
 */
export function getCodeLoader(): RemoteCodeLoader {
  if (!_instance) _instance = new RemoteCodeLoader();
  return _instance;
}
