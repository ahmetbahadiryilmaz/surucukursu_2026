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
import { PERIOD_HELPERS_JS } from './constants';

export function trackBatchError(m: MebbisManager, errorMessage: string, studentTc: string) {
    if (!m.pendingBatchDownload) return;
    const key = errorMessage;
    const existing = m.pendingBatchDownload.errors.get(key);
    if (existing) {
      if (!existing.samples.includes(studentTc)) {
        existing.samples.push(studentTc);
      }
    } else {
      m.pendingBatchDownload.errors.set(key, { message: errorMessage, samples: [studentTc] });
    }

    // Track "data not found" errors separately for final message.
    // Only student data missing counts as bulunamadı — server-side issues
    // like "Şablon bulunamadı" are real errors and stay in `hatalı`.
    const isDataNotFound =
      errorMessage.includes('Simülatör dersi bulunamadı') ||
      errorMessage.includes('Ders programı bulunamadı');
    if (isDataNotFound) {
      m.pendingBatchDownload.notFound++;
    }
}

export function formatBatchErrorSummary(m: MebbisManager): string {
    if (!m.pendingBatchDownload || m.pendingBatchDownload.errors.size === 0) return '';

    const errorLines: string[] = [];
    for (const [message, data] of m.pendingBatchDownload.errors) {
      const sampleText = data.samples.length === 1
        ? `(TC: ${data.samples[0]})`
        : `(${data.samples.length} öğrenci, örnek: ${data.samples[0]})`;
      errorLines.push(`• ${message} ${sampleText}`);
    }
    return errorLines.join('\n');
}

export async function handleBatchDireksiyon(m: MebbisManager, account: Account, parentWin: BrowserWindow) {
    m.handleBatchGeneric('direksiyon', account, parentWin);
}

export async function handleBatchGeneric(m: MebbisManager, batchType: 'direksiyon' | 'simulator', account: Account, parentWin: BrowserWindow) {
    const labels: Record<string, string> = { direksiyon: 'Çoklu Direksiyon Takip', simulator: 'Çoklu Simülatör Raporu' };
    console.log(`[${account.label}] Starting batch ${batchType}...`);

    // Initialize batch state
    m.pendingBatchDownload = {
      batchType,
      options: { donemi: '', ogrenciDurumu: '0', onayDurumu: '4', grubu: '-1', subesi: '-1' },
      donemList: [],
      currentDonemIndex: 0,
      statusList: [],
      currentStatusIndex: 0,
      students: [],
      processedTcs: new Set<string>(),
      currentStudentIndex: 0,
      outputDir: '',
      account,
      parentWin,
      completed: 0,
      failed: 0,
      notFound: 0,
      statusMessage: 'Başlatılıyor...',
      errors: new Map(),
    };
    try { m.batchStateListener?.(true); } catch { /* ignore */ }

    const currentURL = parentWin.webContents.getURL().toLowerCase();

    if (currentURL.includes('skt02006')) {
      // Already on skt02006
      m.pendingDownloadPhase = 'batch-skt02006-options';
      m.handleSkt02006Options(parentWin, account);
    } else if (currentURL.includes('/skt/')) {
      // On an SKT page, navigate directly to skt02006
      m.pendingDownloadPhase = 'batch-skt02006-options';
      m.clickMenuItemForSkt02006(parentWin, account);
    } else {
      // On main page, first navigate to SKT module
      m.pendingDownloadPhase = 'batch-skt-module';
      const clicked = await parentWin.webContents.executeJavaScript(`
        (function() {
          const allTds = document.querySelectorAll('td');
          for (const td of allTds) {
            const onclick = td.getAttribute('onclick') || '';
            if (onclick.includes('skt00001')) {
              td.click();
              return true;
            }
          }
          const allTrs = document.querySelectorAll('tr');
          for (const tr of allTrs) {
            const onclick = tr.getAttribute('onclick') || '';
            if (onclick.includes('skt00001')) {
              tr.click();
              return true;
            }
          }
          return false;
        })();
      `).catch(() => false);

      if (!clicked) {
        console.log(`[${account.label}] Batch: SKT module not found`);
        m.clearPendingBatchDownload();
        m.pendingDownloadPhase = null;
      }
    }
}

export async function handleBatchStart(m: MebbisManager, options: { donemi: string; ogrenciDurumu: string; onayDurumu: string; grubu: string; subesi: string; simType?: string },     account: Account,     win: BrowserWindow) {
    if (!m.pendingBatchDownload) return;

    // Ask for output folder
    const folderResult = await dialog.showOpenDialog(win, {
      title: 'PDF Kayıt Klasörü Seçin',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (folderResult.canceled || !folderResult.filePaths[0]) {
      console.log(`[${account.label}] Batch: folder selection cancelled`);
      // Re-enable the start button
      win.webContents.executeJavaScript(`
        (function() {
          const btn = document.getElementById('batch-start-btn');
          if (btn) { btn.disabled = false; btn.textContent = 'Başlat'; btn.style.opacity = '1'; }
          const cancel = document.querySelector('#mebbis-batch-overlay button:first-child');
          if (cancel) cancel.disabled = false;
          const progress = document.getElementById('batch-progress');
          if (progress) progress.style.display = 'none';
        })();
      `).catch(() => {});
      return;
    }

    m.pendingBatchDownload.outputDir = folderResult.filePaths[0];
    m.pendingBatchDownload.options = options;
    m.pendingBatchDownload.students = [];
    m.pendingBatchDownload.processedTcs = new Set<string>();
    m.pendingBatchDownload.currentStudentIndex = 0;
    m.pendingBatchDownload.completed = 0;
    m.pendingBatchDownload.failed = 0;
    m.pendingBatchDownload.notFound = 0;
    m.pendingBatchDownload.errors = new Map();

    console.log(`[${account.label}] Batch: output dir=${folderResult.filePaths[0]}, options=`, options);

    // Check if "Hepsi" is selected for student status — loop through 3 relevant statuses
    const isHepsi = options.ogrenciDurumu === 'HEPSI';
    if (isHepsi) {
      m.pendingBatchDownload.statusList = [
        { value: '2', label: 'Uygulama Sınav Aşamasında' },
        { value: '5', label: 'Sertifika Almaya Hak Kazandı' },
        { value: '4', label: 'Uygulama Sınav Hakkı Doldu' },
      ];
      m.pendingBatchDownload.currentStatusIndex = 0;
      // Start with first status
      options.ogrenciDurumu = m.pendingBatchDownload.statusList[0].value;
      m.pendingBatchDownload.options.ogrenciDurumu = options.ogrenciDurumu;
      console.log(`[${account.label}] Batch: Hepsi selected, will loop through ${m.pendingBatchDownload.statusList.length} statuses`);
    } else {
      m.pendingBatchDownload.statusList = [];
      m.pendingBatchDownload.currentStatusIndex = 0;
    }

    // Check if the selected dönem is "Tüm Dönemler" by matching its label
    const selectedDonem = m.pendingBatchDownload.donemList.find(d => d.value === options.donemi);
    const isTumDonemler = selectedDonem?.label?.toLowerCase().includes('tüm') || false;

    if (isTumDonemler && m.pendingBatchDownload.donemList.length > 1) {
      // "Tüm Dönemler" selected — loop through each real period
      const realPeriods = m.pendingBatchDownload.donemList.filter(d => !d.label.toLowerCase().includes('tüm'));
      m.pendingBatchDownload.donemList = realPeriods;
      m.pendingBatchDownload.currentDonemIndex = 0;
      if (realPeriods.length === 0) {
        m.showBatchProgress(win, 'Hata: Dönem listesi boş!', '#ff4444');
        m.clearPendingBatchDownload();
        m.pendingDownloadPhase = null;
        return;
      }
      const firstDonem = realPeriods[0];
      m.showBatchProgress(win, `Dönem taranıyor: ${firstDonem.label} (1/${realPeriods.length})...`);
      m.pendingDownloadPhase = 'batch-skt02006-results';
      m.submitSkt02006Form(win, firstDonem.value, options);
    } else {
      // Single period selected
      m.pendingBatchDownload.donemList = []; // No looping
      m.showBatchProgress(win, 'Öğrenci listesi alınıyor...');
      m.pendingDownloadPhase = 'batch-skt02006-results';
      m.submitSkt02006Form(win, options.donemi, options);
    }
}

export async function handleBatchStudentNavigate(m: MebbisManager, win: BrowserWindow, account: Account) {
    if (!m.pendingBatchDownload) return;
    const { students, currentStudentIndex } = m.pendingBatchDownload;
    if (currentStudentIndex >= students.length) return;

    const student = students[currentStudentIndex];
    console.log(`[${account.label}] Batch: filling TC for ${student.name} (${student.tc}) [${currentStudentIndex + 1}/${students.length}]`);

    try {
      await win.webContents.executeJavaScript(`
        (function() {
          const tcInput = document.getElementById('txtTcKimlikNo');
          if (tcInput) {
            tcInput.value = '${student.tc}';
            tcInput.dispatchEvent(new Event('change', { bubbles: true }));
            tcInput.dispatchEvent(new Event('input', { bubbles: true }));
            setTimeout(() => {
              const searchBtn = document.getElementById('ImageButton1') ||
                               document.querySelector('input[id*="ImageButton"]') ||
                               document.querySelector('input[type="image"]');
              if (searchBtn) {
                searchBtn.click();
              } else {
                const form = tcInput.closest('form');
                if (form) form.submit();
              }
            }, 300);
          }
        })();
      `);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error(`[${account.label}] Batch: TC fill error for ${student.tc}:`, e);
      m.trackBatchError('TC giriş hatası', student.tc);
      m.pendingBatchDownload.failed++;
      m.batchProcessNextStudent(win, account);
    }
}

export async function handleBatchStudentResults(m: MebbisManager, win: BrowserWindow, account: Account) {
    if (!m.pendingBatchDownload) return;
    const { students, currentStudentIndex, outputDir } = m.pendingBatchDownload;
    if (currentStudentIndex >= students.length) return;

    const student = students[currentStudentIndex];
    const total = students.length;

    // Resolve the period the user picked in the batch dialog (e.g. "2026 - Mayıs").
    // If they left it as "Tüm Dönemler" we pass an empty string and the
    // in-page helper falls back to picking the chronologically newest period.
    const selectedDonemiValue = m.pendingBatchDownload.options?.donemi ?? '';
    const selectedDonemiLabelRaw =
      m.pendingBatchDownload.donemList?.find(d => d.value === selectedDonemiValue)?.label ?? '';
    const isAllPeriods = /tüm|tüm/i.test(selectedDonemiLabelRaw);
    const targetPeriodLabel = isAllPeriods ? '' : selectedDonemiLabelRaw;
    const targetPeriodJs = JSON.stringify(targetPeriodLabel);

    try {
      // Scrape lesson data (same logic as handleSkt02009Results)
      const lessonData = await win.webContents.executeJavaScript(`
        (function() {
          ${PERIOD_HELPERS_JS}
          const donemTable = document.getElementById('dgDonemBilgileri');
          const studentInfo = { 'ad-soyad': '', 'tc-kimlik-no': '${student.tc}', 'istenen-sertifika': '' };
          if (donemTable) {
            const dataRows = donemTable.querySelectorAll('tr:not(.frmListBaslik)');
            if (dataRows.length > 0) {
              const lastRow = dataRows[dataRows.length - 1];
              const cells = lastRow.querySelectorAll('td');
              if (cells.length >= 8) {
                studentInfo['tc-kimlik-no'] = cells[0].textContent.trim() || '${student.tc}';
                studentInfo['ad-soyad'] = cells[1].textContent.trim();
                studentInfo['istenen-sertifika'] = cells[7].textContent.trim();
              }
            }
          }
          const lessonTable = document.getElementById('dgDersProgrami');
          if (!lessonTable) {
            return { error: 'Ders programı bulunamadı', studentInfo };
          }
          const lessons = [];
          const rows = lessonTable.querySelectorAll('tr');
          for (const row of rows) {
            if (row.classList.contains('frmListBaslik')) continue;
            const cells = row.querySelectorAll('td');
            if (cells.length < 6) continue;
            const cellTexts = Array.from(cells).map(c => c.textContent.trim());
            const rowText = cellTexts.join(' ');
            if (rowText.includes('Başarısız Aday')) continue;
            lessons.push(cellTexts);
          }
          // Match the period the user picked in the batch dialog (e.g. May).
          // If they picked "Tüm Dönemler" or the student doesn't have that
          // period, fall back to the chronologically newest period.
          const filteredLessons = _filterByPeriod(lessons, ${targetPeriodJs});
          return { studentInfo, lessons: filteredLessons };
        })();
      `);

      if (lessonData.error) {
        console.log(`[${account.label}] Batch: ${student.tc} - ${lessonData.error}`);
        m.trackBatchError(lessonData.error, student.tc);
        m.pendingBatchDownload.failed++;
      } else {
        await m.batchGenerateForStudent(lessonData, student, account);
      }
    } catch (e) {
      const err = e as any;
      const errorMsg = err?.message || String(e);
      const detail = err?.detail || '';
      console.error(`[${account.label}] Batch: PDF error for ${student.tc}: ${errorMsg}${detail ? ' (' + detail + ')' : ''}`, e);
      m.trackBatchError(errorMsg, student.tc);
      m.pendingBatchDownload.failed++;
    }

    // Update progress and continue
    const completed = m.pendingBatchDownload.completed;
    const failed = m.pendingBatchDownload.failed;
    const processed = completed + failed;
    m.showBatchProgress(win, `PDF oluşturuluyor... (${processed}/${total}) - Başarılı: ${completed}${failed > 0 ? ', Hatalı: ' + failed : ''}`);

    m.batchProcessNextStudent(win, account);
}

export async function batchGenerateForStudent(m: MebbisManager, lessonData: { studentInfo: any; lessons: string[][] },     student: { tc: string; name: string },     account: Account) {
    if (!m.pendingBatchDownload) return;
    const { batchType, outputDir } = m.pendingBatchDownload;

    const studentName = (lessonData.studentInfo['ad-soyad'] || student.name || 'unknown')
      .replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9\s]/g, '')
      .replace(/\s+/g, '_');

    if (batchType === 'direksiyon') {
      const pdfBuffer = await m.generatePdfFromTemplate(lessonData.studentInfo, lessonData.lessons);
      const filename = `direksiyon_${student.tc}_${studentName}.pdf`;
      fs.writeFileSync(path.join(outputDir, filename), pdfBuffer);
      console.log(`[${account.label}] Batch: saved ${filename}`);
      m.pendingBatchDownload.completed++;
      m.logPdf(account, 'direksiyon_takip', 1);

    } else if (batchType === 'simulator') {
      // Extract simulator sessions
      let simulatorSessions = m.extractSimulatorSessions(lessonData.lessons);
      if (simulatorSessions.length === 0) {
        console.log(`[${account.label}] Batch: ${student.tc} - Simülatör dersi bulunamadı`);
        m.trackBatchError('Simülatör dersi bulunamadı', student.tc);
        m.pendingBatchDownload.failed++;
        return;
      }
      // Sort desc by date+time, take top 2
      simulatorSessions.sort((a, b) => {
        const dateA = (a[6] || '').split('/').reverse().join('-');
        const dateB = (b[6] || '').split('/').reverse().join('-');
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        const timeA = (a[7] || '').split('-')[0].trim();
        const timeB = (b[7] || '').split('-')[0].trim();
        return timeB.localeCompare(timeA);
      });
      simulatorSessions = simulatorSessions.slice(0, 2);

      const simType = m.pendingBatchDownload.options.simType || 'both';
      const record = simulatorSessions[0];
      const recordo = simulatorSessions.length >= 2 ? simulatorSessions[1] : null;
      const donem = record?.[0] || 'bilinmeyen';
      const safeDonem = donem.replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9\s\-]/g, '').replace(/\s+/g, '-').trim();

      // Monthly/period-based foldering: outputDir/{period}/{tc}_{name}/
      const periodDir = path.join(outputDir, safeDonem);
      const studentDir = path.join(periodDir, `${student.tc}_${studentName}`);
      if (!fs.existsSync(studentDir)) fs.mkdirSync(studentDir, { recursive: true });

      if (simType === 'sesim' || simType === 'both') {
        const sesimHtml = await m.generateSesimHtml(lessonData.studentInfo, simulatorSessions, account.label);
        const sesimPdf = await m.generatePdfFromHtml(sesimHtml);
        fs.writeFileSync(path.join(studentDir, 'sesim.pdf'), sesimPdf);
      }

      if (simType === 'ana_grup' || simType === 'both') {
        const scenarios = m.getAnagrupScenarios();
        const baseTemplate = await m.fetchSimulatorTemplate('anagrup/anagrup.html');

        for (let i = 0; i < scenarios.length; i++) {
          const html = m.generateAnagrupHtml(baseTemplate, {
            studentName: lessonData.studentInfo['ad-soyad'],
            instructorName: record?.[8] || 'Bilinmeyen',
            date1: record?.[6] || '',
            time1: record?.[7] || '',
            date2: recordo?.[6] || '',
            time2: recordo?.[7] || '',
            donem,
            scenario: scenarios[i],
            accountLabel: account.label,
            isDual: recordo !== null,
          });
          const pdf = await m.generatePdfFromHtml(html);
          const safeName = scenarios[i].replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9 ]/g, '').trim();
          fs.writeFileSync(path.join(studentDir, `${i + 1}_${safeName}.pdf`), pdf);
        }
      }

      // Auto-generate EK4 alongside simulator reports
      const ek4Html = await m.generateEk4Html(
        lessonData.studentInfo['ad-soyad'],
        record?.[4] || '',  // plaka
        record?.[8] || '',  // egitmen
        account.label,
        record?.[6] || '',  // tarih
      );
      const ek4Pdf = await m.generatePdfFromHtml(ek4Html);
      fs.writeFileSync(path.join(studentDir, 'ek4.pdf'), ek4Pdf);

      console.log(`[${account.label}] Batch: simulator + ek4 saved for ${student.tc} in ${safeDonem}`);
      m.pendingBatchDownload.completed++;
      m.logPdf(account, 'simulator_raporu', 1);
    }
}

export async function batchProcessNextStudent(m: MebbisManager, win: BrowserWindow, account: Account) {
    if (!m.pendingBatchDownload) return;

    m.pendingBatchDownload.currentStudentIndex++;
    const { students, currentStudentIndex } = m.pendingBatchDownload;

    if (currentStudentIndex >= students.length) {
      // All students processed
      const { completed, failed, notFound, outputDir, batchType } = m.pendingBatchDownload;
      const actualErrors = failed - notFound; // errors other than not found
      const titles: Record<string, string> = { direksiyon: 'Çoklu Direksiyon Takip', simulator: 'Çoklu Simülatör Raporu' };

      // Build message: "XX PDF oluşturuldu, XX bulunamadı, XX hatalı"
      let statusMsg = `Tamamlandı! ${completed} PDF oluşturuldu`;
      if (notFound > 0) statusMsg += `, ${notFound} bulunamadı`;
      if (actualErrors > 0) statusMsg += `, ${actualErrors} hatalı`;

      console.log(`[${account.label}] Batch ${batchType}: completed! ${completed} success, ${notFound} not found, ${actualErrors} errors`);
      m.showBatchProgress(win, statusMsg, '#00cc66');

      const errorSummary = m.formatBatchErrorSummary();
      const dialogMsg = `${completed} PDF oluşturuldu${notFound > 0 ? ', ' + notFound + ' bulunamadı' : ''}${actualErrors > 0 ? ', ' + actualErrors + ' hatalı' : ''}.`;
      const detailText = errorSummary
        ? `Klasör: ${outputDir}\n\nHatalar:\n${errorSummary}`
        : `Klasör: ${outputDir}`;

      m.clearPendingBatchDownload();
      m.pendingDownloadPhase = null;

      // Auto-hide the top bar after 8 seconds
      setTimeout(() => { m.hideBatchStatus(win); }, 8000);

      // Show completion dialog
      dialog.showMessageBox(win, {
        type: 'info',
        title: titles[batchType] || 'Çoklu İndirme',
        message: dialogMsg,
        detail: detailText,
        buttons: ['Tamam'],
      }).catch(() => {});
      return;
    }

    // Navigate to skt02009 for the next student
    // Reload skt02009 page to get a fresh form
    m.pendingDownloadPhase = 'batch-skt02009-navigate';
    await win.webContents.executeJavaScript(`
      window.location.href = window.location.pathname;
    `).catch(() => {});
}

export function showBatchProgress(m: MebbisManager, win: BrowserWindow, message: string, color?: string) {
    if (m.pendingBatchDownload) {
      m.pendingBatchDownload.statusMessage = message;
    }
    const safeMsg = message.replace(/'/g, "\\'").replace(/\n/g, ' ');
    const bgColor = color || '#4361ee';
    if (!win.isDestroyed()) {
      win.webContents.executeJavaScript(`
        (function() {
          let bar = document.getElementById('mebbis-batch-status-bar');
          if (!bar) {
            bar = document.createElement('div');
            bar.id = 'mebbis-batch-status-bar';
            document.body.appendChild(bar);
          }
          bar.style.cssText = 'position: fixed; top: 0; left: 200px; right: 0; z-index: 999999; background: #1a1a2e; color: ${bgColor}; padding: 10px 20px; font-size: 13px; font-weight: bold; text-align: center; font-family: Arial, sans-serif; border-bottom: 2px solid ${bgColor}; box-shadow: 0 2px 8px rgba(0,0,0,0.4);';
          bar.textContent = '${safeMsg}';
          // Also update modal progress if it exists
          const progress = document.getElementById('batch-progress');
          if (progress) {
            progress.style.display = 'block';
            progress.style.cssText = 'display: block; margin-top: 16px; padding: 10px; border-radius: 4px; background: #16213e; color: ${bgColor}; font-size: 13px; text-align: center;';
            progress.textContent = '${safeMsg}';
          }
        })();
      `).catch(() => {});
    }
}

export function hideBatchStatus(m: MebbisManager, win: BrowserWindow) {
    if (!win.isDestroyed()) {
      win.webContents.executeJavaScript(`
        (function() {
          const bar = document.getElementById('mebbis-batch-status-bar');
          if (bar) bar.remove();
        })();
      `).catch(() => {});
    }
}

export function reinjectBatchStatus(m: MebbisManager, win: BrowserWindow) {
    if (m.pendingBatchDownload && m.pendingBatchDownload.statusMessage) {
      m.showBatchProgress(win, m.pendingBatchDownload.statusMessage);
    }
}

export async function clickMenuItemForSkt02006(m: MebbisManager, win: BrowserWindow, account: Account) {
    const clicked = await win.webContents.executeJavaScript(`
      (function() {
        const allTds = document.querySelectorAll('td');
        for (const td of allTds) {
          const onclick = td.getAttribute('onclick') || '';
          if (onclick.includes('skt02006')) {
            console.log('[MEBBIS] Found skt02006 menu item, clicking...');
            td.click();
            return true;
          }
        }
        console.log('[MEBBIS] skt02006 menu item not found');
        return false;
      })();
    `).catch(() => false);

    if (!clicked) {
      console.log(`[${account.label}] Batch: skt02006 menu not found, trying direct navigation...`);
      // Fallback: navigate directly via URL (still browser navigation, not Node.js fetch)
      await win.webContents.executeJavaScript(`
        window.location.href = '/SKT/skt02006.aspx';
      `).catch(() => {});
    }
}

export async function handleSkt02006Options(m: MebbisManager, win: BrowserWindow, account: Account) {
    if (!m.pendingBatchDownload) return;
    const batchType = m.pendingBatchDownload.batchType;
    const modalTitles: Record<string, string> = { direksiyon: 'Çoklu Direksiyon Takip', simulator: 'Çoklu Simülatör Raporu' };
    const modalTitle = modalTitles[batchType] || 'Çoklu İndirme';

    try {
      // Scrape all dropdown options from the skt02006 form
      const formOptions = await win.webContents.executeJavaScript(`
        (function() {
          function getSelectOptions(id) {
            const select = document.getElementById(id);
            if (!select) return [];
            return Array.from(select.options).map(o => ({ value: o.value, label: o.textContent.trim() }));
          }
          return {
            donemi: getSelectOptions('cmbEgitimDonemi'),
            ogrenciDurumu: getSelectOptions('cmbOgrenciDurumu'),
            onayDurumu: getSelectOptions('cmbDurumu'),
            grubu: getSelectOptions('cmbGrubu'),
            subesi: getSelectOptions('cmbSubesi'),
          };
        })();
      `);

      console.log(`[${account.label}] Batch: form options scraped:`, JSON.stringify({
        donemi: formOptions.donemi?.length || 0,
        ogrenciDurumu: formOptions.ogrenciDurumu?.length || 0,
        onayDurumu: formOptions.onayDurumu?.length || 0,
        grubu: formOptions.grubu?.length || 0,
        subesi: formOptions.subesi?.length || 0,
      }));

      // Store dönem list for potential looping
      m.pendingBatchDownload.donemList = formOptions.donemi || [];

      // Inject options modal on the page
      await win.webContents.executeJavaScript(`
        (function() {
          let overlay = document.getElementById('mebbis-batch-overlay');
          if (overlay) overlay.remove();

          overlay = document.createElement('div');
          overlay.id = 'mebbis-batch-overlay';
          overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 99999; display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif;';

          const modal = document.createElement('div');
          modal.style.cssText = 'background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 8px; padding: 24px; width: 420px; max-height: 80vh; overflow-y: auto; color: white;';

          const title = document.createElement('h3');
          title.style.cssText = 'margin: 0 0 20px 0; color: #4361ee; font-size: 18px; text-align: center;';
          title.textContent = '${modalTitle}';
          modal.appendChild(title);

          function createSelect(labelText, id, options, defaultValue) {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'margin-bottom: 14px;';
            const label = document.createElement('label');
            label.style.cssText = 'display: block; margin-bottom: 6px; font-size: 13px; color: #aaa;';
            label.textContent = labelText;
            wrap.appendChild(label);
            const select = document.createElement('select');
            select.id = id;
            select.style.cssText = 'width: 100%; padding: 8px 10px; border: 1px solid #2a2a4a; border-radius: 4px; background: #16213e; color: white; font-size: 13px; box-sizing: border-box; outline: none; cursor: pointer;';
            select.onfocus = () => { select.style.borderColor = '#4361ee'; };
            select.onblur = () => { select.style.borderColor = '#2a2a4a'; };
            options.forEach(o => {
              const opt = document.createElement('option');
              opt.value = o.value;
              opt.textContent = o.label;
              opt.style.cssText = 'color: white; background-color: #16213e;';
              if (o.value === defaultValue) opt.selected = true;
              select.appendChild(opt);
            });
            wrap.appendChild(select);
            return wrap;
          }

          const donemOptions = ${JSON.stringify(formOptions.donemi || [])};
          const tumDonemOpt = donemOptions.find(o => o.label.toLowerCase().includes('tüm') || o.label.toLowerCase().includes('t\u00FCm'));
          modal.appendChild(createSelect('Eğitim Dönemi', 'batch-donemi', donemOptions, tumDonemOpt?.value || donemOptions[0]?.value || ''));

          const ogrenciOptions = ${JSON.stringify(formOptions.ogrenciDurumu || [])};
          const hepsiOption = { value: 'HEPSI', label: 'Hepsi (Uygulama + Sertifika + Hak Doldu)' };
          const ogrenciOptionsWithHepsi = [hepsiOption, ...ogrenciOptions];
          modal.appendChild(createSelect('Öğrenci Durumu', 'batch-ogrenciDurumu',
            ogrenciOptionsWithHepsi, 'HEPSI'));

          const onayDurumuOpts = ${JSON.stringify(formOptions.onayDurumu || [])};
          const tumAdaylarOpt = onayDurumuOpts.find(o => o.label.toLowerCase().includes('tüm') || o.label.toLowerCase().includes('t\u00FCm'));
          modal.appendChild(createSelect('Onay Durumu', 'batch-onayDurumu',
            onayDurumuOpts, tumAdaylarOpt?.value || '4'));

          modal.appendChild(createSelect('Grubu', 'batch-grubu',
            ${JSON.stringify(formOptions.grubu || [])}, '-1'));

          modal.appendChild(createSelect('Şubesi', 'batch-subesi',
            ${JSON.stringify(formOptions.subesi || [])}, '-1'));

          // Simulator type selector (only for simulator batch)
          if ('${batchType}' === 'simulator') {
            modal.appendChild(createSelect('Simülasyon Tipi', 'batch-simType', [
              { value: 'sesim', label: 'Sesim (1 rapor/öğrenci)' },
              { value: 'ana_grup', label: 'Ana Grup (11 rapor/öğrenci)' },
              { value: 'both', label: 'Her İkisi' },
            ], 'both'));
          }

          // Progress area (hidden initially)
          const progressArea = document.createElement('div');
          progressArea.id = 'batch-progress';
          progressArea.style.cssText = 'display: none; margin-top: 16px; padding: 10px; border-radius: 4px; background: #16213e; color: #4361ee; font-size: 13px; text-align: center;';
          modal.appendChild(progressArea);

          // Buttons
          const btnRow = document.createElement('div');
          btnRow.style.cssText = 'display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end;';

          const cancelBtn = document.createElement('button');
          cancelBtn.textContent = 'İptal';
          cancelBtn.style.cssText = 'padding: 10px 20px; border: 1px solid #2a2a4a; border-radius: 4px; background: none; color: #ccc; cursor: pointer; font-size: 14px;';
          cancelBtn.onclick = () => {
            overlay.remove();
            console.log('MEBBIS_BATCH_CANCEL');
          };
          btnRow.appendChild(cancelBtn);

          const startBtn = document.createElement('button');
          startBtn.id = 'batch-start-btn';
          startBtn.textContent = 'Başlat';
          startBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 4px; background: #4361ee; color: white; cursor: pointer; font-size: 14px; font-weight: bold;';
          startBtn.onclick = () => {
            const options = {
              donemi: document.getElementById('batch-donemi').value,
              ogrenciDurumu: document.getElementById('batch-ogrenciDurumu').value,
              onayDurumu: document.getElementById('batch-onayDurumu').value,
              grubu: document.getElementById('batch-grubu').value,
              subesi: document.getElementById('batch-subesi').value,
              simType: document.getElementById('batch-simType')?.value || '',
            };
            startBtn.disabled = true;
            startBtn.textContent = 'Yükleniyor...';
            startBtn.style.opacity = '0.6';
            cancelBtn.disabled = true;
            const progress = document.getElementById('batch-progress');
            if (progress) { progress.style.display = 'block'; progress.textContent = 'Öğrenci listesi alınıyor...'; }
            console.log('MEBBIS_BATCH_START:' + JSON.stringify(options));
          };
          btnRow.appendChild(startBtn);

          modal.appendChild(btnRow);
          overlay.appendChild(modal);
          overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); console.log('MEBBIS_BATCH_CANCEL'); } };
          document.body.appendChild(overlay);
        })();
      `);
    } catch (e) {
      console.error(`[${account.label}] Batch: options scrape error:`, e);
      m.clearPendingBatchDownload();
      m.pendingDownloadPhase = null;
    }
}

export async function handleSkt02006Results(m: MebbisManager, win: BrowserWindow, account: Account) {
    if (!m.pendingBatchDownload) return;

    try {
      // Scrape the student list table
      const tableData = await win.webContents.executeJavaScript(`
        (function() {
          const table = document.querySelector('table.frmList');
          if (!table) return { students: [], error: 'Tablo bulunamadı' };
          const students = [];
          const rows = table.querySelectorAll('tr');
          for (const row of rows) {
            if (row.classList.contains('frmListBaslik')) continue;
            const cells = row.querySelectorAll('td');
            if (cells.length < 4) continue;
            const cellTexts = Array.from(cells).map(c => c.textContent.trim());
            // skt02006 columns: 0:S.No | 1:Sil | 2:TC | 3:Adı Soyadı
            const tc = cellTexts[2] || '';
            const name = cellTexts[3] || '';
            if (tc && /^[0-9]{11}$/.test(tc)) {
              students.push({ tc, name });
            }
          }
          return { students };
        })();
      `);

      if (tableData.error) {
        console.log(`[${account.label}] Batch: ${tableData.error}`);
      }

      const newStudents = (tableData.students || []) as { tc: string; name: string }[];
      console.log(`[${account.label}] Batch: found ${newStudents.length} students in this period`);

      // Add unique students (avoid duplicates across periods)
      for (const student of newStudents) {
        if (!m.pendingBatchDownload.processedTcs.has(student.tc)) {
          m.pendingBatchDownload.processedTcs.add(student.tc);
          m.pendingBatchDownload.students.push(student);
        }
      }

      // Check if we need to process more periods
      if (m.pendingBatchDownload.donemList.length > 0 &&
          m.pendingBatchDownload.currentDonemIndex < m.pendingBatchDownload.donemList.length - 1) {
        // Move to next period
        m.pendingBatchDownload.currentDonemIndex++;
        const nextDonem = m.pendingBatchDownload.donemList[m.pendingBatchDownload.currentDonemIndex];
        const total = m.pendingBatchDownload.donemList.length;
        m.showBatchProgress(win, `Dönem taranıyor: ${nextDonem.label} (${m.pendingBatchDownload.currentDonemIndex + 1}/${total})... Toplam: ${m.pendingBatchDownload.students.length} öğrenci`);
        m.pendingDownloadPhase = 'batch-skt02006-results';
        m.submitSkt02006Form(win, nextDonem.value, m.pendingBatchDownload.options);
        return;
      }

      // Check if we need to process more student statuses (Hepsi mode)
      if (m.pendingBatchDownload.statusList.length > 0 &&
          m.pendingBatchDownload.currentStatusIndex < m.pendingBatchDownload.statusList.length - 1) {
        // Move to next status
        m.pendingBatchDownload.currentStatusIndex++;
        const nextStatus = m.pendingBatchDownload.statusList[m.pendingBatchDownload.currentStatusIndex];
        const totalStatuses = m.pendingBatchDownload.statusList.length;
        // Reset dönem index for next status loop
        m.pendingBatchDownload.currentDonemIndex = 0;
        // Update ogrenciDurumu in options
        m.pendingBatchDownload.options.ogrenciDurumu = nextStatus.value;

        console.log(`[${account.label}] Batch: moving to next status: ${nextStatus.label} (${m.pendingBatchDownload.currentStatusIndex + 1}/${totalStatuses})`);
        m.showBatchProgress(win, `Durum taranıyor: ${nextStatus.label} (${m.pendingBatchDownload.currentStatusIndex + 1}/${totalStatuses})... Toplam: ${m.pendingBatchDownload.students.length} öğrenci`);

        m.pendingDownloadPhase = 'batch-skt02006-results';
        if (m.pendingBatchDownload.donemList.length > 0) {
          // Tüm Dönemler mode: start from first period again
          m.submitSkt02006Form(win, m.pendingBatchDownload.donemList[0].value, m.pendingBatchDownload.options);
        } else {
          // Single period mode
          m.submitSkt02006Form(win, m.pendingBatchDownload.options.donemi, m.pendingBatchDownload.options);
        }
        return;
      }

      // All periods and statuses processed - start downloading individual student data
      const totalStudents = m.pendingBatchDownload.students.length;
      if (totalStudents === 0) {
        m.showBatchProgress(win, 'Öğrenci bulunamadı!', '#ff4444');
        m.clearPendingBatchDownload();
        m.pendingDownloadPhase = null;
        return;
      }

      console.log(`[${account.label}] Batch: total unique students: ${totalStudents}, starting PDF generation...`);
      m.showBatchProgress(win, `${totalStudents} öğrenci bulundu. PDF oluşturuluyor... (0/${totalStudents})`);

      // Navigate to skt02009 for the first student
      m.pendingBatchDownload.currentStudentIndex = 0;
      m.pendingDownloadPhase = 'batch-skt02009-navigate';
      m.clickMenuItemForSkt02009(win, account);
    } catch (e) {
      console.error(`[${account.label}] Batch: results scrape error:`, e);
      m.showBatchProgress(win, 'Hata: Öğrenci listesi okunamadı', '#ff4444');
      m.clearPendingBatchDownload();
      m.pendingDownloadPhase = null;
    }
}
