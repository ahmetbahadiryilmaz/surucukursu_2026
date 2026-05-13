/**
 * Dev test PDF generators — produce direksiyon takip / K Belgesi / simulator
 * report PDFs from fake data. Wired into the IS_DEV-only test menu in
 * app-controller; never called from production code paths.
 *
 * Each function is a standalone helper that takes the MebbisManager instance
 * for access to the real PDF rendering pipeline (generatePdfFromTemplate,
 * generateSimulatorReportPdf).
 */

import { BrowserWindow, dialog, shell } from 'electron';
import * as fs from 'fs';
import { Account } from '../storage/account-store';
import { fetchEncryptedTemplate } from '../templates/template-fetcher';
import type { MebbisManager } from '../mebbis/manager';

/**
 * Generate a Direksiyon Takip PDF with entirely fake/test data.
 * Asks the user where to save and then opens the file.
 */
export async function generateTestDireksiyonPdf(
  m: MebbisManager,
  sinif: string,
  mainWindow: BrowserWindow,
): Promise<void> {
  const fakeStudentInfo = {
    'ad-soyad': 'TEST ADAY AHMET YILMAZ',
    'tc-kimlik-no': '12345678901',
    'istenen-sertifika': 'B SINIFI SERTİFİKA (Manuel)',
  };

  const fakeLessons: string[][] = [];
  const plates = ['34 TEST 001', '34 TEST 002', '34 TEST 003'];
  const dates = [
    '05.02.2025', '12.02.2025', '19.02.2025', '26.02.2025',
    '05.03.2025', '12.03.2025', '19.03.2025', '26.03.2025',
    '02.04.2025', '09.04.2025', '16.04.2025', '23.04.2025',
    '30.04.2025', '07.05.2025', '14.05.2025', '21.05.2025',
    '28.05.2025', '04.06.2025', '11.06.2025', '18.06.2025',
  ];
  const times = ['09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '14:00 - 15:00'];
  const instructor = 'TEST EĞİTMEN ALİ DEMİR';

  const noSimForce = sinif.endsWith('-nosim');
  const sinifClean = noSimForce ? sinif.slice(0, -'-nosim'.length) : sinif;

  let lessonCount = 16;
  const sinifParts = sinifClean.split('|');
  if (sinifParts.length === 2) {
    const n = parseInt(sinifParts[1], 10);
    if (!isNaN(n) && n > 0) lessonCount = n;
  }

  const isYeni = sinifClean.startsWith('0,');
  const needsSimulator = !noSimForce && isYeni && (lessonCount === 14 || lessonCount === 16);
  let simulatorInserted = false;

  for (let i = 0; i < lessonCount; i++) {
    const isSimRow = needsSimulator && !simulatorInserted && i === Math.floor(lessonCount / 2);
    if (isSimRow) simulatorInserted = true;

    const row: string[] = new Array(10).fill('');
    row[0] = '2025/1. DÖNEM';
    row[4] = isSimRow ? '34 TEST SIM' : plates[i % plates.length];
    row[5] = isSimRow ? 'Simulatör' : 'Trafik';
    row[6] = dates[i % dates.length];
    row[7] = times[i % times.length];
    row[8] = instructor;
    fakeLessons.push(row);
  }

  const saveResult = await dialog.showSaveDialog(mainWindow, {
    title: 'Test Direksiyon Takip PDF — Kaydet',
    defaultPath: `test_direksiyon_takip_${sinif.replace(/[|,]/g, '_')}.pdf`,
    filters: [{ name: 'PDF Dosyası', extensions: ['pdf'] }],
  });

  if (saveResult.canceled || !saveResult.filePath) return;

  console.log('[DEV TEST] Generating Direksiyon Takip PDF with fake data, sinif:', sinif);
  const pdfBuffer = await m.generatePdfFromTemplate(fakeStudentInfo, fakeLessons, sinifClean);
  fs.writeFileSync(saveResult.filePath, pdfBuffer);
  console.log('[DEV TEST] Saved to:', saveResult.filePath);
  await shell.openPath(saveResult.filePath);
}

/**
 * Open a K-Sınıfı Sürücü Aday Belgesi preview window with random fake data,
 * then send it directly to the printer with locked settings (A4, marginType
 * 'none', 100% scale, printBackground).
 */
export async function generateTestKBelgesiPdf(
  _m: MebbisManager,
  mainWindow: BrowserWindow,
  withBackground = false,
): Promise<void> {
  const html = await fetchEncryptedTemplate('k-belgesi/k-belgesi.html');

  const pickAdiPool = ['AHMET', 'MEHMET', 'ALİ', 'AYŞE', 'FATMA', 'ZEYNEP', 'MUSTAFA', 'EMRE', 'ELİF', 'CAN'];
  const pickSoyadPool = ['YILMAZ', 'KAYA', 'DEMİR', 'ÇELİK', 'ŞAHİN', 'ÖZTÜRK', 'AYDIN', 'ARSLAN', 'DOĞAN', 'KILIÇ'];
  const pickIlPool = ['Ankara', 'İstanbul', 'İzmir', 'Bursa', 'Konya', 'Antalya', 'Eskişehir', 'Adana'];
  const pickIlce: Record<string, string> = {
    'Ankara': 'Çankaya', 'İstanbul': 'Kadıköy', 'İzmir': 'Bornova', 'Bursa': 'Nilüfer',
    'Konya': 'Selçuklu', 'Antalya': 'Muratpaşa', 'Eskişehir': 'Tepebaşı', 'Adana': 'Seyhan',
  };
  const rand = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
  const randomTc = () => '1' + Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
  const today = new Date();
  const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const fmtDateSpaced = (d: Date) => `${String(d.getDate()).padStart(2, '0')}    ${String(d.getMonth() + 1).padStart(2, '0')}    ${d.getFullYear()}`;
  const addMonths = (d: Date, n: number) => { const c = new Date(d); c.setMonth(c.getMonth() + n); return c; };
  const adayIl = rand(pickIlPool);
  const ustaIl = rand(pickIlPool);
  const dogumYear = 1990 + Math.floor(Math.random() * 16);
  const dogumDate = new Date(dogumYear, Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28));

  const sample = {
    aracCinsi: 'Otomobil',
    gurzergah: 'Mahalle içi - Şehir merkezi',
    gunSaat: 'Pzt-Cu 09:00-17:00',
    duzenlenmeTarihi: fmtDateSpaced(today),
    gecerlikBitisi: fmtDateSpaced(addMonths(today, 6)),
    mudurAd: rand(pickAdiPool) + ' ' + rand(pickSoyadPool),
    iliIlcesi: `${adayIl.toUpperCase()} / ${pickIlce[adayIl] || 'Merkez'}`,
    kursAdi: 'TEST',
    belgeNo: '2026-' + String(Math.floor(Math.random() * 999) + 1).padStart(3, '0'),
    belgeTarihi: fmtDate(today),
    kursAdresi: 'Test Mah. Test Sok. No:' + (Math.floor(Math.random() * 99) + 1) + ' ' + adayIl,
    adayTc: randomTc(),
    adayAd: rand(pickAdiPool),
    adaySoyad: rand(pickSoyadPool),
    adayBabaAd: rand(pickAdiPool),
    adayDogumYeri: adayIl,
    adayDogumTarihi: fmtDate(dogumDate),
    adayAdresi: `Aday Mah. No:${Math.floor(Math.random() * 99) + 1} ${pickIlce[adayIl] || 'Merkez'}/${adayIl}`,
    ustaTc: randomTc(),
    ustaAd: rand(pickAdiPool),
    ustaSoyad: rand(pickSoyadPool),
    ustaAdresi: `Eğitmen Mah. No:${Math.floor(Math.random() * 99) + 1} ${ustaIl}`,
    ustaBelgeSinifi: rand(['B', 'C', 'D', 'CE']),
    ustaBelgeNo: Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join(''),
    ustaBelgeYeri: ustaIl,
  };

  const previewChrome = `<style id="kb-preview-chrome">
  @media screen {
    body { background: #e5e7eb !important; }
    #kb-toolbar { position: fixed; top: 12px; right: 12px; background: #1f2937; color: white; padding: 8px 12px; border-radius: 6px; display: flex; gap: 8px; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 999999; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 13px; }
    #kb-toolbar .label { margin-right: 6px; opacity: 0.85; }
    #kb-toolbar button { padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 13px; font-family: inherit; }
    #kb-cancel { border: 1px solid #6b7280; background: transparent; color: white; }
    #kb-cancel:hover { background: rgba(255,255,255,0.08); }
    #kb-print { border: none; background: #3b82f6; color: white; font-weight: 600; }
    #kb-print:hover { background: #2563eb; }
  }
  @media print { #kb-toolbar { display: none !important; } }
</style>
<div id="kb-toolbar">
  <span class="label">A4 · 100% · kenarlıksız</span>
  <button id="kb-cancel">İptal</button>
  <button id="kb-print">Yazdır</button>
</div>
<script>(function(){
  var data = ${JSON.stringify(sample)};
  Object.keys(data).forEach(function(k){
    var el = document.querySelector('.cvp.' + k);
    if (el) el.textContent = data[k];
  });
  ${withBackground ? `
  var s = document.createElement('style');
  s.textContent = '@media print { .bg { display: block !important; } }';
  document.head.appendChild(s);
  ` : ''}
  document.getElementById('kb-cancel').onclick = function(){ document.title = 'KB_CLOSE'; };
  document.getElementById('kb-print').onclick = function(){ document.title = 'KB_PRINT'; };
})();</script>`;
  const mergedHtml = html.replace('</body>', previewChrome + '</body>');

  console.log('[DEV TEST] Opening K Belgesi preview, aday:', sample.adayAd, sample.adaySoyad);

  const previewWin = new BrowserWindow({
    parent: mainWindow,
    width: 900,
    height: 1180,
    title: 'K Belgesi — Önizleme',
    autoHideMenuBar: true,
    webPreferences: { sandbox: false, contextIsolation: false },
  });

  await previewWin.loadURL('about:blank');
  await previewWin.webContents.executeJavaScript(
    `document.open(); document.write(${JSON.stringify(mergedHtml)}); document.close();`,
  );

  let printing = false;
  previewWin.webContents.on('page-title-updated', (_event, title) => {
    if (previewWin.isDestroyed()) return;
    if (title === 'KB_PRINT' && !printing) {
      printing = true;
      previewWin.webContents.print(
        {
          silent: false,
          printBackground: true,
          margins: { marginType: 'none' },
          pageSize: 'A4',
          scaleFactor: 100,
        },
        (success, failureReason) => {
          if (!success) {
            console.warn('[DEV TEST] K Belgesi print:', failureReason);
          }
          if (!previewWin.isDestroyed()) previewWin.close();
        },
      );
    } else if (title === 'KB_CLOSE') {
      previewWin.close();
    }
  });
}

/**
 * Generate Simulator Report PDFs with entirely fake/test data.
 * Delegates to the existing generateSimulatorReportPdf with a fake account.
 */
export async function generateTestSimulatorPdf(
  m: MebbisManager,
  simType: string,
  mainWindow: BrowserWindow,
): Promise<void> {
  const fakeStudentInfo = {
    'ad-soyad': 'TEST ADAY AHMET YILMAZ',
    'tc-kimlik-no': '12345678901',
    'istenen-sertifika': 'B SINIFI SERTİFİKA (Manuel)',
  };

  const fakeSimulatorSessions: string[][] = [
    ['2025/1. DÖNEM', '', '', '', '34 TEST SIM', 'Simulatör', '15.03.2025', '10:00 - 11:00', 'TEST EĞİTMEN ALİ DEMİR', ''],
    ['2025/1. DÖNEM', '', '', '', '34 TEST SIM', 'Simulatör', '22.03.2025', '14:00 - 15:00', 'TEST EĞİTMEN ALİ DEMİR', ''],
  ];

  const fakeAccount: Account = {
    id: 'dev-test',
    username: 'test_mebbis_user',
    password: 'test_password',
    label: 'TEST OKUL',
    isRunning: false,
    createdAt: new Date().toISOString(),
    simulatorType: 'sesim',
    subscriptionActive: true,
  };

  console.log('[DEV TEST] Generating Simulator Report PDF(s) with fake data, simType:', simType);
  const outputDir = await m.generateSimulatorReportPdf(
    fakeStudentInfo,
    fakeSimulatorSessions,
    simType,
    fakeAccount,
    mainWindow,
  );
  console.log('[DEV TEST] Simulator PDFs saved to:', outputDir);
  await shell.openPath(outputDir);
}
