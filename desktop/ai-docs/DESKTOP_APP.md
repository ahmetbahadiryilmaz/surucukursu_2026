# MEBBIS Desktop App (Electron)

## Overview
Electron app for managing multiple MEBBIS accounts. Each account has its own isolated browser session with **permanently persisted cookies**.

## Architecture
```
desktop/
  package.json          ← Independent npm package (NOT in pnpm workspace)
  tsconfig.json
  src/
    main/
      main.ts           ← Electron entry, IPC handlers
      account-store.ts  ← Account CRUD, persisted to JSON
      mebbis-manager.ts ← Browser windows per account, cookie management
    preload/
      preload.ts        ← Secure IPC bridge (contextBridge)
    renderer/
      index.html        ← Account management UI
      styles.css        ← Dark theme
      app.js            ← UI logic, event delegation
```

## Cookie Persistence (CRITICAL)

### How it works
- Each account gets a unique Electron session partition: `persist:mebbis-{accountId}`
- `persist:` prefix tells Electron to save session data to disk automatically
- **Trick Point**: MEBBIS sets **session cookies** (no expiration date). Electron deletes session cookies when the last window using that partition closes — even with `persist:`.
- **Solution**: We intercept `ses.cookies.on('changed')` and re-set any session cookie with a 30-day expiration, making them permanent.
- On stop/close, `ses.cookies.flushStore()` is called to force-write to disk.

### Cookie storage location
Electron stores persistent partition data at:
```
%AppData%/mebbis-desktop/Partitions/persist__mebbis-{accountId}/
```

### Cookie lifecycle
1. **Account Start**: Check existing cookies → navigate to `/SKT/skt00001.aspx`
2. **Session Valid**: Goes to dashboard (cookies work!)
3. **Session Invalid**: Redirects to login page → auto-fill + auto-submit
4. **New Cookie Set**: Intercepted, converted from session → persistent (30 day expiry)
5. **Account Stop**: `flushStore()` called → cookies saved to disk
6. **App Quit**: `before-quit` event → all cookies flushed
7. **App Restart + Start**: Cookies loaded from disk → goes to SKT page first

### What does NOT clear cookies
- Closing the MEBBIS window (stop)
- Closing the entire app
- Restarting the app

### What DOES clear cookies
- Only deleting the account (`accounts:remove` handler calls `ses.clearStorageData()`)

## Account Storage
- Accounts stored in `%AppData%/mebbis-desktop/accounts.json`
- Fields: `id`, `username`, `password`, `label`, `isRunning`, `createdAt`, `simulatorType?`, `subscriptionActive?`
- `isRunning` is reset to `false` on every app start
- `subscriptionActive` reflects the latest value fetched from server — it is NOT persisted to disk; it is refreshed on every `accounts:list` call

## Auto-Fill Flow
1. Navigate to `https://mebbis.meb.gov.tr/SKT/skt00001.aspx`
2. If redirected to `default.aspx` → login page detected
3. Fill `#txtKullaniciAd` (username) and `#txtSifre` (password)
4. Dispatch `input` and `change` events for ASP.NET form binding
5. Wait 300ms, then find and click submit button (`#btnGiris`, `#dogrula`, submit input, or text match)
6. If no button found, fallback to `form.submit()`
7. Retries up to 10 times (500ms interval) if fields not found immediately

## Status Bar
Injected into MEBBIS pages:
- **Orange** "CHECKING LOGIN..." — navigating to SKT page
- **Red** "TRYING LOGIN..." — on login page, auto-filling
- **Hidden** — successfully on a non-login page

## Device ID

Every installation has a stable hardware-bound identifier stored in `%AppData%/mebbis-desktop/device-id.txt`.

### How it's computed
1. Three WMIC queries run at startup: `csproduct get UUID`, `cpu get ProcessorId`, `diskdrive where 'Index=0' get SerialNumber`.
2. Their values are concatenated with `|` and SHA-256 hashed → 64-char hex string.
3. The result is cached in `device-id.txt` on first launch. Subsequent launches read from cache (so minor hardware changes like RAM swaps don't change the ID).
4. If all WMIC queries fail (unusual environments), a UUID is generated and cached instead.

### API
- `getDeviceId()` — synchronous, call after `initDeviceId()` has resolved.
- `initDeviceId()` — async, called once at app startup inside `app.whenReady()`.
- IPC: `device:id` → renderer calls `window.mebbisAPI.getDeviceId()`.

### Cache file
```
%AppData%/mebbis-desktop/device-id.txt
```
A 64-char lowercase hex SHA-256 string (or UUID as fallback).

---

## IPC Channels
| Channel | Direction | Description |
|---------|-----------|-------------|
| `device:id` | renderer→main | Get hardware-bound device ID |
| `accounts:list` | renderer→main | Get all accounts. Each account includes `subscriptionActive: boolean` from server |
| `accounts:add` | renderer→main | Add new account |
| `accounts:update` | renderer→main | Update account |
| `accounts:remove` | renderer→main | Delete account + clear session data |
| `accounts:start` | renderer→main | Open MEBBIS window. Throws `SUBSCRIPTION_INACTIVE` if school sub is inactive, throws `NO_SIMULATOR_TYPE` if simulator not configured |
| `accounts:stop` | renderer→main | Close MEBBIS window (cookies kept!) |
| `accounts:focus` | renderer→main | Focus account window |
| `accounts:get-status` | renderer→main | Check if account window is open |
| `account:stopped` | main→renderer | Notify UI when window closed |

## UI Notes
- CSP: `script-src 'self'` — no inline `onclick`. Uses `data-action` + event delegation instead.
- Password field has togglable eye icon for show/hide
- Dark theme (#1a1a2e background)
- Turkish UI labels (Başlat, Durdur, Göster, Düzenle, Sil)

## Update Policy (CRITICAL)
**Users can NEVER use the app unless they are on the latest version.** Every deployment sets `minimumVersion` in the server's `minimum_version.json` to the current version, blocking all older clients on startup. There are no optional updates — all updates are mandatory. See `desktop/ai-docs/DESKTOP_UPDATE_DEPLOY.md` for deployment steps.

## Run Commands
```bash
cd desktop
npm install
npm run dev      # Build TS + launch Electron
npm run build    # Build TS only
npm run start    # Build + launch
```

## MEBBIS Session Constraint (CRITICAL)

**MEBBIS allows only ONE active browser tab/connection per session.** If you make a separate HTTP request (fetch, GET, POST) outside the visible BrowserWindow — even using the same session cookies — MEBBIS **invalidates the session and forces a logout**.

### What this means:
- **NO hidden BrowserWindow** with shared partition for background requests
- **NO `fetch()` / `https.get()` / `axios.post()`** to MEBBIS endpoints from Node.js using session cookies
- **ALL MEBBIS page navigation must happen in the same visible BrowserWindow** for that account
- Interaction is done via `executeJavaScript()` — clicking menu items, filling form fields, submitting forms (DOM manipulation within the existing tab)

### Why:
MEBBIS server-side session is bound to a single active request context. A second concurrent connection (even from the same cookie jar) is treated as a session hijack and the server destroys the session.

### Correct pattern:
```ts
// ✅ Navigate within the SAME window
win.webContents.executeJavaScript(`
  document.getElementById('someMenuTd').click(); // navigates in-page
`);
// Then handle result in 'did-finish-load' event

// ❌ NEVER do this — causes logout
const hiddenWin = new BrowserWindow({ show: false, webPreferences: { partition } });
hiddenWin.loadURL('https://mebbis.meb.gov.tr/SKT/skt02009.aspx');
```

### Impact on Toplu (Bulk) Download:
Bulk download MUST use the **same visible BrowserWindow** and process students **sequentially** by:
1. Navigating to skt02006.aspx (student list) via menu click
2. Submitting the form to list students (DOM click on `btnListele`)
3. Scraping TC list from `#dgListele` table
4. Navigating to skt02009.aspx for each TC one-by-one (click menu → fill TC → submit → scrape → navigate back)
5. Generating PDFs in a **separate hidden BrowserWindow** that loads the HTML template (NOT a MEBBIS page — templates are from `online.mtsk.app`, not MEBBIS)

The visible window is "locked" during bulk processing — user sees progress status overlay.

## Known Trick Points
1. **CSP blocks inline handlers**: Must use event delegation, not `onclick="..."`
2. **Session cookies vanish on close**: Must intercept and add `expirationDate`
3. **`flushStore()` needed**: Always flush before close/quit or cookies may be lost
4. **Simulator type is mandatory before start**: `accounts:start` IPC handler throws `NO_SIMULATOR_TYPE` if `simulatorType` is null/undefined in DB. The renderer catches this error and auto-opens the edit modal. Account cards without a simulator type show an orange warning badge and have an orange Start button.
5. **Subscription gate on start**: `accounts:start` also throws `SUBSCRIPTION_INACTIVE` when the school's subscription is not `paid`/active. The renderer catches this and shows an alert. Card start button is also visually disabled (`disabled-subscription` CSS class, disabled HTML attribute) as a first defense.
6. **`subscriptionActive` is computed server-side**: It comes from `desktop-service` via `getMebbisAccounts`. Never compute it in the client — the server is the source of truth.
7. **MEBBIS form fields**: `txtKullaniciAd`, `txtSifre` — ASP.NET needs `change` events
8. **Renderer files not in dist**: Static HTML/CSS/JS stays in `src/renderer/`, path is `__dirname + ../../src/renderer`
9. **IPC handlers must be registered before createMainWindow()**: The renderer loads immediately and calls `accounts:list` on DOMContentLoaded. If `setupIPC()` runs after the window is created (e.g. after an async version check), the handler won't exist yet → "No handler registered" error.
10. **One tab per MEBBIS session**: Any secondary HTTP connection (hidden window, fetch, etc.) to MEBBIS with the same cookies causes immediate session invalidation / logout. See "MEBBIS Session Constraint" section above.
11. **Desktop auth transient DB drops**: `desktop-service` auth login/logout now retries transient MySQL socket errors (`ECONNRESET`, `PROTOCOL_CONNECTION_LOST`, `ETIMEDOUT`, `EPIPE`) up to 3 attempts with short backoff to avoid random login failures on unstable remote DB connections.
