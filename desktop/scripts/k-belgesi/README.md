# K-Belgesi position iteration toolkit

Three files. Run inside Electron (NOT plain Node — `ELECTRON_RUN_AS_NODE`
must be unset, otherwise Electron runs as Node and `require('electron')`
returns just the binary path).

| File | When to run |
|---|---|
| `fields.js` | Edit-only — exports the `FIELDS` array with `(key, left, top, width)` in mm for every `.cvp.<key>` placeholder. |
| `capture-bg.js <input.pdf>` | One-time setup — converts the empty form PDF to `backend/storage/templates/k-belgesi/k-belgesi-bg.png`. Re-run only when the source PDF changes. |
| `main.js` | Iteration runner — reads `fields.js`, regenerates `k-belgesi.html` (with the bg embedded as a base64 data URI), and dumps preview / print / with-bg artefacts into `desktop/release/k-belgesi/`. |

## Usage

```bash
# 1. (one-time) capture the empty form bg PNG
ELECTRON_RUN_AS_NODE= ./node_modules/electron/dist/electron.exe \
  scripts/k-belgesi/capture-bg.js path/to/empty-k-belgesi.pdf

# 2. iterate positions: edit fields.js, then
ELECTRON_RUN_AS_NODE= ./node_modules/electron/dist/electron.exe \
  scripts/k-belgesi/main.js
```

## Outputs in `desktop/release/k-belgesi/`

| File | Meaning |
|---|---|
| `print.pdf` | Production output — bg stripped via `@media print`. Print this onto the official pre-printed K-Belgesi paper. |
| `with-bg.pdf` | Alignment check — same fill but with the empty form scan kept as background. |
| `print.png` / `with-bg.png` | Both PDFs rendered to PNG via pdfjs (no viewer chrome). |
| `preview.png` | Screen capture with bg + 10mm grid + per-field key tags. Use to read off coordinates. |
| `with-bg-box{1..4}.png` | Zoomed crops of the four form boxes for fast visual review. |

The desktop app's "🧪 Test → K Belgesi PDF" menu uses the same template
and the same fill mechanism, so getting positions right here is enough.
