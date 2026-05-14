---
description: Bundle, deploy, commit & push the desktop remote code
---

Ship a new desktop **remote code** release end-to-end. Remote code = the
scripts/main-bundle/renderer served from the backend (`desktop/remote-code/`),
NOT the Electron exe. This does not touch `minimum_version.json` or build an
installer.

Reference docs (read if anything is unclear):
- `desktop/ai-docs/DESKTOP_UPDATE_DEPLOY.md` — "Remote Code Deployment" section
- `desktop/ai-docs/WHATS_NEW_FORMAT.md` — whatsNew format & Turkish tone rules

## Steps — do these in order

### 1. Write the whatsNew + bump the version

1. Read `desktop/remote-code/version.json`.
2. Read `desktop/ai-docs/WHATS_NEW_FORMAT.md` and write a new `whatsNew` for the
   changes in this release — **Turkish, user-benefit framing**, not technical.
3. Shift `history`: prepend the **current** `{version, whatsNew}` as `history[0]`,
   drop the oldest entry so `history` stays at 3 items.
4. Run `npm run bump:remote-version` in `desktop/` — it increments the trailing
   `.NNN` counter on `version`. (It only touches `version`, not `whatsNew`/`history`,
   so do step 3's edit yourself.)

If the user gave a description of what shipped, base the whatsNew on that.
Otherwise derive it from the uncommitted diff / recent commits — and if it's
genuinely unclear, ask.

### 2. Build the bundle

```
cd desktop && npm run build:remote
```

Rebuilds `desktop/remote-code/main/app-bundle.js` (esbuild) and re-copies the
renderer. If the build fails, stop and report — do not deploy or commit.

Before building, it's worth running `npx tsc --noEmit -p tsconfig.json` in
`desktop/` to catch type errors early (the injected `executeJavaScript` template
strings are NOT type-checked, but the surrounding `.ts` is).

### 3. Deploy to the server (scp)

Target: `ekullanici_i86:/home/mtsk/mtsk.app/backend/storage/desktop-code/`

Only push files that actually changed (compare sha256 against the server, or
just push what `build:remote` reports as changed). **Always push `version.json`
LAST** so clients never see a bumped version before the code behind it.

```bash
dst="ekullanici_i86:/home/mtsk/mtsk.app/backend/storage/desktop-code"
# code files first (only the ones that changed):
scp "desktop/remote-code/main/app-bundle.js"        "$dst/main/app-bundle.js"
scp "desktop/remote-code/renderer/app.js"           "$dst/renderer/app.js"
scp "desktop/remote-code/renderer/index.html"       "$dst/renderer/index.html"
scp "desktop/remote-code/renderer/styles.css"       "$dst/renderer/styles.css"
scp "desktop/remote-code/scripts/auto-fill-login.js" "$dst/scripts/auto-fill-login.js"
scp "desktop/remote-code/scripts/hide-status.js"    "$dst/scripts/hide-status.js"
scp "desktop/remote-code/scripts/show-status.js"    "$dst/scripts/show-status.js"
# version.json LAST:
scp "desktop/remote-code/version.json"              "$dst/version.json"
```

If a file was **deleted** locally (e.g. a script removed in a refactor), `rm` it
on the server too so the inventory stays in sync — `git status` will show `D` for
deleted tracked files.

Then **verify**: `ssh ekullanici_i86 "cd .../desktop-code && sha256sum main/app-bundle.js && head -3 version.json"`
and confirm the hash matches `build:remote`'s output and the version is the
bumped one.

No service restart is needed — the backend rescans `desktop-code/` on every
manifest request. Clients pick it up on next launch / version poll.

### 4. Commit & push everything

Stage the remote-code changes **and** the `desktop/src/` source changes behind
them (the source is the truth; the bundle is the build artifact). Note
`desktop/remote-code/main/` may look gitignored — `app-bundle.js` is force-tracked,
so use `git add -u` on the paths rather than `git add <dir>`.

Commit message: `feat(desktop): <summary> — remote code 1.2.7.NNN` (or `fix(...)`),
with a body explaining what changed and why. End with the
`Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` line.

If on the default branch (`main`), that's fine for this repo — commit directly
and `git push`.

### 5. Report

Summarize: new version number, deployed bundle sha256 (matched ✓), commit hash,
and the whatsNew text. Mention that clients pick it up on next launch.
