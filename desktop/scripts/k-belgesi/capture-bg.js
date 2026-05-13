// One-time setup: capture k-belgesi-bg.png from a source PDF using pdfjs
// inside Electron's Chromium. Re-run only when the source K-Belgesi form
// PDF changes.
//
// Usage:
//   ELECTRON_RUN_AS_NODE= ./node_modules/electron/dist/electron.exe \
//     scripts/k-belgesi/capture-bg.js <input.pdf> [width=1240]
//
// Output is written to backend/storage/templates/k-belgesi/k-belgesi-bg.png.
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(process.argv.findIndex(a => a.endsWith('capture-bg.js')) + 1);
const pdfPath = path.resolve(argv[0] || '');
const targetWidth = parseInt(argv[1] || '1240', 10);
const outPath = path.resolve(__dirname, '..', '..', '..', 'backend', 'storage', 'templates', 'k-belgesi', 'k-belgesi-bg.png');

if (!fs.existsSync(pdfPath)) { console.error('PDF not found:', pdfPath); process.exit(1); }
const pdfB64 = fs.readFileSync(pdfPath).toString('base64');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: targetWidth,
    height: Math.round(targetWidth * 1.414),
    show: false,
    webPreferences: { contextIsolation: false, sandbox: false },
  });

  const html = `<!DOCTYPE html><html><head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    <style>body{margin:0;background:white;}</style>
    </head><body><canvas id="c"></canvas><script>
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
      canvas.width = vp.width; canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
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
    if (t.startsWith('PDFJS_ERR')) { console.error(t); app.quit(); return; }
  }
  const b64 = await win.webContents.executeJavaScript('window.__pngBase64');
  if (!b64) { console.error('No PNG produced'); app.quit(); return; }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
  console.log('Saved:', outPath, '(' + fs.statSync(outPath).size + ' bytes)');
  app.quit();
});
