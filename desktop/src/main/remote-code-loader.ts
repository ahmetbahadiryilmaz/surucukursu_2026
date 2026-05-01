/**
 * RemoteCodeLoader
 *
 * Downloads and caches code files (scripts, renderer) from the static server
 * so they can be updated without rebuilding or reinstalling the exe.
 *
 * HOW IT WORKS
 * ─────────────
 * 1.  On app startup, call `sync()` — it fetches a `manifest.json` from the server.
 * 2.  The manifest lists every file path and its SHA-256 hash.
 * 3.  For each file where the local hash differs (or the file is missing), it downloads
 *     the new version, verifies its hash, and writes it to the local cache.
 * 4.  Call `getScript(filename)` to read a cached JS file as a string.
 * 5.  If the file is not in cache (e.g. first launch with no network), returns null.
 *
 * SERVER STRUCTURE  (https://mtsk.app/desktop-code/)
 * ──────────────────────────────────────────────────────────
 *   manifest.json          ← version + per-file SHA-256 hashes
 *   scripts/
 *     left-menu.js         ← MEBBIS page left-menu injection
 *     (add more scripts here as needed)
 *
 * UPDATING A SCRIPT
 * ─────────────────
 * 1. Edit the script file locally (e.g. scripts/left-menu.js).
 * 2. Compute its SHA-256:  node -e "const c=require('crypto'),f=require('fs');
 *    console.log(c.createHash('sha256').update(f.readFileSync('scripts/left-menu.js')).digest('hex'))"
 * 3. Update manifest.json with the new hash and bump the version string.
 * 4. SCP both files to the server:
 *    scp scripts/left-menu.js manifest.json \
 *        mtsk@ekullanici_yeni:/home/mtsk/mtsk.app/desktop-code/scripts/
 *    scp manifest.json mtsk@ekullanici_yeni:/home/mtsk/mtsk.app/desktop-code/
 * 5. All desktop apps fetch the update on next startup. No reinstall needed.
 *
 * LOCAL CACHE LOCATION  (%AppData%/mebbis-desktop/code-cache/)
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import https from 'https';
import type { BrowserWindow } from 'electron';
import { IS_DEV, API_BASE_URL } from './config';

const CODE_SERVER_BASE = `${API_BASE_URL}/desktop-code`;
const MANIFEST_URL = `${CODE_SERVER_BASE}/manifest.json`;
const FETCH_TIMEOUT_MS = 15_000;

interface CodeManifest {
  /** Human-readable version, e.g. "r1.0.0".  Bump whenever files change. */
  version: string;
  /** ISO timestamp, informational only */
  updatedAt?: string;
  /** Map of relative path → hex SHA-256 hash */
  files: Record<string, string>;
}

class RemoteCodeLoader {
  private cacheDir: string;
  private manifestPath: string;
  private cachedManifestVersion: string | null = null;

  constructor() {
    this.cacheDir = path.join(app.getPath('userData'), 'code-cache');
    this.manifestPath = path.join(this.cacheDir, 'manifest.json');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
    // Preload local manifest version for fast reads
    const local = this.readLocalManifest();
    this.cachedManifestVersion = local?.version ?? null;
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────

  /**
   * Fetches the server manifest and downloads any files whose hash has changed.
   * Safe to call on every startup; skips already-current files.
   * Never throws — silently falls back to cached files if the server is unreachable.
   */
  async sync(): Promise<void> {
    if (IS_DEV) {
      console.log('[CodeLoader] Dev mode — skipping remote code sync.');
      return;
    }
    try {
      console.log('[CodeLoader] Checking for code updates...');
      const manifest = await this.fetchJson<CodeManifest>(MANIFEST_URL);

      if (!manifest.files || typeof manifest.files !== 'object') {
        throw new Error('Manifest missing "files" map');
      }

      let updatedCount = 0;

      for (const [relPath, expectedHash] of Object.entries(manifest.files)) {
        // Security: prevent path traversal
        const safePath = relPath.replace(/\.\./g, '').replace(/^\/+/, '');
        const localPath = path.join(this.cacheDir, safePath.replace(/\//g, path.sep));

        // Skip if local hash already matches
        if (fs.existsSync(localPath)) {
          const localHash = this.hashFileContent(localPath);
          if (localHash === expectedHash) continue;
        }

        // Download file
        const fileUrl = `${CODE_SERVER_BASE}/${safePath}`;
        let content: string;
        try {
          content = await this.fetchText(fileUrl);
        } catch (dlErr: any) {
          console.warn(`[CodeLoader] Failed to download ${safePath}: ${dlErr.message}`);
          continue;
        }

        // Verify hash before writing
        const actualHash = crypto.createHash('sha256').update(content).digest('hex');
        if (actualHash !== expectedHash) {
          console.warn(`[CodeLoader] Hash mismatch for ${safePath} — skipping (expected ${expectedHash}, got ${actualHash})`);
          continue;
        }

        // Write to cache
        const dir = path.dirname(localPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(localPath, content, 'utf-8');
        updatedCount++;
        console.log(`[CodeLoader] Updated: ${safePath}`);
      }

      // Persist manifest (marks this version as locally known)
      fs.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
      this.cachedManifestVersion = manifest.version;

      if (updatedCount > 0) {
        console.log(`[CodeLoader] Sync complete — ${updatedCount} file(s) updated. Code version: ${manifest.version}`);
      } else {
        console.log(`[CodeLoader] Already up to date. Code version: ${manifest.version}`);
      }
    } catch (err: any) {
      console.warn(`[CodeLoader] Sync failed: ${err.message}. Using cached files.`);
    }
  }

  /**
   * Returns the contents of a cached script as a string, or null if not cached.
   *
   * @param relativePath  e.g. "scripts/left-menu.js"
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
   * Returns the absolute path to a cached renderer file (e.g. "renderer/index.html"),
   * or null if not cached. Main window loads from this path when available.
   */
  getRendererPath(filename = 'renderer/index.html'): string | null {
    const safePath = filename.replace(/\.\./g, '').replace(/^\/+/, '');
    const localPath = path.join(this.cacheDir, safePath.replace(/\//g, path.sep));
    return fs.existsSync(localPath) ? localPath : null;
  }

  /**
   * UNIFIED INJECTION HELPER (use this for every remotely-updateable script).
   *
   * Picks the remote (cached) script if available, otherwise uses the supplied
   * hardcoded fallback. Substitutes any `__KEY__` placeholders with
   * `JSON.stringify(params[key])` so values can be safely embedded.
   *
   * Example:
   *   await loader.runScriptOrFallback(win, 'scripts/auto-fill-login.js', FALLBACK_JS, {
   *     USERNAME: account.username,
   *     PASSWORD: account.password,
   *   });
   *
   *   // Inside auto-fill-login.js:
   *   //   usernameField.value = __USERNAME__;
   *   //   passwordField.value = __PASSWORD__;
   *
   * @param win          Target BrowserWindow (skipped if destroyed).
   * @param scriptName   Relative path inside the bundle (e.g. "scripts/foo.js").
   * @param fallbackJs   Hardcoded JS executed when the remote file is not cached.
   * @param params       Map of placeholder name -> value. Each value is JSON.stringify'd.
   * @returns            The result of executeJavaScript, or undefined on error.
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
   * Replaces every occurrence of `__KEY__` with `JSON.stringify(params[KEY])`.
   * Keys not present in params are left untouched.
   */
  private substituteParams(source: string, params: Record<string, unknown>): string {
    if (!params || Object.keys(params).length === 0) return source;
    return source.replace(/__([A-Z0-9_]+)__/g, (match, key: string) => {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        return JSON.stringify(params[key]);
      }
      return match;
    });
  }

  // ─────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────

  private readLocalManifest(): CodeManifest | null {
    try {
      return JSON.parse(fs.readFileSync(this.manifestPath, 'utf-8'));
    } catch {
      return null;
    }
  }

  private hashFileContent(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch {
      return '';
    }
  }

  private fetchRaw(url: string, redirectsLeft = 5): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = https.get(url, { timeout: FETCH_TIMEOUT_MS }, (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          if (redirectsLeft <= 0) {
            reject(new Error(`Too many redirects for ${url}`));
            return;
          }
          res.resume(); // discard body
          resolve(this.fetchRaw(res.headers.location, redirectsLeft - 1));
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        let data = '';
        res.on('data', (chunk: string) => { data += chunk; });
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
  }

  private fetchJson<T>(url: string): Promise<T> {
    return this.fetchRaw(url).then((data) => {
      try { return JSON.parse(data) as T; }
      catch { throw new Error(`Invalid JSON from ${url}`); }
    });
  }

  private fetchText(url: string): Promise<string> {
    return this.fetchRaw(url);
  }
}

// Module-level singleton — created lazily after app.whenReady()
let _instance: RemoteCodeLoader | null = null;

/**
 * Returns the singleton RemoteCodeLoader instance.
 * Must be called after Electron's app.whenReady() (so app.getPath() works).
 */
export function getCodeLoader(): RemoteCodeLoader {
  if (!_instance) _instance = new RemoteCodeLoader();
  return _instance;
}
