# Remote desktop code

Source-of-truth for the JS files served to the desktop app via the encrypted
`/desktop-code` channel (see `desktop/src/main/remote-code-loader.ts`).

## Layout

```
remote-code/
└── scripts/
    ├── auto-fill-login.js
    ├── show-status.js
    ├── hide-status.js
    └── left-menu.js
```

Filenames here must match the `runScriptOrFallback(win, 'scripts/<name>.js', ...)`
calls in `desktop/src/main/mebbis-manager.ts`.

## Placeholders

The desktop client substitutes `__KEY__` tokens with `JSON.stringify(params[KEY])`
*after* download. Keep these literal in the deployed file:
- `__USERNAME__`, `__PASSWORD__` (auto-fill-login.js)
- `__MESSAGE__`, `__COLOR__` (show-status.js)

## Deploy

Full remote-code push (scripts + main bundle + renderer + version.json).
Run `npm run build:remote` first so `main/` and `renderer/` are fresh; then:

```powershell
rsync -avz --delete `
    --exclude=README.md `
    desktop/remote-code/ `
    ekullanici_i86:/home/mtsk/mtsk.app/backend/storage/desktop-code/
```

Scripts-only quick push (legacy webContents-injected scripts, no exe rebuild):

```powershell
rsync -avz --delete `
    desktop/remote-code/scripts/ `
    ekullanici_i86:/home/mtsk/mtsk.app/backend/storage/desktop-code/scripts/
```

The desktop-service backend rescans `backend/storage/desktop-code/` on every
`POST /desktop-code/manifest` call. Clients pick up changes on their next
launch (or whenever `getCodeLoader().sync()` is invoked). Bumping
`version.json` (via `npm run bump:remote-version`) additionally triggers the
"What's new" modal for users on the previous version.

## Server requirements

- `backend/storage/desktop-code/scripts/` must exist on the server.
- `DESKTOP_KEY` and `DESKTOP_HMAC_SECRET` must be set in `backend/.env`.
- Allowed paths (server-side regex): `scripts/<name>.js` and
  `renderer/<name>.{html,js,css}`. Anything else is rejected with 400.
