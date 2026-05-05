/**
 * RemoteCodeLoader
 * ────────────────
 * Downloads and caches scripts (and optionally renderer files) from the
 * desktop-service backend so they can be updated without rebuilding the exe.
 *
 * SECURITY
 *   All traffic uses the encrypted desktop channel:
 *     - POST /desktop-code/manifest  → encrypted JSON {files:{path:sha256}}
 *     - POST /desktop-code/file      → encrypted file bytes
 *   Requests are HMAC-signed and server-validated. See
 *   `desktop-crypto-client.ts` for the wire format.
 *
 * SERVER LAYOUT  (backend/storage/desktop-code/)
 *   scripts/<name>.js
 *   renderer/<file>            (optional, future)
 *
 * UPDATING SCRIPTS (no exe rebuild required):
 *   scp -r desktop\remote-code\scripts ^
 *       mtsk@ekullanici_yeni:/home/mtsk/mtsk.app/backend/storage/desktop-code/
 *   The backend rescans the folder on each manifest request — no restart needed.
 *
 * LOCAL CACHE: %AppData%/mebbis-desktop/code-cache/
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { BrowserWindow } from 'electron';
import { IS_DEV, DESKTOP_CODE_BASE_URL, FORCE_REMOTE_CODE_IN_DEV } from './config';
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

class RemoteCodeLoader {
  private cacheDir: string;
  private manifestPath: string;
  private _codeVersion: string | null = null;

  constructor() {
    this.cacheDir = path.join(app.getPath('userData'), 'code-cache');
    this.manifestPath = path.join(this.cacheDir, 'manifest.json');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────

  /**
   * Pulls the encrypted manifest, downloads any files whose hash differs from
   * the local cache, and persists them. Never throws — silently falls back to
   * cached files if the server is unreachable.
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
        const safePath = relPath.replace(/\.\./g, '').replace(/^\/+/, '');
        wantedPaths.add(safePath);
        const localPath = path.join(this.cacheDir, safePath.replace(/\//g, path.sep));

        if (fs.existsSync(localPath)) {
          const localHash = this.hashFileContent(localPath);
          if (localHash === expectedHash) continue;
        }

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

        const dir = path.dirname(localPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(localPath, content);
        updatedCount++;
        console.log(`[CodeLoader] Updated: ${safePath}`);
      }

      // Prune cached files that are no longer in the manifest (server-side delete propagates).
      this.pruneCache(wantedPaths);

      fs.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

      // Store the version for IPC exposure
      if (manifest.version) {
        this._codeVersion = manifest.version;
      }

      console.log(
        updatedCount > 0
          ? `[CodeLoader] Sync complete — ${updatedCount} file(s) updated. version=${manifest.version ?? 'n/a'}`
          : `[CodeLoader] Already up to date. version=${manifest.version ?? 'n/a'}`,
      );
    } catch (err: any) {
      console.warn(`[CodeLoader] Sync failed: ${err.message}. Using cached files.`);
    }
  }

  /**
   * Returns the remote code version string (e.g. "1.2.4.001"), or null if not yet synced.
   */
  getVersion(): string | null {
    return this._codeVersion;
  }

  /**
   * Returns the contents of a cached script as a string, or null if not cached.
   */
  getScript(relativePath: string): string | null {
    const safePath = relativePath.replace(/\.\./g, '').replace(/^\/+/, '');
    const localPath = path.join(this.cacheDir, safePath.replace(/\//g, path.sep));
    if (!fs.existsSync(localPath)) return null;
    try {
      return fs.readFileSync(localPath, 'utf-8');
    } catch {
      return null;
    }
  }

  /**
   * Returns the absolute path to a cached renderer file, or null if not cached.
   */
  getRendererPath(filename = 'renderer/index.html'): string | null {
    const safePath = filename.replace(/\.\./g, '').replace(/^\/+/, '');
    const localPath = path.join(this.cacheDir, safePath.replace(/\//g, path.sep));
    return fs.existsSync(localPath) ? localPath : null;
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

  // ─────────────────────────────────────────────────────────────
  // PRIVATE
  // ─────────────────────────────────────────────────────────────

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

  private hashFileContent(filePath: string): string {
    try {
      return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
    } catch {
      return '';
    }
  }

  private pruneCache(wantedPaths: Set<string>) {
    const walk = (absDir: string, relDir: string) => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(absDir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const ent of entries) {
        const abs = path.join(absDir, ent.name);
        const rel = relDir ? `${relDir}/${ent.name}` : ent.name;
        if (ent.isDirectory()) {
          walk(abs, rel);
        } else if (ent.isFile()) {
          if (rel === 'manifest.json') continue;
          if (!wantedPaths.has(rel)) {
            try {
              fs.unlinkSync(abs);
              console.log(`[CodeLoader] Pruned stale cache: ${rel}`);
            } catch {
              // ignore
            }
          }
        }
      }
    };
    walk(this.cacheDir, '');
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
