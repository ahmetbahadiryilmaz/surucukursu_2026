# PDF Template Management — Direksiyon Takip

## Overview
The desktop Electron app generates "Direksiyon Eğitimi Çalışma Takip Formu" PDFs using HTML templates hosted on the server. **All styling lives in the templates themselves**, not in the app code.

## Architecture

```
Server (online.mtsk.app)          Desktop App (Electron)
┌─────────────────────┐           ┌─────────────────────────┐
│ /templates/          │  fetch   │ mebbis-manager.ts        │
│   direksiyon-takip/  │ ──────> │   fetchTemplate()        │
│     4n.html          │          │   generatePdfFromTemplate │
│     6n.html          │          │     - loads HTML as-is   │
│     7n.html          │          │     - fills data via DOM  │
│     10n.html         │          │     - scaleY to fill A4   │
│     12n.html         │          │     - printToPDF          │
│     12nsimli.html    │          └─────────────────────────┘
│     14n.html         │
│     14nsimli.html    │
│     16n.html         │
│     16nsimli.html    │
│     20n.html         │
└─────────────────────┘
```

## Key Rule: CSS Lives in Templates, NOT in App Code

**DO NOT** hardcode CSS overrides, font replacements, or layout hacks in `mebbis-manager.ts`.

**DO** update the HTML template files on the server when styling changes are needed.

### Why?
- Templates can be updated instantly on the server without deploying a new app version
- No CSS string concatenation / regex replacement in TypeScript
- Templates are the single source of truth for layout
- Easier to inspect and debug (open the HTML file in a browser)

## Template CSS (Chromium printToPDF-compatible)

All templates share this CSS structure (already baked into each template):

```css
@page { size: 210mm 297mm; margin: 0; }
* { font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 0.9; }
html { width: 210mm; margin: 0; padding: 0; }
body { width: 210mm; margin: 0; padding: 2mm 5mm 1mm 5mm; box-sizing: border-box; text-align: center; overflow: hidden; }
body > br { display: none; }
h2 { margin: 0; font-size: 11px; text-align: center; }
table { width: 100%; border: 1px solid black; border-collapse: collapse; margin: 0; }
th, td { border: 1px solid black; border-collapse: collapse; padding: 1px 2px; }
p { width: 100%; text-align: right; margin: 0; font-size: 8px; }
```

### Important CSS Differences from Old DOMPDF Templates
| Property | Old (DOMPDF) | New (Chromium) |
|----------|-------------|----------------|
| `font-family` | `DejaVu Sans` | `Arial, Helvetica, sans-serif` |
| `@page margin` | `10mm` | `0` |
| `table width` | `700px` | `100%` |
| `body padding` | `0 0 80px 0` | `2mm 5mm 1mm 5mm` |
| `p width` | `700px` | `100%` |

## What the App Code Does (mebbis-manager.ts)

The app only handles:
1. **Fetch template** — downloads HTML from server as-is
2. **Fill data** — injects student info and lesson records via DOM manipulation (executeJavaScript)
3. **ScaleY** — measures `body.scrollHeight` vs A4 height (1123px at 96dpi), applies `scaleY()` transform to stretch content vertically to fill page
4. **printToPDF** — calls Chromium's `printToPDF` with zero margins and `preferCSSPageSize: true`

### ScaleY Logic (kept in app code, not templates)
```js
const bodyHeight = document.body.scrollHeight;
const pageHeightPx = 297 * 96 / 25.4; // ~1123px
const scale = (pageHeightPx * 0.98) / bodyHeight;
document.body.style.transform = 'scaleY(' + scale + ')';
document.body.style.transformOrigin = 'top center';
document.body.style.height = '297mm';
document.body.style.maxHeight = '297mm';
document.body.style.overflow = 'hidden';
```
This is the **only** runtime manipulation that stays in app code because it requires measuring rendered content height.

## Template Naming Convention

| Template | Lesson Count | Has Simulator Rows |
|----------|-------------|-------------------|
| `4n.html` | 4 | No |
| `6n.html` | 6 | No |
| `7n.html` | 7 | No |
| `10n.html` | 10 | No |
| `12n.html` | 12 | No |
| `12nsimli.html` | 12 | Yes |
| `14n.html` | 14 | No |
| `14nsimli.html` | 14 | Yes |
| `16n.html` | 16 | No |
| `16nsimli.html` | 16 | Yes |
| `20n.html` | 20 | No |

## How to Update Templates

1. Download templates from server or edit local copies in `desktop/responses/templates/`
2. Make CSS/HTML changes in the template files
3. Upload to server: `scp desktop/responses/templates/*.html mtsk@ekullanici_yeni:/home/mtsk/online.mtsk.app/templates/direksiyon-takip/`
4. Changes take effect immediately — no app deploy needed for CSS-only changes

## Template HTML Structure

```html
<body>
  <h2>DİREKSİYON EĞİTİMİ ÇALIŞMA TAKİP FORMU</h2>
  <!-- Some templates have <div class="tablo"> wrapper, some don't -->
  <table class="tablo">
    <tr><th>Adı Soyadı</th><th class="cvp name"> </th>...</tr>
    <!-- Lesson rows with .date, .plate, .mTrainer classes -->
  </table>
  <p>TOPLAM DERS SAATİ: N ders</p>
</body>
```

### DOM Selectors Used by App
- `.name` — student name
- `.tc` — TC kimlik number
- `.vClass` — license class letter
- `.date` — lesson date cells
- `.plate` — vehicle plate cells
- `.mTrainer` — instructor name cells

## Trick Points

1. **Cloudflare beacon injection**: When downloading templates from the server via browser/curl, Cloudflare may inject a `<script>` beacon. Always remove it from local copies before re-uploading.
2. **Two template structures**: Some templates (4n, 6n, 7n) wrap the table in `<div class="tablo">`, others (10n-20n) put `class="tablo"` on the table directly. Both work fine.
3. **ScaleY must stay in app code**: It needs to measure actual rendered content height after data is filled, which can only be done at runtime.
4. **printToPDF margins must be 0**: The template CSS handles all spacing via `@page` and body padding.
