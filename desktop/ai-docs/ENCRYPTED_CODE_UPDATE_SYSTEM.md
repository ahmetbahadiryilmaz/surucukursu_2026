# Encrypted Code Update System (v2 — Dual Update + Auto-Scan Bundle)

## Status: PLANNED (not yet implemented)

## Problem Statement

Currently:
- **Renderer code** (index.html, app.js, styles.css) is bundled locally in the Electron app
- **Templates** (direksiyon-takip, simulator) are fetched as **plain HTTP** from `online.mtsk.app/templates/`
- **Scraping scripts** (simulator download, left-menu injection, student list, batch operations) are **hardcoded in mebbis-manager.ts** — any change requires exe rebuild
- **All updates** require a full `.exe` rebuild via `electron-updater`
- Code is visible in the asar archive — anyone can extract and read it
- Templates are publicly accessible URLs — anyone can download them

**Goal:** Serve renderer code, templates, AND scraping scripts from the server, **encrypted**, so that:
1. Code and scripts can be updated without rebuilding the exe
2. Code is protected in transit and at rest (even beyond HTTPS)
3. Templates are no longer publicly accessible
4. Scraping selectors/logic can be updated instantly when MEBBIS changes their HTML
5. Sniffing, replay attacks, and decompilation are mitigated

---

## Dual Update Architecture

The system uses **two independent update channels** running simultaneously:

| Channel | Mechanism | What It Updates | When to Use |
|---------|-----------|----------------|-------------|
| **Shell Update** | `electron-updater` (exe rebuild) | Main process TS, preload, crypto client, Electron framework | Rare — only when core binary logic changes |
| **Content Update** | Encrypted bundle from server | Renderer UI, templates, scraping scripts, selectors, config | Frequent — any UI, template, or scraping change |

**Key insight:** The exe becomes a thin **execution shell**. All business logic (scraping, menu injection, selectors) lives in the encrypted bundle served from the server. `mebbis-manager.ts` becomes a **generic executor** that loads and runs scripts from the bundle.

---

## What Gets Updated vs What Stays Local

### Remotely Updated (Encrypted Bundle from Server)
| Category | Files | Why Remote |
|----------|-------|-----------|
| **Renderer UI** | `renderer/index.html`, `renderer/app.js`, `renderer/styles.css` | UI changes without exe rebuild |
| **Direksiyon templates** | `templates/direksiyon-takip/4n.html`, `6n.html`, `7n.html`, `10n.html`, `12n.html`, `12nsimli.html`, `14n.html`, `14nsimli.html`, `16n.html`, `16nsimli.html`, `20n.html` | Template updates without exe rebuild |
| **Simulator templates** | `templates/simulator/sesim/*.html`, `templates/simulator/anagrup/*.html` | Same |
| **Scraping scripts** | `scripts/left-menu.js`, `scripts/simulator.js`, `scripts/direksiyon.js`, `scripts/batch.js`, `scripts/student-list.js` | MEBBIS selector/logic changes without exe rebuild |
| **Selectors config** | `config/mebbis-selectors.json` | CSS/XPath selectors that MEBBIS may change anytime |

### Stays Local (Compiled into Exe)
| Content | Files | Why Local |
|---------|-------|----------|
| **Main process** | `main.ts`, `auto-updater.ts`, `account-store.ts` | Node.js core, manages windows/IPC/cookies |
| **Generic executor** | `mebbis-manager.ts` (refactored) | Loads + executes scripts from bundle — thin shell |
| **Preload bridge** | `preload.ts` | Security boundary, has Node.js access |
| **Crypto client** | `crypto-client.ts`, `device-id.ts`, `secure-code-loader.ts` | Decryption logic must be in the local binary |
| **electron-updater** | `auto-updater.ts` | Bootstrap + version gate stays local |

---

## Scripts Architecture (New Concept)

### The Problem
Currently `mebbis-manager.ts` contains ~500 lines of hardcoded scraping logic:
- Left menu HTML injection (iframe selectors, menu items, event handlers)
- Simulator report download (navigation flow, button clicks, PDF extraction)
- Direksiyon takip PDF generation (selector chains, data extraction)
- Batch operations (student list parsing, form filling)

When MEBBIS changes their HTML structure (class names, IDs, form layout), we must rebuild the entire exe.

### The Solution
Extract all scraping logic into **standalone JS scripts** that live in the encrypted bundle:

```
bundle/
├── scripts/
│   ├── left-menu.js          ← Menu HTML, injection logic, event handlers
│   ├── simulator.js          ← Simulator report navigation + download flow
│   ├── direksiyon.js         ← Direksiyon takip data extraction
│   ├── batch.js              ← Batch student operations
│   └── student-list.js       ← Student list parsing from MEBBIS pages
├── config/
│   └── mebbis-selectors.json ← All CSS/XPath selectors in one place
├── renderer/
│   ├── index.html
│   ├── app.js
│   └── styles.css
└── templates/
    ├── direksiyon-takip/
    │   ├── 4n.html
    │   └── ...
    └── simulator/
        ├── sesim/
        └── anagrup/
```

### Script Execution Pattern
`mebbis-manager.ts` becomes a **generic script runner**:
```typescript
// OLD — hardcoded in mebbis-manager.ts:
async injectLeftMenu(webContents: WebContents) {
  const menuHtml = `<div class="mtsk-menu">...500 lines of HTML...</div>`;
  await webContents.executeJavaScript(`
    document.querySelector('#someId').innerHTML = '${menuHtml}';
  `);
}

// NEW — loads from encrypted bundle:
async injectLeftMenu(webContents: WebContents) {
  const script = secureLoader.getScript('left-menu.js');
  await webContents.executeJavaScript(script);
}
```

### mebbis-selectors.json (Example)
```json
{
  "leftMenu": {
    "container": "#sol_menu",
    "menuList": ".menu-list",
    "activeItem": ".menu-item.active"
  },
  "simulator": {
    "downloadButton": "#btnSimulatorRapor",
    "reportTable": "table.report-grid",
    "studentRow": "tr.ogrenci-satir"
  },
  "direksiyon": {
    "takipForm": "#direksiyonTakipForm",
    "studentSelect": "#ogrenciSelect",
    "dateInput": "#tarihInput"
  }
}
```

When MEBBIS changes a selector, update `mebbis-selectors.json` in the bundle → upload zip → done. No exe rebuild.

---

## Auto-Scan Zip Bundle System

### The Old Approach (Manual)
Admin manually specifies each file path in a JSON manifest → error-prone, tedious.

### The New Approach (Auto-Scan)
Admin uploads a **zip file** with the standard directory structure. Server automatically:
1. Extracts the zip
2. Recursively scans ALL files
3. Computes **per-file SHA-256 hash**
4. Builds the manifest JSON automatically
5. Gzips the manifest
6. Encrypts with AES-256-GCM using MASTER_ENCRYPTION_KEY
7. Stores as `bundles/v{version}.enc`

### Upload Flow
```
Admin uploads: bundle-v1.3.0.zip
  ↓
Server extracts to temp directory
  ↓
Server walks all files recursively:
  renderer/index.html              → SHA-256: "abc123..."
  renderer/app.js                  → SHA-256: "def456..."
  renderer/styles.css              → SHA-256: "789abc..."
  scripts/left-menu.js             → SHA-256: "111222..."
  scripts/simulator.js             → SHA-256: "333444..."
  config/mebbis-selectors.json     → SHA-256: "555666..."
  templates/direksiyon-takip/4n.html → SHA-256: "777888..."
  ... (every file automatically discovered)
  ↓
Server builds manifest (JSON with all files + base64 content + hashes)
  ↓
JSON.stringify() → gzip() → AES-256-GCM encrypt → v1.3.0.enc
  ↓
Server updates releases.json with version, date, bundle hash, and per-file hashes
```

### Delta Updates (Per-File Hash Comparison)
Because every file has its own SHA-256 hash, the client can request **only changed files**:

```
Client sends: POST /api/v1/desktop-code/bundle
  {
    ...,
    currentHashes: {
      "renderer/index.html": "abc123...",
      "scripts/left-menu.js": "111222...",
      "scripts/simulator.js": "333444...",
      ...
    }
  }

Server compares hashes → only includes files where hash differs:
  - renderer/index.html: same hash → SKIP
  - scripts/left-menu.js: hash changed → INCLUDE
  - scripts/new-feature.js: new file → INCLUDE
  - templates/direksiyon-takip/4n.html: same → SKIP

Response contains only the delta bundle (changed + new files).
Client merges delta into its cached file map.
```

This means: if admin updates only `left-menu.js`, the client downloads ~8KB instead of the entire bundle.

---

## How the Code Gets to the Client (Full Flow)

### Step 1: Admin Uploads Zip
```
Admin → Frontend Dashboard → POST /api/v1/desktop-code/admin/upload
  ├── Uploads: bundle-v1.3.0.zip (contains renderer/, templates/, scripts/, config/)
  ├── Server: extracts zip using adm-zip
  ├── Server: recursively scans ALL files
  ├── Server: computes per-file SHA-256 hashes
  ├── Server: auto-builds manifest JSON with all files + hashes
  ├── Server: gzip → AES-256-GCM encrypt with MASTER_ENCRYPTION_KEY
  ├── Server: stores as bundles/v1.3.0.enc
  └── Server: updates releases.json with version, date, bundle hash, per-file hashes
```

### Step 2: Electron App Starts → Handshake
```
App starts → SecureCodeLoader.initialize()
  │
  ├── 1. Generate deviceId (hardware fingerprint: MAC + CPU + disk serial → SHA-256)
  ├── 2. Generate ephemeral RSA-2048 keypair (in memory, never saved)
  ├── 3. Send handshake request:
  │       POST /api/v1/desktop-code/handshake
  │       {
  │         deviceId: "a3f2b1c4...",
  │         timestamp: 1713520000000,
  │         nonce: "uuid-v4",
  │         publicKey: "-----BEGIN PUBLIC KEY-----...",
  │         signature: HMAC-SHA256(deviceId|timestamp|nonce, SHARED_SECRET)
  │       }
  │
  ├── 4. Server validates:
  │       ✓ |timestamp - serverTime| < 30s (anti-replay)
  │       ✓ nonce not seen before (anti-replay)
  │       ✓ HMAC signature valid (authenticity)
  │
  ├── 5. Server generates random AES-256 session key
  ├── 6. Server RSA-encrypts the session key with client's public key
  └── 7. Server responds:
          {
            sessionId: "uuid",
            encryptedSessionKey: "RSA_ENCRYPT(aesKey, clientPubKey)",
            latestVersion: "1.3.0",
            fileHashes: {               // ← Per-file hashes of latest version
              "renderer/index.html": "abc...",
              "scripts/left-menu.js": "def...",
              ...
            },
            expiresAt: timestamp + 5min
          }
```

### Step 3: Client Checks if Update Needed
```
Client receives handshake response
  │
  ├── Decrypts sessionKey using ephemeral RSA private key
  ├── Compares per-file hashes with locally cached hashes
  │
  ├── IF all hashes match → use cached files (decrypt from device-bound cache)
  │     └── Skip to Step 5
  │
  ├── IF some hashes differ → request delta bundle (only changed files)
  │     └── Proceed to Step 4 with currentHashes
  │
  └── IF no cache exists → request full bundle
        └── Proceed to Step 4 without currentHashes
```

### Step 4: Download Encrypted Bundle (Full or Delta)
```
Client → POST /api/v1/desktop-code/bundle
  {
    sessionId: "uuid",
    deviceId: "a3f2b1c4...",
    timestamp: Date.now(),
    nonce: "new-uuid-v4",
    signature: HMAC-SHA256(sessionId|deviceId|timestamp|nonce, sessionKey),
    currentHashes: { ... }   // ← omit for full download, include for delta
  }

Server validates:
  ✓ sessionId exists and not expired
  ✓ timestamp within 30s
  ✓ nonce unique
  ✓ HMAC valid (signed with session key)

Server builds response:
  - If currentHashes provided: builds delta (only changed/new files)
  - If no currentHashes: uses full bundle

Server responds: (binary payload)
  ┌─────────────────────────────────────────────────┐
  │ 16 bytes: IV (random)                            │
  │ 16 bytes: Auth Tag (GCM)                         │
  │ 32 bytes: Bundle SHA-256 (of plaintext)          │
  │ 8 bytes:  Timestamp (unix ms, big-endian)        │
  │ N bytes:  AES-256-GCM encrypted gzipped bundle   │
  └─────────────────────────────────────────────────┘

  Encrypted with: sessionKey
  Additional Authenticated Data (AAD): deviceId + timestamp
```

### Step 5: Decrypt, Merge, and Load
```
Client receives binary payload
  │
  ├── 1. Extract IV, authTag, expectedHash, timestamp from header
  ├── 2. Verify timestamp is within ±30s
  ├── 3. AES-256-GCM decrypt with sessionKey, IV, authTag, AAD=deviceId+timestamp
  ├── 4. Gunzip the plaintext
  ├── 5. Parse JSON manifest
  ├── 6. Verify SHA-256 of plaintext matches expectedHash
  │
  ├── 7. For delta bundle: merge new files into cached file map
  │      For full bundle: replace entire file map
  │
  ├── 8. Populate in-memory maps:
  │       rendererBuffers: Map<filename, Buffer>  (index.html, app.js, styles.css)
  │       templateMap: Map<path, string>           (all template HTML)
  │       scriptMap: Map<name, string>             (all scraping scripts)
  │       configMap: Map<name, object>             (mebbis-selectors.json, etc)
  │
  ├── 9. Cache to disk (re-encrypted with device-bound key):
  │       %AppData%/mebbis-desktop/code-cache/bundle.enc
  │       %AppData%/mebbis-desktop/code-cache/hashes.json
  │       (encrypted with AES-256-GCM using key derived from deviceId)
  │
  └── 10. Load renderer from memory:
          protocol.registerBufferProtocol('app', handler)
          mainWindow.loadURL('app://renderer/index.html')
```

### Step 6: Script/Template Access at Runtime
```
When mebbis-manager.ts needs a script or template:
  │
  ├── Scripts: secureLoader.getScript('left-menu.js') → JS string
  │     └── webContents.executeJavaScript(script)
  │
  ├── Templates: secureLoader.getTemplate('direksiyon-takip/4n.html') → HTML string
  │     └── Pass to hidden BrowserWindow for PDF generation
  │
  ├── Config: secureLoader.getConfig('mebbis-selectors.json') → parsed object
  │     └── Use selectors in script execution
  │
  └── All reads are from in-memory maps — no disk I/O, no network
```

---

## Bundle Manifest Format (Before Encryption)

```json
{
  "version": "1.3.0",
  "createdAt": "2026-04-19T12:00:00.000Z",
  "files": {
    "renderer/index.html": {
      "content": "<base64-encoded-content>",
      "hash": "sha256hex...",
      "size": 2048
    },
    "renderer/app.js": {
      "content": "<base64-encoded-content>",
      "hash": "sha256hex...",
      "size": 15360
    },
    "scripts/left-menu.js": {
      "content": "<base64-encoded-content>",
      "hash": "sha256hex...",
      "size": 8192
    },
    "scripts/simulator.js": {
      "content": "<base64-encoded-content>",
      "hash": "sha256hex...",
      "size": 4096
    },
    "config/mebbis-selectors.json": {
      "content": "<base64-encoded-content>",
      "hash": "sha256hex...",
      "size": 1024
    },
    "templates/direksiyon-takip/4n.html": {
      "content": "<base64-encoded-content>",
      "hash": "sha256hex...",
      "size": 10240
    }
  }
}
```

**Auto-generated:** Server builds this JSON by recursively scanning files from the extracted zip. No manual manifest writing needed.

Pipeline: `JSON.stringify() → gzip() → AES-256-GCM encrypt → binary payload`

---

## Encryption Layers

### Layer 1: HTTPS (Transport)
Standard TLS. Already exists. Protects against passive network sniffing.

### Layer 2: HMAC + Timestamp + Nonce (Request Authentication)
Prevents:
- **Replay attacks** — timestamp must be within ±30s, nonce is single-use
- **Request forgery** — HMAC proves knowledge of shared secret / session key
- **Sniffing the request** — even if someone captures the HTTPS payload (e.g., corporate proxy), they can't re-issue it

```
signature = HMAC-SHA256(
  deviceId + "|" + timestamp + "|" + nonce + "|" + endpoint,
  key  // SHARED_SECRET for handshake, sessionKey for subsequent requests
)
```

### Layer 3: AES-256-GCM (Code Encryption)
The actual code is encrypted with a **per-session key** negotiated via RSA handshake.
- **GCM mode** provides both encryption AND authentication (integrity)
- **AAD (Additional Authenticated Data)** binds the ciphertext to the deviceId + timestamp
- Even if someone intercepts the encrypted blob, they can't decrypt without the session key
- Session key was RSA-encrypted with an ephemeral keypair that only exists in client memory

### Layer 4: Device-Bound Cache Encryption
Decrypted code is never written as plaintext to disk. The encrypted bundle is re-encrypted for local cache using a key derived from the device hardware ID:
```
cacheKey = PBKDF2(deviceId + appVersion, salt=machineSpecificSalt, iterations=100000)
```
- If someone copies the cache file to another machine → different deviceId → can't decrypt
- If someone reads the cache file on the same machine but outside the app → needs to know the derivation

---

## Anti-Decompilation (Defense in Depth)

Even if an attacker extracts the Electron asar and reads the JS source:

| Protection | Implementation |
|-----------|----------------|
| **JS Obfuscation** | `javascript-obfuscator` on crypto-client.ts, secure-code-loader.ts, device-id.ts at build time |
| **String Encryption** | All literals (URLs, key names, algorithm names) encrypted at build time, decrypted at runtime via obfuscator's `stringEncoding` |
| **Control Flow Flattening** | Obfuscator's `controlFlowFlattening: true` — makes logic hard to follow |
| **Dead Code Injection** | Fake crypto functions that look real but compute garbage |
| **SHARED_SECRET Splitting** | The HMAC shared secret is NOT a single string. It's split into 4-5 fragments across different files, assembled at runtime via a function chain |
| **Debug Detection** | If `process.env.NODE_ENV === 'development'` or debugger is attached, refuse to decrypt (check `inspector.url()`) |
| **ASAR Integrity** | electron-builder signs the asar — if modified, app exits |

**Reality check:** A determined attacker with enough time WILL reverse-engineer the client. These measures raise the cost significantly but don't make it impossible. The server-side protections (timestamp, nonce, session key, device binding) are the real security — the client-side obfuscation is a speed bump.

---

## Backend Implementation

### New NestJS Module: `desktop-code`
**Location:** `backend/services/api-server/src/api/v1/desktop-code/`

```
desktop-code/
├── desktop-code.module.ts           ← Module registration
├── desktop-code.controller.ts       ← Public endpoints: handshake, bundle
├── desktop-code.admin.controller.ts ← Admin endpoints: upload zip, list releases, rollback
├── desktop-code.service.ts          ← Bundle management, zip scanning, version tracking
├── crypto.service.ts                ← AES-256-GCM, RSA, HMAC, nonce validation
├── dto/
│   ├── handshake-request.dto.ts
│   ├── handshake-response.dto.ts
│   ├── bundle-request.dto.ts
│   └── admin-upload.dto.ts
└── interfaces/
    └── session.interface.ts
```

**Register in:** `backend/services/api-server/src/api/v1/v1.module.ts` (add `DesktopCodeModule` to imports)

### Dependencies
- `adm-zip` — extract uploaded zip files (install in api-server)
- Node.js built-in `crypto` — AES-256-GCM, RSA, HMAC, SHA-256
- Node.js built-in `zlib` — gzip compression

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/desktop-code/handshake` | `@Public()` + HMAC | Negotiate session key via RSA |
| `POST` | `/api/v1/desktop-code/bundle` | `@Public()` + Session HMAC | Download encrypted bundle (full or delta) |
| `POST` | `/api/v1/desktop-code/admin/upload` | `@UseGuards(AdminGuard)` | Upload zip → auto-scan → encrypt → store |
| `GET` | `/api/v1/desktop-code/admin/releases` | `@UseGuards(AdminGuard)` | List all releases with per-file hashes |
| `POST` | `/api/v1/desktop-code/admin/rollback` | `@UseGuards(AdminGuard)` | Set active version to a previous release |

**Note:** Handshake and bundle endpoints use `@Public()` decorator (skips JWT AuthGuard) because desktop clients authenticate via HMAC, not JWT.

### Storage Layout
```
backend/storage/PUBLIC/desktop-code/
├── releases.json           ← { currentVersion, releases: [{ version, date, bundleHash, fileHashes }] }
├── bundles/
│   ├── v1.2.0.enc          ← Encrypted bundle (AES-256-GCM with master key)
│   ├── v1.3.0.enc
│   └── ...
└── temp/                   ← Temporary extraction directory (auto-cleaned)
```

**Environment variables:**
- `DESKTOP_CODE_MASTER_KEY` — AES-256 master key for bundle encryption (NEVER in git)
- `DESKTOP_CODE_SHARED_SECRET` — HMAC shared secret for handshake auth (NEVER in git)

### Zip Upload Processing (auto-scan logic)
```typescript
// In desktop-code.service.ts
async processUpload(zipBuffer: Buffer, version: string): Promise<void> {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();
  
  const files: Record<string, { content: string; hash: string; size: number }> = {};
  
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    
    // Security: prevent path traversal
    if (entry.entryName.includes('..')) {
      throw new BadRequestException(`Invalid path: ${entry.entryName}`);
    }
    
    const content = entry.getData();
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    
    files[entry.entryName] = {
      content: content.toString('base64'),
      hash,
      size: content.length,
    };
  }
  
  const manifest = {
    version,
    createdAt: new Date().toISOString(),
    files,
  };
  
  // gzip → encrypt → store
  const json = JSON.stringify(manifest);
  const gzipped = zlib.gzipSync(Buffer.from(json));
  const encrypted = this.cryptoService.encryptWithMasterKey(gzipped);
  
  fs.writeFileSync(`storage/PUBLIC/desktop-code/bundles/v${version}.enc`, encrypted);
  this.updateReleasesJson(version, manifest);
}
```

### Session Store (In-Memory)
```typescript
// In crypto.service.ts — no database needed, sessions are short-lived
private sessions = new Map<string, {
  sessionId: string;
  deviceId: string;
  aesKey: Buffer;        // 32 bytes, random
  createdAt: number;
  expiresAt: number;     // createdAt + 5 minutes
}>();

// Auto-cleanup every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of this.sessions) {
    if (session.expiresAt < now) this.sessions.delete(id);
  }
}, 60_000);
```

### Nonce Store (In-Memory)
```typescript
// Nonces only need to survive the 30-second timestamp window
private nonces = new Map<string, number>(); // nonce → timestamp

// Auto-cleanup every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [nonce, ts] of this.nonces) {
    if (now - ts > 60_000) this.nonces.delete(nonce);
  }
}, 60_000);
```

---

## Electron-Side Implementation

### New Files in `desktop/src/main/`

| File | Purpose |
|------|---------|
| `device-id.ts` | Generate hardware-bound device identifier |
| `crypto-client.ts` | RSA keypair, AES decrypt, HMAC sign, all crypto operations |
| `secure-code-loader.ts` | Orchestrates handshake → version check → download → decrypt → load + serves scripts/templates/config |

### device-id.ts
```typescript
import * as crypto from 'crypto';
import { networkInterfaces, cpus } from 'os';
import { execSync } from 'child_process';

export function getDeviceId(): string {
  const parts: string[] = [];
  
  // 1. First non-internal MAC address
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (!net.internal && net.mac !== '00:00:00:00:00:00') {
        parts.push(net.mac);
        break;
      }
    }
    if (parts.length > 0) break;
  }
  
  // 2. CPU model + cores
  const cpu = cpus()[0];
  parts.push(`${cpu.model}-${cpus().length}`);
  
  // 3. Windows Machine GUID (stable across reboots)
  try {
    const guid = execSync(
      'reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
      { encoding: 'utf-8' }
    );
    const match = guid.match(/MachineGuid\s+REG_SZ\s+(.+)/);
    if (match) parts.push(match[1].trim());
  } catch {}
  
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}
```

### secure-code-loader.ts
```typescript
export class SecureCodeLoader {
  private rendererBuffers = new Map<string, Buffer>();  // filename → content
  private templateMap = new Map<string, string>();       // path → HTML
  private scriptMap = new Map<string, string>();         // name → JS code
  private configMap = new Map<string, any>();            // name → parsed JSON
  private fileHashes = new Map<string, string>();        // path → SHA-256

  async initialize(): Promise<void> {
    const deviceId = getDeviceId();
    
    try {
      const { sessionKey, latestVersion, fileHashes } = await this.handshake(deviceId);
      const cachedHashes = this.loadCachedHashes();
      
      if (this.hashesMatch(fileHashes, cachedHashes)) {
        // All files identical — load from encrypted cache
        this.loadFromCache(deviceId);
      } else if (cachedHashes) {
        // Some files changed — request delta
        const delta = await this.downloadBundle(sessionKey, deviceId, cachedHashes);
        this.mergeBundle(delta);
        this.cacheEncryptedBundle(deviceId);
      } else {
        // No cache — full download
        const bundle = await this.downloadBundle(sessionKey, deviceId);
        this.loadBundle(bundle);
        this.cacheEncryptedBundle(deviceId);
      }
    } catch (err) {
      console.warn('[SecureCodeLoader] Server unavailable, trying cache:', err.message);
      this.loadFromCache(deviceId);
    }
  }

  // Register custom protocol for renderer
  registerProtocol(): void {
    protocol.registerBufferProtocol('app', (request, callback) => {
      const url = new URL(request.url);
      const filename = url.pathname.replace(/^\//, '');
      const buffer = this.rendererBuffers.get(filename);
      if (!buffer) { callback({ statusCode: 404 }); return; }
      const ext = path.extname(filename);
      const mimeTypes: Record<string, string> = {
        '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
      };
      callback({ mimeType: mimeTypes[ext] || 'application/octet-stream', data: buffer });
    });
  }

  // Public API for mebbis-manager.ts
  getScript(name: string): string | undefined { return this.scriptMap.get(name); }
  getTemplate(path: string): string | undefined { return this.templateMap.get(path); }
  getConfig(name: string): any | undefined { return this.configMap.get(name); }
}
```

### Integration with main.ts
```typescript
const secureLoader = new SecureCodeLoader();
await secureLoader.initialize();
secureLoader.registerProtocol();
mainWindow.loadURL('app://renderer/index.html');
```

### Integration with mebbis-manager.ts (Refactored)
```typescript
// OLD — hardcoded scraping:
const menuHtml = `<div class="mtsk-menu">...hundreds of lines...</div>`;
await webContents.executeJavaScript(`document.querySelector('#sol_menu').innerHTML = ...`);

// NEW — scripts from encrypted bundle:
const leftMenuScript = secureLoader.getScript('left-menu.js');
await webContents.executeJavaScript(leftMenuScript);

// OLD — hardcoded selectors:
await page.click('#btnSimulatorRapor');
await page.waitForSelector('table.report-grid');

// NEW — selectors from config:
const selectors = secureLoader.getConfig('mebbis-selectors.json');
await page.click(selectors.simulator.downloadButton);
await page.waitForSelector(selectors.simulator.reportTable);

// OLD — template fetch via HTTP:
const url = `${TEMPLATE_BASE_URL}/${templateName}`;
const html = await fetch(url).then(r => r.text());

// NEW — template from encrypted bundle:
const html = secureLoader.getTemplate(`direksiyon-takip/${templateName}`);
```

---

## Offline Behavior

| Scenario | What Happens |
|----------|-------------|
| **First launch, server available** | Handshake → full download → decrypt → cache → load |
| **Subsequent launch, same version** | Handshake → hashes match → load from cache |
| **Subsequent launch, new version** | Handshake → delta download (changed files only) → merge → cache → load |
| **Server unavailable, cache exists** | Load from device-bound encrypted cache |
| **Server unavailable, no cache** | Show fallback UI: "Server bağlantısı gerekli" + retry button |
| **Partial update failure** | Roll back to previous cached version |

---

## Implementation Steps

| Step | Task | Depends On |
|------|------|-----------|
| 1 | Create `desktop-code` NestJS module structure (module, controller, service, DTOs) | — |
| 2 | Implement `crypto.service.ts` (AES, RSA, HMAC, nonce store, session store) | Step 1 |
| 3 | Implement zip upload + auto-scan + manifest generation + encryption | Step 2 |
| 4 | Implement handshake endpoint (with per-file hashes in response) | Step 2 |
| 5 | Implement bundle download endpoint (full + delta mode) | Steps 2, 4 |
| 6 | Create `device-id.ts` + `crypto-client.ts` in Electron | — |
| 7 | Create `secure-code-loader.ts` (handshake, download, decrypt, cache, protocol) | Steps 5, 6 |
| 8 | Extract scraping scripts from `mebbis-manager.ts` into standalone JS files | — |
| 9 | Refactor `mebbis-manager.ts` to use `secureLoader.getScript/getTemplate/getConfig` | Steps 7, 8 |
| 10 | Integrate into `main.ts` — replace `loadFile` with `loadURL('app://...')` | Step 7 |

---

## Trick Points

1. **`protocol.registerBufferProtocol` timing** — must be called after `app.whenReady()` but before `mainWindow.loadURL()`.

2. **CSP for `app://` protocol** — BrowserWindow's Content-Security-Policy must allow `app://` as a valid source.

3. **GCM Auth Tag ordering** — Node.js `crypto.createDecipheriv('aes-256-gcm')` requires `decipher.setAuthTag(tag)` BEFORE `decipher.update()`. Extract the 16-byte tag from binary header first.

4. **RSA key size limit** — RSA-2048-OAEP can only encrypt up to 190 bytes. Session key is 32 bytes → fits fine. Never RSA-encrypt the whole bundle.

5. **gzip before encrypt** — Always compress before encrypting. Encrypted data won't compress. Order: `JSON → gzip → AES-GCM`.

6. **SHARED_SECRET must match** — Client (obfuscated in binary) and server (env var) must have identical HMAC secret. Mismatch → silent handshake failure.

7. **Server time drift** — If client clock is off by >30s, all requests fail. Return server time in handshake response so client can calculate drift.

8. **Delta merge atomicity** — When merging delta files into cache, write to temp file first, then atomic rename. Prevents corrupted cache on crash.

9. **Scripts are executed via `executeJavaScript`** — They run in the renderer/webview context. They must be self-contained JS (no imports, no require). They receive data via `window.__MTSK_CONFIG__` or similar global injection.

10. **Zip path traversal** — When extracting uploaded zip, validate that all paths are relative and don't contain `..`. This prevents directory traversal attacks.

11. **electron-updater still needed** — If `secure-code-loader.ts` itself has a bug, the only fix is an exe update. The encrypted code system does NOT replace electron-updater.

---

## Relationship to Other Docs

| Doc | Relationship |
|-----|-------------|
| `ELECTRON_CODE_SERVING_FROM_SERVER.md` | **Predecessor** — describes unencrypted remote renderer concept. This doc supersedes it. electron-updater info still valid. |
| `DESKTOP_UPDATE_DEPLOY.md` | **Still valid** — exe-level deployment via electron-updater unchanged. Use for main process changes. |
| `DESKTOP_APP.md` | **Partially affected** — renderer loading changes from `loadFile` to `loadURL('app://...')`. Cookie/IPC/session handling unchanged. |
| `PDF_TEMPLATE_MANAGEMENT.md` | **Affected** — template fetching changes from plain HTTP to encrypted bundle. CSS rules and template naming unchanged. |
| `MEBBIS_SERVICE.md` | **Not affected** — MEBBIS service is a separate backend microservice. Desktop scripts call MEBBIS directly. |
