/**
 * Module functions extracted from manager.ts. Each takes the MebbisManager
 * instance as first argument (`m`) so callers go through m.x for shared state.
 */

import { BrowserWindow, dialog, session, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { Account } from '../storage/account-store';
import { getStudentDb } from '../storage/student-db';
import { getPersonnelDb, PersonnelDetailData } from '../storage/personnel-db';
import { fetchEncryptedTemplate } from '../templates/template-fetcher';
import { getRequestLogger } from '../utils/request-logger';
import { pushList, pushDetail } from '../sync/student-sync';
import { pushPersonnelList, pushPersonnelDetail } from '../sync/personnel-sync';
import { fetchKurumInfo } from '../sync/kurum-info-sync';
import { fetchCars, updateCarRoute } from '../sync/car-sync';
import { getCodeLoader } from '../../launcher/remote-code-loader';
import type { MebbisManager } from './manager';

export function fetchSimulatorTemplate(m: MebbisManager, templateName: string): Promise<string> {
    // EK4 lives under ek4/, everything else under simulator/.
    // The encrypted-templates endpoint validates the path itself.
    const relPath = templateName.startsWith('ek4/')
      ? templateName
      : `simulator/${templateName}`;
    return fetchEncryptedTemplate(relPath);
}

export async function generatePdfFromHtml(m: MebbisManager, html: string): Promise<Buffer> {
    const pdfWin = new BrowserWindow({
      width: 794,
      height: 1123,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    const pdfBuffer = await pdfWin.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    pdfWin.close();
    return Buffer.from(pdfBuffer);
}

export async function generatePdfFromTemplate(m: MebbisManager, studentInfo: { 'ad-soyad': string; 'tc-kimlik-no': string; 'istenen-sertifika': string },     lessons: string[][],     sinif?: string): Promise<Buffer> {
    // Parse sinif selection: format is "FROM,TO|COUNT" e.g. "0,B|16"
    let selectedCount: number | null = null;
    let selectedClass: string | null = null;
    if (sinif) {
      const parts = sinif.split('|');
      if (parts.length === 2) {
        selectedCount = parseInt(parts[1], 10);
        const classParts = parts[0].split(',');
        selectedClass = classParts[1] || classParts[0];
      }
    }

    // Use selected count from dropdown, fallback to lesson count
    const lessonCount = selectedCount || lessons.length;
    const hasSimulator = lessons.some(l => {
      const text = l.join(' ');
      return text.includes('Simulatör') || text.includes('Direksiyon Eğitim Alanı');
    });

    // When using simulator-less template, remove simulator rows
    let filteredLessons = [...lessons];

    const supportedCounts = [4, 6, 7, 8, 9, 10, 12, 14, 16, 20, 22];
    let closestCount = 4;
    for (const count of supportedCounts) {
      if (lessonCount <= count) {
        closestCount = count;
        break;
      }
    }
    if (lessonCount > 22) closestCount = 22;

    // Determine template filename
    let templateName = `${closestCount}n.html`;
    if (hasSimulator && [12, 14, 16].includes(closestCount)) {
      templateName = `${closestCount}nsimli.html`;
    } else {
      // Non-simulator template: remove simulator/DEA rows from data
      filteredLessons = filteredLessons.filter(l => {
        const text = l.join(' ');
        return !text.includes('Simulatör') && !text.includes('Direksiyon Eğitim Alanı');
      });
    }

    // Take the LAST N lessons (most recent), not the first N
    if (filteredLessons.length > closestCount) {
      filteredLessons = filteredLessons.slice(-closestCount);
    }

    console.log(`[PDF] Fetching template: ${templateName} for ${lessonCount} lessons`);

    // Fetch template HTML from remote server
    let html: string;
    try {
      html = await m.fetchTemplate(templateName);
    } catch (err: any) {
      throw new Error(`Template indirilemedi: ${templateName} - ${err.message}`);
    }

    // Templates already have Chromium-compatible CSS baked in.
    // No runtime CSS injection needed — update templates on the server instead.

    // Use a hidden BrowserWindow to render and fill the template
    const pdfWin = new BrowserWindow({
      width: 794,
      height: 1123,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // Load the HTML template
    await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // Use selected class from dropdown, fallback to certificate string
    const vClass = selectedClass || (studentInfo['istenen-sertifika'] || 'B').split(' ')[0] || 'B';

    // Fill student info and lesson data via DOM manipulation
    await pdfWin.webContents.executeJavaScript(`
      (function() {
        // Fill student info
        const nameEl = document.querySelector('.name');
        if (nameEl) nameEl.textContent = ${JSON.stringify(studentInfo['ad-soyad'] || '')};

        const tcEl = document.querySelector('.tc');
        if (tcEl) tcEl.textContent = ${JSON.stringify(studentInfo['tc-kimlik-no'] || '')};

        const classEl = document.querySelector('.vClass');
        if (classEl) classEl.textContent = '${vClass}';

        // Fill lesson records
        const dates = document.querySelectorAll('.date');
        const plates = document.querySelectorAll('.plate');
        const trainers = document.querySelectorAll('.mTrainer');
        const lessons = ${JSON.stringify(filteredLessons)};

        dates.forEach((el, idx) => {
          if (lessons[idx]) {
            // Lesson date is typically at index 6, time at index 7
            const date = lessons[idx][6] || lessons[idx][0] || '';
            const time = lessons[idx][7] || lessons[idx][1] || '';
            el.innerHTML = '<span style="font-size:9px">' + date + '</span>';
            if (time) el.innerHTML += '<br><span style="font-size:7px">' + time + '</span>';
          }
        });

        plates.forEach((el, idx) => {
          if (lessons[idx]) {
            let plate = lessons[idx][4] || lessons[idx][2] || '';
            plate = plate.replace('(Manuel)', '').replace('(Otomatik)', '').trim();
            el.textContent = plate;
          }
        });

        trainers.forEach((el, idx) => {
          if (lessons[idx]) {
            el.textContent = lessons[idx][8] || lessons[idx][3] || '';
          }
        });
      })();
    `);

    // Distribute remaining vertical space as cell padding, but reserve 20mm for stamp area
    await pdfWin.webContents.executeJavaScript(`
      (function() {
        const bodyHeight = document.body.scrollHeight;
        const pageHeightPx = 297 * 96 / 25.4; // A4=297mm at 96dpi ~1123px
        const stampReservePx = 26 * 96 / 25.4; // 26mm reserved for stamp ~99px
        const remaining = pageHeightPx - bodyHeight - stampReservePx;
        if (remaining > 10) {
          const cells = document.querySelectorAll('table td, table th');
          if (cells.length > 0) {
            const rows = document.querySelectorAll('table tr');
            const extraPerRow = remaining / rows.length / 2; // top + bottom
            cells.forEach(function(cell) {
              const current = parseFloat(getComputedStyle(cell).paddingTop) || 1;
              cell.style.paddingTop = (current + extraPerRow) + 'px';
              cell.style.paddingBottom = (current + extraPerRow) + 'px';
            });
          }
        }
      })();
    `);

    // Print to PDF with zero margins for full-page output
    const pdfBuffer = await pdfWin.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
    });

    pdfWin.close();
    return Buffer.from(pdfBuffer);
}

export function extractSimulatorSessions(m: MebbisManager, lessons: string[][]): string[][] {
    return lessons.filter(lesson => {
      const dersYeri = lesson[5]?.trim() || '';
      return dersYeri.toLowerCase().includes('simulatör') || 
             dersYeri.toLowerCase().includes('direksiyon eğitim');
    });
}

export async function generateSimulatorReportPdf(m: MebbisManager, studentInfo: { 'ad-soyad': string; 'tc-kimlik-no': string; 'istenen-sertifika': string },     simulatorSessions: string[][],     simulationType: string,     account: Account,     parentWindow: BrowserWindow): Promise<string> {
    console.log(`[${account.label}] Generating ${simulationType} simulator report PDF...`);
    console.log(`[${account.label}] Sessions to include: ${simulatorSessions.length}`);

    // Always ask for folder — all files (sesim/anagrup + ek4) go into a subfolder
    const result = await dialog.showOpenDialog(parentWindow, {
      title: 'Simulatör Raporları - Klasör Seçin',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || !result.filePaths[0]) {
      throw new Error('Klasör seçilmedi');
    }

    const tc = studentInfo['tc-kimlik-no'] || '';
    const studentName = (studentInfo['ad-soyad'] || 'unknown')
      .replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9\s]/g, '')
      .replace(/\s+/g, '_');
    const safeLabel = account.label.replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9\s]/g, '').replace(/\s+/g, '_');
    const studentDir = path.join(result.filePaths[0], `${tc}_${studentName}_${safeLabel}`);
    if (!fs.existsSync(studentDir)) fs.mkdirSync(studentDir, { recursive: true });

    const record = simulatorSessions[0];
    const recordo = simulatorSessions.length >= 2 ? simulatorSessions[1] : null;
    const instructorName = record?.[8] || 'Bilinmeyen';
    const date1 = record?.[6] || '';
    const time1 = record?.[7] || '';
    const donem = record?.[0] || '';
    const date2 = recordo?.[6] || '';
    const time2 = recordo?.[7] || '';
    const isDual = recordo !== null;

    if (simulationType === 'sesim' || simulationType === 'both') {
      const htmlContent = await m.generateSesimHtml(studentInfo, simulatorSessions, account.label);
      const pdfBuffer = await m.generatePdfFromHtml(htmlContent);
      fs.writeFileSync(path.join(studentDir, 'sesim.pdf'), pdfBuffer);
      console.log(`[${account.label}] Saved sesim.pdf`);
    }

    if (simulationType === 'ana_grup' || simulationType === 'both') {
      const scenarios = m.getAnagrupScenarios();
      const baseTemplate = await m.fetchSimulatorTemplate('anagrup/anagrup.html');

      for (let i = 0; i < scenarios.length; i++) {
        const scenario = scenarios[i];
        console.log(`[${account.label}] Generating anagrup PDF ${i + 1}/${scenarios.length}: ${scenario}`);

        const html = m.generateAnagrupHtml(baseTemplate, {
          studentName: studentInfo['ad-soyad'],
          instructorName,
          date1, time1, date2, time2, donem,
          scenario,
          accountLabel: account.label,
          isDual,
        });

        const scenarioPdf = await m.generatePdfFromHtml(html);
        const safeScenarioName = scenario.replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9 ]/g, '').trim();
        fs.writeFileSync(path.join(studentDir, `${i + 1}_${safeScenarioName}.pdf`), scenarioPdf);
      }
    }

    // Always generate EK4 alongside simulator reports
    const ek4Html = await m.generateEk4Html(
      studentInfo['ad-soyad'],
      record?.[4] || '',  // plaka (araç plakası col 4)
      instructorName,
      account.label,
      date1,               // tarih (ders tarihi)
    );
    const ek4Pdf = await m.generatePdfFromHtml(ek4Html);
    fs.writeFileSync(path.join(studentDir, 'ek4.pdf'), ek4Pdf);
    console.log(`[${account.label}] Saved ek4.pdf`);

    m.logPdf(account, 'simulator_raporu', 1);

    return studentDir;
}

export async function generateSesimHtml(m: MebbisManager, studentInfo: any,     sessions: string[][],     accountLabel: string): Promise<string> {
    const templateContent = await m.fetchSimulatorTemplate('sesim/sesim.html');
    let html = templateContent;

    // sessions are already sorted desc and sliced to max 2
    // PHP: record=$tablobilgi[0] (newest), recordo=$tablobilgi[1] (older)
    // But PHP passes OLDER first to sesimkaydet2: rows 1-8 = older, rows 9-16 = newer
    const newestSession = sessions[0]; // most recent
    const olderSession = sessions.length >= 2 ? sessions[1] : null; // older
    if (!newestSession) throw new Error('No simulator sessions found');

    const studentName = studentInfo['ad-soyad'] || '';
    const instructorName = newestSession[8] || 'Bilinmeyen';
    const isDual = olderSession !== null;

    // Parse start times: col[7] = "HH:MM - HH:MM"
    const parseStartTime = (timeStr: string): Date => {
      const cleaned = timeStr.replace(/\s/g, '');
      const startPart = cleaned.split('-')[0]; // "HH:MM"
      const [h, m] = startPart.split(':').map(Number);
      const d = new Date(2000, 0, 1, h, m, 0);
      return d;
    };

    const formatTime = (d: Date): string => {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    };

    const addMinutes = (d: Date, mins: number): Date => {
      return new Date(d.getTime() + mins * 60000);
    };

    // PHP: rows 1-8 use OLDER session (recordo), rows 9-16 use NEWER (record)
    // For single session, just use the one session for everything
    const firstSession = isDual ? olderSession! : newestSession;
    const secondSession = isDual ? newestSession : newestSession;

    const date1 = firstSession[6] || '';
    const time1 = firstSession[7] || '';
    const saataralik1 = time1;
    let startTime1 = parseStartTime(time1);

    let egitimsuresi: string;

    if (isDual) {
      const date2 = secondSession[6] || '';
      const time2 = secondSession[7] || '';
      const saataralik2 = time2;
      // PHP: "$egitimtarih $saataralik /  $egitimtarih2 $saataralik2"
      // egitimtarih = older date, egitimtarih2 = newer date
      egitimsuresi = `${date1} ${saataralik1} /  ${date2} ${saataralik2}`;
    } else {
      // PHP: "$egitimtarih $saataralik / $saatss - $saatss2"
      const saatss = addMinutes(startTime1, 60);
      const saatss2 = addMinutes(startTime1, 110);
      const formatHM = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      egitimsuresi = `${date1} ${saataralik1} / ${formatHM(saatss)} - ${formatHM(saatss2)}`;
    }

    // Fill template header fields — only replace inner text, preserve original tag attributes/styles
    html = html.replace(/(<span[^>]*class="kursiyer"[^>]*>)[^<]*(<\/span>)/i, `$1${studentName}$2`);
    html = html.replace(/(<span[^>]*class="egitmen"[^>]*>)[^<]*(<\/span>)/i, `$1${instructorName}$2`);
    html = html.replace(/(<span[^>]*class="egitimsuresi"[^>]*>)[^<]*(<\/span>)/i, `$1${egitimsuresi}$2`);

    // Generate 16 timing rows (matching PHP sesimkaydet / sesimkaydet2)
    let chartHtml = '';
    let currentTime = new Date(startTime1.getTime()); // starts with first session (older for dual)

    // For dual: second session start time (newer session)
    let startTime2: Date | null = null;
    let date2ForChart = date1;
    if (isDual) {
      startTime2 = parseStartTime(secondSession[7] || '');
      date2ForChart = secondSession[6] || '';
    }

    let currentDate = date1;

    for (let i = 0; i < 16; i++) {
      let duration = '00:06';

      if (i === 8) {
        if (isDual && startTime2) {
          // Dual: switch to session 2's start time and date
          currentTime = new Date(startTime2.getTime());
          currentDate = date2ForChart;
        } else {
          // Single: +18 minute break gap
          currentTime = addMinutes(currentTime, 18);
        }
      }

      const rowStart = formatTime(currentTime);
      let rowEnd: string;

      if (i === 7 || i === 15) {
        // Rows 8 and 16 are 8 minutes
        rowEnd = formatTime(addMinutes(currentTime, 8));
        duration = '00:08';
      } else {
        rowEnd = formatTime(addMinutes(currentTime, 6));
      }

      const score = Math.floor(Math.random() * 21) + 80; // 80-100

      chartHtml += `
              <tr>
                <td>${i + 1}</td>
                <td>${currentDate}</td>
                <td>${rowStart}</td>
                <td>${rowEnd}</td>
                <td>${duration}</td>
                <td>${isDual ? (i + 1) : 1}</td>
                <td>${score}</td>
              </tr>`;

      // Advance time for next row (skip for row 7, the break handles it at i===8)
      if (i !== 7) {
        currentTime = addMinutes(currentTime, 6);
      }
    }

    html = html.replace(/<tbody class="cizelgetr">[\s\S]*?<\/tbody>/i, `<tbody class="cizelgetr">${chartHtml}</tbody>`);

    return html;
}

export function generateAnagrupHtml(m: MebbisManager, baseTemplate: string,     data: {       studentName: string; instructorName: string;       date1: string; time1: string; date2: string; time2: string;       donem: string; scenario: string; accountLabel: string; isDual: boolean;     }): string {
    let html = baseTemplate;

    // Fill fields — only replace inner text, preserve original tag attributes/styles
    html = html.replace(/(<span[^>]*class="kursiyer"[^>]*>)[^<]*(<\/span>)/i, `$1${data.studentName}$2`);
    html = html.replace(/(<span[^>]*class="egitmen"[^>]*>)[^<]*(<\/span>)/i, `$1${data.instructorName}$2`);
    html = html.replace(/(<span[^>]*class="baslik"[^>]*>)[^<]*(<\/span>)/i, `$1${data.scenario}$2`);
    html = html.replace(/(<span[^>]*class="tarih"[^>]*>)[^<]*(<\/span>)/i, `$1${data.date1}$2`);
    html = html.replace(/(<span[^>]*class="donem"[^>]*>)[^<]*(<\/span>)/i, `$1${data.donem}$2`);

    // Fill egitimsuresi: tekli vs ikili (matching PHP anagrup logic)
    let egitimsuresi: string;
    if (data.isDual) {
      egitimsuresi = `${data.date1} ${data.time1} <br> ${data.date2} ${data.time2}`;
    } else {
      egitimsuresi = `${data.date1} ${data.time1}`;
    }
    html = html.replace(/(<span[^>]*class="egitimsuresi"[^>]*>)[^<]*(<\/span>)/i, `$1${egitimsuresi}$2`);

    // Fill company name
    html = html.replace(/(<span[^>]*class="sirketismi"[^>]*>)[^<]*/i, `$1${data.accountLabel}`);

    // Fill .adet elements with random 0/1 and calculate score (matching PHP anagrup logic)
    // PHP: if rand(0,100) > 85 && puan > 80 → "1" and puan -= 4, else "0"
    let puan = 100;
    html = html.replace(/class="adet"[^>]*>[^<]*/gi, (match) => {
      const r = Math.floor(Math.random() * 101);
      if (r > 85 && puan > 80) {
        puan -= 4;
        return match.replace(/>[^<]*$/, '>1');
      }
      return match.replace(/>[^<]*$/, '>0');
    });

    // Fill score with calculated value
    html = html.replace(/(<span[^>]*class="puan"[^>]*>)[^<]*(<\/span>)/i, `$1${puan}$2`);

    // Fill havadurumu with random weather (matching PHP)
    const weatherOptions = ["Sisli Hava", "Yağmurlu Hava", "Güneşli Hava"];
    const weather = weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
    html = html.replace(/(<span[^>]*class="havadurumu"[^>]*>)[^<]*(<\/span>)/i, `$1${weather}$2`);

    return html;
}

export function getAnagrupScenarios(m: MebbisManager): string[] {
    return [
      "ALGI VE REFLEKS SİMÜLASYONU",
      "DEĞİŞİK HAVA KOŞULLARI SİMÜLASYONU",
      "DİREKSİYON EĞİTİM ALANI SİMÜLASYONU",
      "GECE, GÜNDÜZ SİSLİ HAVA SİMÜLASYONU",
      "İNİŞ ÇIKIŞ EĞİMLİ YOL SİMÜLASYONU",
      "PARK EĞİTİMİ SİMÜLASYONU",
      "ŞEHİR İÇİ YOL SİMÜLASYONU",
      "ŞEHİRLER ARASI YOL SİMÜLASYONU",
      "TRAFİK İŞARETLERİ SİMÜLASYONU",
      "TRAFİK ORTAMI SİMÜLASYONU",
      "VİRAJLI YOLDA SÜRÜŞ SİMÜLASYONU",
    ];
}

export function fetchTemplate(m: MebbisManager, templateName: string): Promise<string> {
    return fetchEncryptedTemplate(`direksiyon-takip/${templateName}`);
}

export async function generateKBelgesiPdf(m: MebbisManager, data: Record<string, string>, parentWin: BrowserWindow): Promise<void> {
    let html: string;
    try {
      html = await fetchEncryptedTemplate('k-belgesi/k-belgesi.html');
    } catch (e: any) {
      console.error('[K-Belgesi] Failed to fetch template:', e?.message ?? e);
      return;
    }

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
  var data = ${JSON.stringify(data)};
  Object.keys(data).forEach(function(k){
    var el = document.querySelector('.cvp.' + k);
    if (el) el.textContent = data[k];
  });
  document.getElementById('kb-cancel').onclick = function(){ document.title = 'KB_CLOSE'; };
  document.getElementById('kb-print').onclick = function(){ document.title = 'KB_PRINT'; };
})();</script>`;

    const mergedHtml = html.replace('</body>', previewChrome + '</body>');

    const previewWin = new BrowserWindow({
      parent: parentWin,
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
            if (!success) console.warn('[K-Belgesi] Print failed:', failureReason);
            if (!previewWin.isDestroyed()) previewWin.close();
          },
        );
      } else if (title === 'KB_CLOSE') {
        previewWin.close();
      }
    });
}
