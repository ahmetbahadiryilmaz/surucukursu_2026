# Desktop App Code Update System (Remote Code Loader)

## Status: IMPLEMENTED âœ“

---

## Overview

Two independent update mechanisms run in parallel:

| Mechanism | What it updates | Requires reinstall? |
|-----------|----------------|---------------------|
| **`electron-updater`** (exe rebuild) | Main process, preload, Electron framework | âœ… Yes â€” downloads new installer |
| **`RemoteCodeLoader`** (code bundle) | Injected scripts (left-menu, etc.), renderer UI | âŒ No â€” fetched on every startup |

For frequent changes (menu items, modal UI, MEBBIS selectors), only the **code bundle** needs updating. The exe stays the same.

---

## Version Gate (min / max / strict)

### `minimum_version.json`
Hosted at `https://online.mtsk.app/desktop-updates/minimum_version.json`.

```json
{
  "minimumVersion": "1.2.1",
  "maximumVersion": null,
  "strictVersionCheck": true,
  "message": "Bu sÃ¼rÃ¼m artÄ±k desteklenmiyor. LÃ¼tfen gÃ¼ncelleyin.",
  "whatsNew": null
}
```

| Field | Type | Behavior |
|-------|------|----------|
| `minimumVersion` | `"x.x.x"` | Block app if current version is **below** this. Forces exe download via electron-updater. |
| `maximumVersion` | `"x.x.x"` or `null` | Block app if current version is **above** this. Shows error + quit (no downgrade). Use for rollback protection. |
| `strictVersionCheck` | `true` / `false` | `false` = skip all blocking â€” any version is allowed. Use during maintenance or for user exemptions. |
| `message` | string | Displayed in the blocking dialog. |
| `whatsNew` | string or `null` | Shown in the "What's New" dialog on first launch after an update. |

### Use Cases

| Scenario | Config |
|----------|--------|
| Normal deployment (force update) | `strictVersionCheck: true`, `minimumVersion: "x.x.x"` (latest) |
| Maintenance mode / exempt all users | `strictVersionCheck: false` |
| Rollback protection (block too-new versions) | `strictVersionCheck: true`, `maximumVersion: "x.x.x"` |
| Beta testing (allow any version) | `strictVersionCheck: false` |

> **Trick point:** `above-max` blocks the app and shows a "contact support" error. There is no auto-downgrade â€” `electron-updater` cannot install older versions.

---

## Remote Code Loader

### Server Structure
```
https://online.mtsk.app/desktop-code/
├── manifest.json              ← version + per-file SHA-256 hashes
└── scripts/
    ├── auto-fill-login.js     ← fills MEBBIS login username/password fields
    ├── hide-status.js         ← hides the in-page status bar
    ├── left-menu.js           ← MEBBIS page left-menu injection script
    └── show-status.js         ← shows a colored status message in-page
```

### Existing remotely-updatable scripts

| Script | Used by (`mebbis-manager.ts`) | Placeholders |
|--------|-------------------------------|--------------|
| `scripts/auto-fill-login.js` | `autoFillLogin(win, account)` | `__USERNAME__`, `__PASSWORD__` |
| `scripts/show-status.js` | `showStatus(win, message, color)` | `__MESSAGE__`, `__COLOR__` |
| `scripts/hide-status.js` | `hideStatus(win)` | _(none)_ |
| `scripts/left-menu.js` | `injectLeftMenu(win, _account)` | _(none)_ |

### `manifest.json` format
```json
{
  "version": "r1.1.0",
  "updatedAt": "2026-04-22T00:00:00Z",
  "files": {
    "scripts/auto-fill-login.js": "<hex-sha256-of-file>",
    "scripts/hide-status.js":     "<hex-sha256-of-file>",
    "scripts/left-menu.js":       "<hex-sha256-of-file>",
    "scripts/show-status.js":     "<hex-sha256-of-file>"
  }
}
```

- `version` â€” bump this whenever any file changes (for logging; actual cache invalidation is per-file hash)
- `files` â€” map of `relative-path â†’ sha256-hex`. Only files whose hash differs from local cache are re-downloaded.

### Local Cache
Files are cached at `%AppData%/mebbis-desktop/code-cache/`:
```
code-cache/
â”œâ”€â”€ manifest.json           â† last seen manifest
â””â”€â”€ scripts/
    â””â”€â”€ left-menu.js        â† cached remote script
```

---

## Flow (App Startup)

```
App starts
  â”‚
  â”œâ”€ enforceVersionCheckWithSplash()   â† blocks until version check done
  â”‚     â†“
  â”‚   [allowed?]
  â”‚     â”œâ”€â”€ strictVersionCheck=false â†’ allowed (no-check)
  â”‚     â”œâ”€â”€ version >= min AND (max=null OR version <= max) â†’ allowed (ok)
  â”‚     â”œâ”€â”€ version < min â†’ BLOCKED â†’ force exe download via electron-updater
  â”‚     â””â”€â”€ version > max â†’ BLOCKED â†’ show error + quit (no downgrade)
  â”‚
  â”œâ”€ getCodeLoader().sync()            â† non-blocking, runs in background
  â”‚     â†“
  â”‚   Fetch manifest.json from server
  â”‚   For each file where hash differs:
  â”‚     download â†’ verify hash â†’ write to code-cache/
  â”‚   Save manifest.json to code-cache/
  â”‚
  â””â”€ createMainWindow()                â† app opens immediately
```

---

## How to Update the Left Menu (or Any Script)

1. **Edit** the script file, e.g. `backend/storage/PUBLIC/desktop-code/scripts/left-menu.js`.

2. **Compute SHA-256**:
   ```bash
   node -e "const c=require('crypto'),f=require('fs'); \
     console.log(c.createHash('sha256').update(f.readFileSync('scripts/left-menu.js')).digest('hex'))"
   ```

3. **Update `manifest.json`** â€” bump `version` and set the new hash for the changed file.

4. **Upload to server**:
   ```bash
   scp backend/storage/PUBLIC/desktop-code/scripts/left-menu.js \
       mtsk@ekullanici_yeni:/home/mtsk/online.mtsk.app/desktop-code/scripts/

   scp backend/storage/PUBLIC/desktop-code/manifest.json \
       mtsk@ekullanici_yeni:/home/mtsk/online.mtsk.app/desktop-code/
   ```

5. **Done.** All apps fetch the update on next startup. No reinstall required.

---

## Canonical Pattern: `runScriptOrFallback`

**All injected scripts MUST use this helper.** It is the single canonical way to run remotely-updatable JS in a `BrowserWindow`.

```ts
await getCodeLoader().runScriptOrFallback(
  win,                       // BrowserWindow target
  'scripts/foo.js',          // path inside desktop-code/ (matches manifest.json key)
  fallback,                  // hardcoded JS string used if no remote/cache exists
  { KEY: value, OTHER: 42 }, // optional placeholder map
);
```

### Placeholder substitution rules
- Tokens in the script source are written as `__KEY__` (uppercase, double-underscore on each side).
- Each `__KEY__` is replaced with `JSON.stringify(params[KEY])` before `executeJavaScript` is called.
- Use `JSON.stringify` semantics in your script — i.e. drop the token where you'd write a JS literal:
  ```js
  // in scripts/auto-fill-login.js
  document.getElementById('user').value = __USERNAME__;
  document.getElementById('pass').value = __PASSWORD__;
  ```
- Never hand-quote (`'__USERNAME__'`) — `JSON.stringify` already produces a quoted/escaped JS literal.
- `null`/`undefined`/objects/booleans all serialize correctly.

### Selection priority
1. Remote cache hit → run downloaded script (with placeholders substituted).
2. No cache (fresh install offline, or first launch before `sync()` finishes) → run the hardcoded `fallback` string (with placeholders substituted).

The hardcoded `fallback` is mandatory — it guarantees the app works on first launch and offline.

---

## How to Add a New Remotely-Updatable Script

1. **Create the `.js` file** under `backend/storage/PUBLIC/desktop-code/scripts/your-script.js`. Use `__KEY__` placeholders for any dynamic values.
2. **Compute its SHA-256** and add it to `manifest.json` (bump `version`).
3. **Add a hardcoded `fallback`** string in `mebbis-manager.ts` that mirrors the script (same `__KEY__` placeholders).
4. **Call the helper**:
   ```ts
   await getCodeLoader().runScriptOrFallback(win, 'scripts/your-script.js', fallback, { KEY: value });
   ```
5. **Upload** the script + `manifest.json` to the server.

> Use `void getCodeLoader().runScriptOrFallback(...)` for fire-and-forget calls (e.g. status updates).

---

## Fallback Behavior

| Situation | Result |
|-----------|--------|
| Server reachable, file updated | Downloads new version, uses it on NEXT startup |
| Server reachable, file unchanged (hash match) | Skips download, uses cached version |
| Server unreachable, cache exists | Uses cached version (last known good) |
| Server unreachable, no cache (fresh install) | Falls back to hardcoded script in `mebbis-manager.ts` |

The app **always starts** regardless of code loader success/failure.

---

## Code References

| File | Role |
|------|------|
| `desktop/src/main/remote-code-loader.ts` | `RemoteCodeLoader` class + `getCodeLoader()` singleton |
| `desktop/src/main/main.ts` | Calls `getCodeLoader().sync()` after version check passes |
| `desktop/src/main/mebbis-manager.ts` | Uses `getCodeLoader().runScriptOrFallback(...)` in `autoFillLogin`, `showStatus`, `hideStatus`, `injectLeftMenu` |
| `desktop/src/main/auto-updater.ts` | Version gate â€” handles `minimumVersion`, `maximumVersion`, `strictVersionCheck` |
| `backend/storage/PUBLIC/desktop-code/manifest.json` | Source-of-truth for code bundle version + hashes |
| `backend/storage/PUBLIC/desktop-code/scripts/*.js` | Remotely-updatable injected scripts (left-menu, auto-fill-login, show-status, hide-status) |
| `backend/storage/PUBLIC/desktop-updates/minimum_version.json` | Version gate config |

---

## Trick Points

- `getCodeLoader()` is a **lazy singleton** â€” call it after `app.whenReady()` because the constructor calls `app.getPath('userData')`.
- **Hash verification**: if the SHA-256 of the downloaded content doesn't match `manifest.json`, the file is rejected and the old cached version is kept. This prevents corrupted/tampered files.
- **Path traversal protection**: any `..` segments in manifest filenames are stripped before writing to disk.
- **sync() is non-blocking**: the main window opens immediately; updated files are used on the NEXT startup. This keeps startup fast.
- **above-max**: cannot auto-downgrade. Admin must contact the user.
- **strictVersionCheck: false** lets anyone run any version â€” useful for maintenance windows, beta users, and emergency access.

---

## Deploy an Exe Update (electron-updater)

See `desktop/ai-docs/DESKTOP_UPDATE_DEPLOY.md` for the full exe deploy workflow.

Quick recap:
1. Bump version in `desktop/package.json`
2. `cd desktop && npm run dist`
3. Upload `MTSK_APP Setup x.x.x.exe`, `latest.yml`, `.blockmap` to `online.mtsk.app/desktop-updates/`
4. Update `minimum_version.json` to new version
