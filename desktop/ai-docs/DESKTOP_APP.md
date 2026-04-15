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
- Fields: `id`, `username`, `password`, `label`, `isRunning`, `createdAt`
- `isRunning` is reset to `false` on every app start

## Auto-Fill Flow
1. Navigate to `https://mebbisyd.meb.gov.tr/SKT/skt00001.aspx`
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

## IPC Channels
| Channel | Direction | Description |
|---------|-----------|-------------|
| `accounts:list` | renderer→main | Get all accounts |
| `accounts:add` | renderer→main | Add new account |
| `accounts:update` | renderer→main | Update account |
| `accounts:remove` | renderer→main | Delete account + clear session data |
| `accounts:start` | renderer→main | Open MEBBIS window for account |
| `accounts:stop` | renderer→main | Close MEBBIS window (cookies kept!) |
| `accounts:focus` | renderer→main | Focus account window |
| `accounts:get-status` | renderer→main | Check if account window is open |
| `account:stopped` | main→renderer | Notify UI when window closed |

## UI Notes
- CSP: `script-src 'self'` — no inline `onclick`. Uses `data-action` + event delegation instead.
- Password field has togglable eye icon for show/hide
- Dark theme (#1a1a2e background)
- Turkish UI labels (Başlat, Durdur, Göster, Düzenle, Sil)

## Run Commands
```bash
cd desktop
npm install
npm run dev      # Build TS + launch Electron
npm run build    # Build TS only
npm run start    # Build + launch
```

## Known Trick Points
1. **CSP blocks inline handlers**: Must use event delegation, not `onclick="..."`
2. **Session cookies vanish on close**: Must intercept and add `expirationDate`
3. **`flushStore()` needed**: Always flush before close/quit or cookies may be lost
4. **MEBBIS form fields**: `txtKullaniciAd`, `txtSifre` — ASP.NET needs `change` events
5. **Renderer files not in dist**: Static HTML/CSS/JS stays in `src/renderer/`, path is `__dirname + ../../src/renderer`
