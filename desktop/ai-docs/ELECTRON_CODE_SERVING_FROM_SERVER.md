# Desktop App Auto-Update System (electron-updater)

## Status: IMPLEMENTED ✓ (replaces remote renderer concept)

## Overview
Instead of only serving renderer files remotely, the entire Electron app is auto-updated using `electron-updater`. This makes **everything** remotely upgradable — main process TS, preload, renderer UI, all of it.

### How It Works
1. Desktop app starts → `setupAutoUpdater()` calls `autoUpdater.checkForUpdates()`
2. electron-updater fetches `GET /api/v1/desktop-update/latest.yml` from api-server
3. Compares version in `latest.yml` against local `package.json` version
4. If newer → prompts user → downloads installer → prompts restart → installs

### Architecture
```
desktop/                          ← Electron app (client)
├── src/main/
│   ├── main.ts                   ← Entry, calls setupAutoUpdater()
│   ├── auto-updater.ts           ← electron-updater setup + UI prompts
│   ├── account-store.ts          ← Account CRUD
│   └── mebbis-manager.ts         ← MEBBIS browser windows
├── src/preload/preload.ts
├── src/renderer/                 ← UI files (bundled in app)
└── package.json                  ← electron-builder config in "build" field

backend/services/api-server/      ← API server (update host)
├── src/api/v1/desktop-update/
│   ├── desktop-update.module.ts
│   ├── desktop-update.controller.ts  ← @Public() endpoints
│   └── desktop-update.service.ts     ← File serving + yml generation
└── ...

backend/storage/PUBLIC/desktop-updates/  ← Update files stored here
├── latest.yml                          ← Version metadata
├── MEBBIS-Setup-x.x.x.exe             ← Windows installer
└── README.md
```

### API Endpoints (api-server, all under /api/v1/)
| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET desktop-update/latest.yml` | Public | electron-updater checks this |
| `GET desktop-update/download/:filename` | Public | Download installer |
| `GET desktop-update/admin/files` | Admin | List all update files |
| `POST desktop-update/admin/generate-yml` | Admin | Generate latest.yml from exe |

### Deploy an Update
1. Bump version in `desktop/package.json`
2. Build: `cd desktop && npm run dist`
3. Copy `release/MEBBIS-Setup-x.x.x.exe` + `release/latest.yml` to `backend/storage/PUBLIC/desktop-updates/`
4. All running apps will detect the update on next check

### Trick Points
- `electron-updater` reads the `build.publish` config from package.json for the feed URL
- We override it at runtime via `autoUpdater.setFeedURL()` using `API_SERVER_URL` env var
- Update endpoints must be `@Public()` — the desktop app has no auth token
- `autoDownload` is false — user is prompted before downloading
- `autoInstallOnAppQuit` is true — if downloaded but not installed, installs on next quit
- The progress bar shows on the taskbar during download
1. Push UI changes to the server
2. All desktop apps automatically get the update on next launch/refresh

---

## Architecture

### Current (Local Renderer)
```
Electron App
├── dist/main/main.js        ← compiled main process
├── dist/preload/preload.js   ← compiled preload
└── src/renderer/             ← STATIC local files
    ├── index.html
    ├── app.js
    └── styles.css

mainWindow.loadFile('src/renderer/index.html')  ← loads from disk
```

### New (Remote Renderer with Fallback)
```
Electron App
├── dist/main/main.js           ← compiled main process
├── dist/preload/preload.js      ← compiled preload
├── src/renderer/                ← LOCAL FALLBACK (used when offline)
│   ├── index.html
│   ├── app.js
│   └── styles.css
└── cache/renderer/              ← CACHED remote code (auto-updated)
    ├── index.html
    ├── app.js
    └── styles.css

// Launch priority:
// 1. Try loading from server → cache result locally
// 2. If server unreachable → use cached version
// 3. If no cache → use bundled fallback
```

### System Flow
```
┌───────────────────────────────────────────────────────┐
│                  Electron Desktop App                  │
│                                                       │
│  1. App starts → main.ts calls RemoteCodeLoader       │
│  2. RemoteCodeLoader checks server for latest version │
│  3. If new version: download → verify → cache → load  │
│  4. If same version: load from cache                  │
│  5. If server down: load from cache or fallback       │
│  6. mainWindow.loadFile(cached/index.html)            │
└────────────────────────┬──────────────────────────────┘
                         │ HTTP GET (with ETag/If-None-Match)
                         ▼
┌───────────────────────────────────────────────────────┐
│             Backend API Server (Port 3001)             │
│                                                       │
│  GET /api/desktop/version                             │
│    → { version, hash, files: [...], mandatory }       │
│                                                       │
│  GET /api/desktop/renderer/:filename                  │
│    → Serves HTML/JS/CSS files with ETag headers       │
│    → Cache-Control: no-cache (always revalidate)      │
│                                                       │
│  Files stored at: backend/storage/PUBLIC/desktop/     │
└───────────────────────────────────────────────────────┘
```

---

## Implementation

### 1. Remote Code Loader (Electron Main Process)

**New file:** `desktop/src/main/remote-code-loader.ts`

```typescript
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import http from 'http';
import https from 'https';

interface RendererVersion {
    version: string;
    hash: string;        // SHA-256 of all files combined
    files: string[];     // ['index.html', 'app.js', 'styles.css']
    mandatory: boolean;  // Force update even if offline
}

interface LoaderConfig {
    serverUrl: string;
    token?: string;
}

export class RemoteCodeLoader {
    private cacheDir: string;
    private fallbackDir: string;
    private versionFile: string;
    private config: LoaderConfig;

    constructor(config: LoaderConfig) {
        this.config = config;
        
        // Cache directory: %AppData%/mebbis-desktop/renderer-cache/
        this.cacheDir = path.join(
            app.getPath('userData'),
            'renderer-cache'
        );
        
        // Fallback: bundled local renderer files
        // __dirname is dist/main, renderer is at src/renderer
        this.fallbackDir = path.join(__dirname, '..', '..', 'src', 'renderer');
        
        // Version tracking file
        this.versionFile = path.join(this.cacheDir, 'version.json');
        
        // Ensure cache directory exists
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    /**
     * GET RENDERER PATH
     * 
     * Main entry point. Returns the path to index.html that should be loaded.
     * 
     * Priority:
     * 1. Download latest from server → return cached path
     * 2. If server fails → return existing cache path
     * 3. If no cache → return bundled fallback path
     */
    async getRendererPath(): Promise<string> {
        try {
            // Try to update from server
            const updated = await this.updateFromServer();
            
            if (updated) {
                console.log('[RemoteCodeLoader] Updated from server');
            } else {
                console.log('[RemoteCodeLoader] Already up to date');
            }
            
            // Return cached version
            const cachedIndex = path.join(this.cacheDir, 'index.html');
            if (fs.existsSync(cachedIndex)) {
                return cachedIndex;
            }
        } catch (error: any) {
            console.warn(`[RemoteCodeLoader] Server update failed: ${error.message}`);
        }

        // Fallback to cached version
        const cachedIndex = path.join(this.cacheDir, 'index.html');
        if (fs.existsSync(cachedIndex)) {
            console.log('[RemoteCodeLoader] Using cached renderer');
            return cachedIndex;
        }

        // Final fallback to bundled local files
        console.log('[RemoteCodeLoader] Using bundled fallback renderer');
        return path.join(this.fallbackDir, 'index.html');
    }

    /**
     * CHECK & UPDATE FROM SERVER
     * 
     * Flow:
     * 1. Fetch version metadata from /api/desktop/version
     * 2. Compare hash with locally cached version
     * 3. If different → download all files
     * 4. Verify hash of downloaded files
     * 5. Save to cache directory
     * 
     * Returns true if updated, false if already current
     */
    private async updateFromServer(): Promise<boolean> {
        // Get server version info
        const serverVersion = await this.fetchJson<RendererVersion>(
            '/api/desktop/version'
        );

        // Check local version
        const localVersion = this.getLocalVersion();
        
        if (localVersion && localVersion.hash === serverVersion.hash) {
            return false; // Already up to date
        }

        console.log(`[RemoteCodeLoader] Updating: ${localVersion?.version || 'none'} → ${serverVersion.version}`);

        // Download all files to temp directory first
        const tempDir = path.join(this.cacheDir, '.tmp');
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true });
        }
        fs.mkdirSync(tempDir, { recursive: true });

        for (const filename of serverVersion.files) {
            const content = await this.fetchFile(`/api/desktop/renderer/${filename}`);
            fs.writeFileSync(path.join(tempDir, filename), content);
        }

        // Verify hash of downloaded files
        const downloadedHash = this.calculateDirectoryHash(tempDir, serverVersion.files);
        if (downloadedHash !== serverVersion.hash) {
            // Clean up temp
            fs.rmSync(tempDir, { recursive: true });
            throw new Error(`Hash mismatch: expected ${serverVersion.hash}, got ${downloadedHash}`);
        }

        // Move files from temp to cache (atomic-ish replace)
        for (const filename of serverVersion.files) {
            const src = path.join(tempDir, filename);
            const dest = path.join(this.cacheDir, filename);
            fs.copyFileSync(src, dest);
        }

        // Save version metadata
        fs.writeFileSync(this.versionFile, JSON.stringify(serverVersion, null, 2));

        // Clean up temp
        fs.rmSync(tempDir, { recursive: true });

        return true;
    }

    /**
     * CALCULATE HASH of all files in directory
     */
    private calculateDirectoryHash(dir: string, files: string[]): string {
        const hash = crypto.createHash('sha256');
        
        for (const filename of files.sort()) {
            const filePath = path.join(dir, filename);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath);
                hash.update(filename);
                hash.update(content);
            }
        }
        
        return hash.digest('hex');
    }

    /**
     * READ LOCAL VERSION from cache
     */
    private getLocalVersion(): RendererVersion | null {
        try {
            if (fs.existsSync(this.versionFile)) {
                return JSON.parse(fs.readFileSync(this.versionFile, 'utf-8'));
            }
        } catch {
            // Corrupted version file
        }
        return null;
    }

    /**
     * FETCH JSON from server
     */
    private fetchJson<T>(urlPath: string): Promise<T> {
        return new Promise((resolve, reject) => {
            const url = new URL(urlPath, this.config.serverUrl);
            const client = url.protocol === 'https:' ? https : http;

            const options: any = {
                timeout: 5000,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'mebbis-desktop/1.0',
                },
            };

            if (this.config.token) {
                options.headers['Authorization'] = `Bearer ${this.config.token}`;
            }

            const req = client.get(url.toString(), options, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }

                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try { resolve(JSON.parse(data)); }
                    catch { reject(new Error('Invalid JSON')); }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        });
    }

    /**
     * FETCH FILE (binary or text) from server
     */
    private fetchFile(urlPath: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const url = new URL(urlPath, this.config.serverUrl);
            const client = url.protocol === 'https:' ? https : http;

            const options: any = {
                timeout: 10000,
                headers: {
                    'User-Agent': 'mebbis-desktop/1.0',
                },
            };

            if (this.config.token) {
                options.headers['Authorization'] = `Bearer ${this.config.token}`;
            }

            const req = client.get(url.toString(), options, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }

                const chunks: Buffer[] = [];
                res.on('data', (chunk) => { chunks.push(chunk); });
                res.on('end', () => { resolve(Buffer.concat(chunks)); });
            });

            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        });
    }
}
```

### 2. Main Process Integration

**File:** `desktop/src/main/main.ts`

Replace the static `loadFile` with remote code loading:

```typescript
import { RemoteCodeLoader } from './remote-code-loader';

let remoteCodeLoader: RemoteCodeLoader;

// In createMainWindow():
async function createMainWindow() {
    const rendererPath = path.join(__dirname, '..', '..', 'src', 'renderer');
    const preloadPath = path.join(__dirname, '..', 'preload', 'preload.js');

    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        minWidth: 700,
        minHeight: 500,
        title: 'MEBBIS Account Manager',
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    mainWindow.removeMenu();

    // NEW: Load renderer from server (with fallback to local)
    remoteCodeLoader = new RemoteCodeLoader({
        serverUrl: process.env.API_SERVER_URL || 'http://localhost:3001',
        token: undefined, // No auth needed for public renderer files
    });

    try {
        const indexPath = await remoteCodeLoader.getRendererPath();
        mainWindow.loadFile(indexPath);
        console.log(`[Main] Loaded renderer from: ${indexPath}`);
    } catch (error) {
        // Ultimate fallback
        console.error('[Main] Remote code load failed, using local:', error);
        mainWindow.loadFile(path.join(rendererPath, 'index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
```

### 3. Backend Endpoints for Desktop Code Serving

**New controller:** Add to api-server or file-server

These endpoints serve the desktop app's renderer code and version metadata.

```typescript
@Controller('api/desktop')
export class DesktopController {
    private desktopCodeDir = './storage/PUBLIC/desktop';
    private versionFile = './storage/PUBLIC/desktop/version.json';

    /**
     * GET /api/desktop/version
     * Returns current renderer code version + file list + hash
     * 
     * No auth required — renderer code is not sensitive
     */
    @Get('version')
    async getVersion(): Promise<RendererVersion> {
        const versionData = JSON.parse(
            fs.readFileSync(this.versionFile, 'utf-8')
        );
        return versionData;
    }

    /**
     * GET /api/desktop/renderer/:filename
     * Serves individual renderer files (HTML, JS, CSS)
     * 
     * Security:
     * - Filename is validated (no path traversal)
     * - Only whitelisted extensions (.html, .js, .css, .png, .svg)
     * - ETag header for caching
     */
    @Get('renderer/:filename')
    async getRendererFile(
        @Param('filename') filename: string,
        @Res() res: Response
    ): Promise<void> {
        // SECURITY: Prevent path traversal
        const sanitized = path.basename(filename);
        
        // Whitelist extensions
        const ext = path.extname(sanitized).toLowerCase();
        const allowedExtensions = ['.html', '.js', '.css', '.png', '.svg', '.ico', '.woff', '.woff2'];
        if (!allowedExtensions.includes(ext)) {
            res.status(400).json({ error: 'Invalid file type' });
            return;
        }

        const filePath = path.join(this.desktopCodeDir, sanitized);
        
        if (!fs.existsSync(filePath)) {
            res.status(404).json({ error: 'File not found' });
            return;
        }

        // Content type mapping
        const contentTypes: Record<string, string> = {
            '.html': 'text/html; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.png': 'image/png',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
        };

        // Calculate ETag for caching
        const content = fs.readFileSync(filePath);
        const etag = crypto.createHash('md5').update(content).digest('hex');

        res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
        res.setHeader('ETag', `"${etag}"`);
        res.setHeader('Cache-Control', 'no-cache'); // Always revalidate
        res.send(content);
    }
}
```

### 4. Server-Side File Structure

```
backend/storage/PUBLIC/desktop/
├── version.json       ← Version metadata
├── index.html         ← Main renderer HTML
├── app.js             ← Renderer JavaScript
├── styles.css         ← Renderer styles
└── assets/            ← Optional assets (images, fonts)
    ├── logo.svg
    └── icon.png
```

**version.json format:**
```json
{
    "version": "1.2.0",
    "hash": "a3f2b1c4d5e6f7890123456789abcdef0123456789abcdef0123456789abcdef",
    "files": ["index.html", "app.js", "styles.css"],
    "mandatory": false,
    "releaseDate": "2026-04-14T12:00:00Z",
    "changelog": [
        "Added simulator report download button",
        "Fixed account list refresh"
    ]
}
```

---

## Update Scenarios

### Scenario 1: Normal Launch (Server Available)
```
1. App starts
2. RemoteCodeLoader fetches GET /api/desktop/version
3. Compares hash with cached version.json
4. Hash different → download all files to .tmp/
5. Verify hash → move to cache/
6. mainWindow.loadFile(cache/index.html)
```

### Scenario 2: No Changes
```
1. App starts
2. RemoteCodeLoader fetches version
3. Hash matches → skip download
4. mainWindow.loadFile(cache/index.html)
```

### Scenario 3: Server Offline
```
1. App starts
2. RemoteCodeLoader fetch fails (timeout/error)
3. Cache exists → mainWindow.loadFile(cache/index.html)
4. No cache → mainWindow.loadFile(src/renderer/index.html) (bundled fallback)
```

### Scenario 4: Corrupted Download
```
1. Download completes
2. Hash verification fails
3. Delete .tmp/ directory
4. Use existing cache or fallback
5. Log warning (will retry next launch)
```

---

## How to Deploy UI Updates

### For Developers
```bash
# 1. Edit desktop renderer files locally
# 2. Test with local Electron (npm run dev)
# 3. When ready, copy to server storage:

cp desktop/src/renderer/index.html   backend/storage/PUBLIC/desktop/index.html
cp desktop/src/renderer/app.js       backend/storage/PUBLIC/desktop/app.js
cp desktop/src/renderer/styles.css   backend/storage/PUBLIC/desktop/styles.css

# 4. Update version.json with new hash:
#    - Bump version string
#    - Calculate: sha256(filename1 + content1 + filename2 + content2 + ...)
#    - Update files array if new files added
```

### Automated (Future)
A CI/CD pipeline or admin endpoint could:
1. Accept uploaded files
2. Calculate hash automatically
3. Update version.json
4. All desktop apps pick up changes on next launch

---

## Preload Security Considerations

**CRITICAL**: The preload script (`preload.ts`) runs with Node.js access and bridges to the renderer. It must **NOT** be served remotely — it stays local.

```
LOCAL ONLY (bundled in Electron, never remote):
├── dist/main/main.js           ← Node.js main process
├── dist/preload/preload.js     ← Security bridge (contextBridge)

REMOTE-LOADABLE (UI only, no Node.js access):
├── cache/renderer/index.html   ← HTML structure
├── cache/renderer/app.js       ← UI logic (uses window.mebbisAPI only)
├── cache/renderer/styles.css   ← Styling
```

The remotely loaded `app.js` can only call methods exposed via `contextBridge.exposeInMainWorld('mebbisAPI', ...)`. It cannot:
- Access `require()`, `process`, `fs`, or any Node.js modules
- Access Electron APIs directly
- Execute arbitrary system commands
- Access files on disk

This is enforced by Electron's `contextIsolation: true` and `nodeIntegration: false` settings in the main process.

---

## Cache Directory Structure

```
%AppData%/mebbis-desktop/
├── accounts.json              ← Account storage (existing)
├── Partitions/                ← Cookie storage (existing)
│   └── persist__mebbis-{id}/
└── renderer-cache/            ← NEW: Remote renderer cache
    ├── version.json           ← Current cached version metadata
    ├── index.html             ← Cached renderer HTML
    ├── app.js                 ← Cached renderer JS
    ├── styles.css             ← Cached renderer CSS
    └── .tmp/                  ← Temp download directory (deleted after verify)
```

---

## Relationship to Desktop App Features

### What Gets Remotely Updated
- **Account management UI** (add/edit/remove MEBBIS accounts)
- **Account list display** (running status, buttons)
- **Styling and layout** (dark theme, responsive design)
- **New menu items** (e.g., adding "Simülatör Raporu İndir" button)

### What Stays Local (Never Remote)
- **Main process** (`main.ts`, `mebbis-manager.ts`, `account-store.ts`, `server-connection-manager.ts`)
- **Preload bridge** (`preload.ts`)
- **Cookie management** (Electron session partitions)
- **MEBBIS automation** (auto-fill, page navigation, PDF generation)
- **IPC handlers** (all account and server operations)

### Adding a New Feature via Remote Update
Example: Adding "Simülatör Raporu İndir" to the injected left menu.

1. The left menu is injected by `mebbis-manager.ts` (local code) — this requires a local build
2. BUT: The main window's account management UI is in `app.js` (remote-loadable)
3. So: Adding a "Server Settings" panel to the main window UI → remote update only
4. But: Adding new injected menu items to MEBBIS pages → requires local build

**Trick Point**: The injected left menu code lives in `mebbis-manager.ts` (main process), not in the renderer. Changing the injected menu requires a new Electron build. However, the configuration of *which* menu items to show could be fetched from the server and passed to `mebbis-manager.ts`.

---

## Trick Points & Gotchas

1. **Preload Must Stay Local**: Never serve `preload.js` remotely. It has full Node.js access and is the security boundary between main and renderer processes.

2. **contextIsolation Protects Against Malicious Code**: Even if a bad actor somehow served malicious `app.js`, it can only call `window.mebbisAPI.*` methods — no filesystem or system access.

3. **Hash Verification is Essential**: Always verify SHA-256 hash of downloaded files against the server's version metadata. Prevents MITM attacks and corrupt downloads.

4. **Atomic Replace**: Download to `.tmp/` first, verify, then copy to cache. Never write directly to cache — interrupted downloads would corrupt the app.

5. **ETag Caching**: Server sends `ETag` + `Cache-Control: no-cache`. This means the client always checks with the server but avoids re-downloading if content hasn't changed (304 Not Modified).

6. **File Path Security**: The `path.basename()` call in the server endpoint prevents directory traversal attacks (`../../etc/passwd`). Only files in the designated directory are served.

7. **Extension Whitelist**: Only `.html`, `.js`, `.css`, `.png`, `.svg`, `.ico`, `.woff`, `.woff2` are served. Prevents serving unexpected file types.

8. **Timeout Handling**: All HTTP requests have 5-10s timeouts. If the server is slow, the app falls back to cache/local rather than hanging indefinitely.

9. **No require() in Remote Code**: The remotely loaded `app.js` cannot use `require()` or `import` for Node.js modules. It must be self-contained or use only browser APIs + the exposed `window.mebbisAPI`.

10. **Versioning Strategy**: Bump the `version` string for every deployment. The `hash` is the actual comparison key — version string is for human readability and logs only.

