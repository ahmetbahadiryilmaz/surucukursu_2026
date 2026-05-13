// All-in-one K-Belgesi position iteration tool.
//
// Run with:
//   ELECTRON_RUN_AS_NODE= ./node_modules/electron/dist/electron.exe scripts/k-belgesi/main.js
//
// (must run inside Electron — needs BrowserWindow / printToPDF / nativeImage.
//  ELECTRON_RUN_AS_NODE must NOT be set, otherwise Electron runs as Node.)
//
// What it does in one Electron session:
//   1. Reads scripts/k-belgesi/fields.js to get field (key, left, top, width).
//   2. Reads backend/storage/templates/k-belgesi/k-belgesi-bg.png (the empty
//      form scan), embeds as base64 data URI into a generated HTML file.
//   3. Writes backend/storage/templates/k-belgesi/k-belgesi.html.
//   4. Renders three artefacts into desktop/release/k-belgesi/:
//        - print.pdf       : production output (bg stripped via @media print)
//        - with-bg.pdf     : alignment-check (override @media print to keep bg)
//        - preview.png     : screen capture with bg + 10mm grid + field tags
//   5. Renders both PDFs back to PNGs via embedded pdfjs (no viewer chrome).
//   6. Crops 4 zoomed sections (box1..box4) of with-bg.png for visual review.
//
// To iterate positions: edit fields.js, re-run this script, look at the
// outputs (especially with-bg-box{1..4}.png).
const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const FIELDS = require('./fields.js');
const TEMPLATE_DIR = path.join(ROOT, '..', 'backend', 'storage', 'templates', 'k-belgesi');
const BG_PATH = path.join(TEMPLATE_DIR, 'k-belgesi-bg.png');
const HTML_PATH = path.join(TEMPLATE_DIR, 'k-belgesi.html');
const OUT = path.join(ROOT, 'release', 'k-belgesi');
fs.mkdirSync(OUT, { recursive: true });

// Random sample data so each render exercises the full layout.
const SAMPLE = {
  // Box 1
  aracCinsi: 'Otomobil',
  gurzergah: 'Mahalle içi - Şehir merkezi',
  gunSaat: 'Pzt-Cu 09:00-17:00',
  // Form has "/" already printed between dot groups, so we only emit digits
  // separated by wide spacing so each part lands on its dot group.
  // düzenleme: tighter spacing day→month so the month sits 2 px to the left.
  duzenlenmeTarihi: '06  05    2026',
  // Geçerlilik bitiş = düzenlenme + 6 ay (06.05.2026 → 06.11.2026).
  gecerlikBitisi: '06    11    2026',
  mudurAd: 'AHMET TEST MÜDÜR',
  // Box 2
  iliIlcesi: 'İSTANBUL / Küçükçekmece',
  kursAdi: 'TEST',
  belgeNo: '2026-001',
  belgeTarihi: '06/05/2026',
  kursAdresi: 'Test Mah. Test Sok. No:5 Çankaya/Ankara',
  // Box 3
  adayTc: '12345678901',
  adayAd: 'AHMET',
  adaySoyad: 'YILMAZ',
  adayBabaAd: 'MEHMET',
  adayDogumYeri: 'İstanbul',
  adayDogumTarihi: '15/03/1995',
  adayAdresi: 'Aday Mah. Aday Sok. No:10 D:5 Çankaya/Ankara',
  // Box 4
  ustaTc: '98765432109',
  ustaAd: 'VELİ',
  ustaSoyad: 'ÇOLAK',
  ustaAdresi: 'Eğitmen Mah. No:3 Ankara',
  ustaBelgeSinifi: 'B',
  ustaBelgeNo: '987654321',
  ustaBelgeYeri: 'Ankara',
};

function buildHtml() {
  if (!fs.existsSync(BG_PATH)) {
    throw new Error('Missing background image: ' + BG_PATH);
  }
  const bgB64 = fs.readFileSync(BG_PATH).toString('base64');
  const fieldDivs = FIELDS.map(f => {
    const extra = f.fontSize ? ` font-size: ${f.fontSize};` : '';
    return `    <div class="cvp ${f.key}" style="left: ${f.left}mm; top: ${f.top}mm; width: ${f.width}mm;${extra}"></div>`;
  }).join('\n');
  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<style>
  @page { size: 210mm 297mm; margin: 0; }
  * { font-family: DejaVu Sans, Arial, sans-serif; box-sizing: border-box; }
  html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; position: relative; overflow: hidden; }
  .bg {
    position: absolute; inset: 0; width: 210mm; height: 297mm;
    background-image: url("data:image/png;base64,${bgB64}");
    background-size: 100% 100%; background-repeat: no-repeat; z-index: 0;
  }
  @media print { .bg { display: none !important; } }
  .cvp {
    position: absolute; z-index: 2; font-size: 9pt; color: black; line-height: 1.1;
    background: rgba(255, 255, 0, 0.15);
    white-space: pre; /* preserve multiple spaces in date strings */
  }
  @media print { .cvp { background: transparent; } }
</style>
</head>
<body>
  <div class="bg"></div>
${fieldDivs}
</body>
</html>
`;
  fs.writeFileSync(HTML_PATH, html);
  console.log('Wrote', HTML_PATH, '(' + (html.length / 1024).toFixed(1) + ' KB), fields:', FIELDS.length);
  return html;
}

async function fillData(win) {
  await win.webContents.executeJavaScript(`
    (function(){
      const data = ${JSON.stringify(SAMPLE)};
      Object.keys(data).forEach(k => {
        const el = document.querySelector('.cvp.' + k);
        if (el) el.textContent = data[k];
      });
    })();
  `);
}

async function injectDebugOverlay(win) {
  await win.webContents.executeJavaScript(`
    (function(){
      const grid = document.createElement('div');
      grid.style.cssText = 'position:absolute;inset:0;width:210mm;height:297mm;z-index:5;pointer-events:none;';
      grid.style.backgroundImage =
        'repeating-linear-gradient(to right, rgba(0,100,255,0.25) 0 0.2mm, transparent 0.2mm 10mm),' +
        'repeating-linear-gradient(to bottom, rgba(0,100,255,0.25) 0 0.2mm, transparent 0.2mm 10mm)';
      document.body.appendChild(grid);
      for (let x = 0; x <= 200; x += 10) {
        const t = document.createElement('div');
        t.style.cssText = 'position:absolute;top:0;left:'+x+'mm;font-size:7pt;color:blue;z-index:6;background:rgba(255,255,255,0.7);padding:0 1px;';
        t.textContent = x;
        document.body.appendChild(t);
      }
      for (let y = 0; y <= 290; y += 10) {
        const t = document.createElement('div');
        t.style.cssText = 'position:absolute;top:'+y+'mm;left:0;font-size:7pt;color:blue;z-index:6;background:rgba(255,255,255,0.7);padding:0 1px;';
        t.textContent = y;
        document.body.appendChild(t);
      }
      document.querySelectorAll('.cvp').forEach(el => {
        const key = [...el.classList].find(c => c !== 'cvp');
        if (key) {
          const tag = document.createElement('div');
          tag.style.cssText = 'position:absolute;top:-3.5mm;left:0;font-size:6pt;color:red;background:rgba(255,255,255,0.85);padding:0 1px;white-space:nowrap;';
          tag.textContent = key;
          el.appendChild(tag);
        }
      });
    })();
  `);
}

async function renderPdf(win, withBg) {
  if (withBg) {
    await win.webContents.executeJavaScript(`
      (function(){
        const s = document.createElement('style');
        s.id = 'force-bg';
        s.textContent = '@media print { .bg { display: block !important; } }';
        document.head.appendChild(s);
      })();
    `);
  } else {
    await win.webContents.executeJavaScript(`document.getElementById('force-bg')?.remove();`);
  }
  await new Promise(r => setTimeout(r, 200));
  return win.webContents.printToPDF({
    pageSize: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });
}

// Render a PDF page to PNG using pdfjs in a hidden BrowserWindow (clean, no viewer chrome).
async function pdfToPng(pdfPath, pngPath, targetWidth = 1240) {
  const pdfB64 = fs.readFileSync(pdfPath).toString('base64');
  const win = new BrowserWindow({
    width: targetWidth,
    height: Math.round(targetWidth * 1.414),
    show: false,
    webPreferences: { contextIsolation: false, sandbox: false },
  });
  const html = `<!DOCTYPE html><html><head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    <style>body{margin:0;background:white;}</style>
    </head><body>
    <canvas id="c"></canvas>
    <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const PDF_B64 = ${JSON.stringify(pdfB64)};
    function b64ToBytes(b) {
      const bin = atob(b);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }
    async function go() {
      const pdf = await pdfjsLib.getDocument({ data: b64ToBytes(PDF_B64) }).promise;
      const page = await pdf.getPage(1);
      const baseVp = page.getViewport({ scale: 1 });
      const scale = ${targetWidth} / baseVp.width;
      const vp = page.getViewport({ scale });
      const canvas = document.getElementById('c');
      canvas.width = vp.width;
      canvas.height = vp.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      window.__pngBase64 = canvas.toDataURL('image/png').split(',')[1];
      document.title = 'PDFJS_DONE';
    }
    go().catch(e => { document.title = 'PDFJS_ERR:' + e.message; });
    </script></body></html>`;
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 500));
    const t = win.webContents.getTitle();
    if (t === 'PDFJS_DONE') break;
    if (t.startsWith('PDFJS_ERR')) { win.close(); throw new Error(t); }
  }
  const b64 = await win.webContents.executeJavaScript('window.__pngBase64');
  win.close();
  if (!b64) throw new Error('pdfjs render produced no output (timeout?)');
  fs.writeFileSync(pngPath, Buffer.from(b64, 'base64'));
}

function cropBoxes(srcPng) {
  const img = nativeImage.createFromPath(srcPng);
  const sz = img.getSize();
  const sections = [
    { key: 'box1', x: 0.05, y: 0.04, w: 0.45, h: 0.20 },
    { key: 'box2', x: 0.45, y: 0.04, w: 0.55, h: 0.22 },
    { key: 'box3', x: 0.05, y: 0.20, w: 0.45, h: 0.20 },
    { key: 'box4', x: 0.45, y: 0.20, w: 0.55, h: 0.22 },
  ];
  for (const s of sections) {
    const cropped = img.crop({
      x: Math.round(sz.width * s.x),
      y: Math.round(sz.height * s.y),
      width: Math.round(sz.width * s.w),
      height: Math.round(sz.height * s.h),
    });
    fs.writeFileSync(path.join(OUT, `with-bg-${s.key}.png`), cropped.toPNG());
  }
}

app.whenReady().then(async () => {
  try {
    const html = buildHtml();

    const win = new BrowserWindow({
      width: 1240,
      height: 1754,
      show: false,
      webPreferences: { contextIsolation: false, sandbox: false },
    });
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    await fillData(win);
    await new Promise(r => setTimeout(r, 200));

    // 1. Production print.pdf (no bg)
    const printPdfPath = path.join(OUT, 'print.pdf');
    fs.writeFileSync(printPdfPath, await renderPdf(win, false));
    console.log('Wrote', printPdfPath);

    // 2. Alignment-check with-bg.pdf
    const withBgPdfPath = path.join(OUT, 'with-bg.pdf');
    fs.writeFileSync(withBgPdfPath, await renderPdf(win, true));
    console.log('Wrote', withBgPdfPath);

    // 3. Debug preview PNG (bg + 10mm grid + key tags)
    await injectDebugOverlay(win);
    await new Promise(r => setTimeout(r, 200));
    const previewPath = path.join(OUT, 'preview.png');
    fs.writeFileSync(previewPath, (await win.webContents.capturePage()).toPNG());
    console.log('Wrote', previewPath);
    win.close();

    // 4. Convert PDFs back to PNG (clean, no viewer chrome)
    await pdfToPng(printPdfPath, path.join(OUT, 'print.png'));
    console.log('Wrote', path.join(OUT, 'print.png'));
    const withBgPng = path.join(OUT, 'with-bg.png');
    await pdfToPng(withBgPdfPath, withBgPng);
    console.log('Wrote', withBgPng);

    // 5. Zoomed crops of the 4 form boxes for visual review
    cropBoxes(withBgPng);
    console.log('Wrote with-bg-box{1..4}.png');

    console.log('\nAll outputs in', OUT);
  } catch (err) {
    console.error('ERROR:', err);
    app.exit(1);
    return;
  }
  app.quit();
});
