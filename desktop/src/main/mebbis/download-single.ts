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

export async function downloadDireksiyonTakip(m: MebbisManager, tc: string, _partition: string, account: Account, parentWin: BrowserWindow, sinif?: string) {
    console.log(`[${account.label}] Starting direksiyon takip download for TC: ${tc}, sinif: ${sinif}`);

    // Show loading status in modal
    parentWin.webContents.executeJavaScript(`
      (function() {
        let status = document.getElementById('mebbis-modal-status');
        if (!status) {
          const modal = document.querySelector('#mebbis-modal-overlay > div');
          if (modal) {
            status = document.createElement('div');
            status.id = 'mebbis-modal-status';
            status.style.cssText = 'margin-top: 12px; padding: 8px; border-radius: 4px; background: #16213e; color: #4361ee; font-size: 13px; text-align: center;';
            modal.appendChild(status);
          }
        }
        if (status) status.textContent = 'Sayfaya yönlendiriliyor...';
      })();
    `).catch(() => {});

    // Store the TC and sinif so we can use it after navigation.
    // Empty sinif → "Otomatik" mode: generatePdfFromTemplate falls back to
    // the scraped lesson count from skt02009 (same as çoklu/batch flow).
    m.pendingDownload = { tc, sinif: sinif || '', account, parentWin };

    const currentURL = parentWin.webContents.getURL().toLowerCase();

    if (currentURL.includes('skt00001') || currentURL.includes('/skt/')) {
      // Already on an SKT page, can click directly to skt02009
      m.pendingDownloadPhase = 'navigate';
      m.clickMenuItemForSkt02009(parentWin, account);
    } else {
      // On main.aspx or other non-SKT page, first navigate to SKT module
      m.pendingDownloadPhase = 'skt-module';
      const clicked = await parentWin.webContents.executeJavaScript(`
        (function() {
          // Find the "Özel MTSK Modülü" menu item that navigates to /SKT/skt00001.aspx
          const allTds = document.querySelectorAll('td');
          for (const td of allTds) {
            const onclick = td.getAttribute('onclick') || '';
            if (onclick.includes('skt00001')) {
              console.log('[MEBBIS] Found SKT module menu item, clicking...');
              td.click();
              return true;
            }
          }
          // Also try finding tr with onclick
          const allTrs = document.querySelectorAll('tr');
          for (const tr of allTrs) {
            const onclick = tr.getAttribute('onclick') || '';
            if (onclick.includes('skt00001')) {
              console.log('[MEBBIS] Found SKT module menu row, clicking...');
              tr.click();
              return true;
            }
          }
          console.log('[MEBBIS] SKT module menu not found');
          return false;
        })();
      `).catch(() => false);

      if (!clicked) {
        m.pendingDownload = null;
        m.pendingDownloadPhase = null;
        parentWin.webContents.executeJavaScript(`
          (function() {
            const status = document.getElementById('mebbis-modal-status');
            if (status) { status.textContent = 'Hata: SKT menüsü bulunamadı'; status.style.color = '#ff4444'; }
            const submitBtn = document.querySelector('#mebbis-modal-overlay button:last-child');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'İndir'; submitBtn.style.opacity = '1'; }
          })();
        `).catch(() => {});
      }
    }
    // The rest continues in did-finish-load state machine
}

export async function clickMenuItemForSkt02009(m: MebbisManager, win: BrowserWindow, account: Account) {
    const clicked = await win.webContents.executeJavaScript(`
      (function() {
        // MEBBIS menu items are td elements with onclick containing window.location.href
        const allTds = document.querySelectorAll('td');
        for (const td of allTds) {
          const onclick = td.getAttribute('onclick') || '';
          if (onclick.includes('skt02009')) {
            console.log('[MEBBIS] Found skt02009 menu item, clicking...');
            td.click();
            return true;
          }
        }
        console.log('[MEBBIS] skt02009 menu item not found on this page');
        return false;
      })();
    `).catch(() => false);

    if (!clicked) {
      console.log(`[${account.label}] skt02009 menu not found, aborting`);
      m.pendingDownload = null;
      m.pendingSimulatorReport = null;
      m.pendingDownloadPhase = null;
      win.webContents.executeJavaScript(`
        (function() {
          const status = document.getElementById('mebbis-modal-status');
          if (status) { status.textContent = 'Hata: Aday Durum menüsü bulunamadı'; status.style.color = '#ff4444'; }
          const submitBtn = document.querySelector('#mebbis-modal-overlay button:last-child');
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'İndir'; submitBtn.style.opacity = '1'; }
        })();
      `).catch(() => {});
    }
}

export async function handleSktModuleLoaded(m: MebbisManager, win: BrowserWindow, account: Account) {
    // SKT module page loaded, now click the skt02009 menu item
    m.clickMenuItemForSkt02009(win, account);
}

export async function handleSkt02009Loaded(m: MebbisManager, win: BrowserWindow, account: Account) {
    if (!m.pendingDownload || m.pendingDownload.parentWin !== win) return;
    const { tc, parentWin } = m.pendingDownload;
    console.log(`[${account.label}] skt02009 loaded, filling TC: ${tc}`);

    // Update modal status
    parentWin.webContents.executeJavaScript(`
      (function() {
        const status = document.getElementById('mebbis-modal-status');
        if (status) status.textContent = 'TC giriliyor ve sorgulanıyor...';
      })();
    `).catch(() => {});

    try {
      // Fill TC and click search button
      await win.webContents.executeJavaScript(`
        (function() {
          const tcInput = document.getElementById('txtTcKimlikNo');
          if (tcInput) {
            tcInput.value = '${tc}';
            tcInput.dispatchEvent(new Event('change', { bubbles: true }));
            tcInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            setTimeout(() => {
              const searchBtn = document.getElementById('ImageButton1') || 
                               document.querySelector('input[id*="ImageButton"]') ||
                               document.querySelector('input[type="image"]');
              if (searchBtn) {
                console.log('[MEBBIS] Clicking search button...');
                searchBtn.click();
              } else {
                const form = tcInput.closest('form');
                if (form) form.submit();
              }
            }, 300);
          }
        })();
      `);
      // Results will come in the next did-finish-load → handleSkt02009Results
    } catch (e) {
      console.error(`[${account.label}] TC fill error:`, e);
      m.pendingDownload = null;
      m.pendingDownloadPhase = null;
    }
}

export async function handleSkt02009Results(m: MebbisManager, win: BrowserWindow, account: Account) {
    if (!m.pendingDownload || m.pendingDownload.parentWin !== win) return;
    const { tc, sinif, parentWin } = m.pendingDownload;
    m.pendingDownload = null;
    console.log(`[${account.label}] skt02009 results loaded, scraping data... sinif: ${sinif}`);

    try {
      // Update modal
      parentWin.webContents.executeJavaScript(`
        (function() {
          const status = document.getElementById('mebbis-modal-status');
          if (status) status.textContent = 'Veriler okunuyor...';
        })();
      `).catch(() => {});

      // Scrape the lesson data from the current page
      const lessonData = await win.webContents.executeJavaScript(`
        (function() {
          // Student info is in dgDonemBilgileri table (not separate labels)
          // Columns: 0=TC, 1=Ad Soyad, 2=Kurum, 3=Dönemi, 4=Grubu, 5=Şubesi, 6=Mevcut, 7=İstenen Sertifika, ...
          const donemTable = document.getElementById('dgDonemBilgileri');
          const studentInfo = {
            'ad-soyad': '',
            'tc-kimlik-no': '${tc}',
            'istenen-sertifika': ''
          };
          
          if (donemTable) {
            const dataRows = donemTable.querySelectorAll('tr:not(.frmListBaslik)');
            if (dataRows.length > 0) {
              // Use LAST row (most recent period), matching PHP: end($adaybilgiler)
              const lastRow = dataRows[dataRows.length - 1];
              const cells = lastRow.querySelectorAll('td');
              if (cells.length >= 8) {
                studentInfo['tc-kimlik-no'] = cells[0].textContent.trim() || '${tc}';
                studentInfo['ad-soyad'] = cells[1].textContent.trim();
                studentInfo['istenen-sertifika'] = cells[7].textContent.trim();
              }
            }
          }
          
          // Lesson data is in dgDersProgrami table
          // Columns: 0=Dönemi, 1=Grup, 2=Başlama, 3=Şubesi, 4=Araç Plakası, 5=Ders Yeri, 6=Ders Tarihi, 7=Ders Saati, 8=Personel, 9=Eğitim Türü
          ${PERIOD_HELPERS_JS}
          const lessonTable = document.getElementById('dgDersProgrami');

          if (!lessonTable) {
            if (!studentInfo['ad-soyad']) {
              return { error: 'Veri bulunamadı - Direksiyon ders programı tablosu yok' };
            }
            return { error: 'Direksiyon ders programı bulunamadı' };
          }

          const lessons = [];
          const rows = lessonTable.querySelectorAll('tr');
          for (const row of rows) {
            if (row.classList.contains('frmListBaslik')) continue;
            const cells = row.querySelectorAll('td');
            if (cells.length < 6) continue;
            const cellTexts = Array.from(cells).map(c => c.textContent.trim());
            // Exclude "Başarısız Aday Eğitimi" rows
            const rowText = cellTexts.join(' ');
            if (rowText.includes('Başarısız Aday')) continue;
            lessons.push(cellTexts);
          }

          // Pick the chronologically newest period (column 0 = Dönemi).
          // MEBBIS row order is unreliable — parse "YYYY - <month>" instead.
          const filteredLessons = _filterByNewest(lessons);

          return { studentInfo, lessons: filteredLessons };
        })();
      `);

      if (lessonData.error) {
        throw new Error(lessonData.error);
      }

      console.log(`[${account.label}] Lesson data received:`, JSON.stringify(lessonData.studentInfo), `${lessonData.lessons.length} lessons`);

      // Update modal status
      parentWin.webContents.executeJavaScript(`
        (function() {
          const status = document.getElementById('mebbis-modal-status');
          if (status) status.textContent = 'PDF oluşturuluyor...';
        })();
      `).catch(() => {});

      // Generate PDF from template
      const pdfBuffer = await m.generatePdfFromTemplate(lessonData.studentInfo, lessonData.lessons, sinif);

      // Show save dialog
      const studentName = (lessonData.studentInfo['ad-soyad'] || 'unknown').replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9]/g, '_');
      const defaultFilename = `direksiyon_${tc}_${studentName}.pdf`;

      const result = await dialog.showSaveDialog(parentWin, {
        title: 'Direksiyon Takip PDF Kaydet',
        defaultPath: defaultFilename,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });

      if (!result.canceled && result.filePath) {
        fs.writeFileSync(result.filePath, pdfBuffer);
        console.log(`[${account.label}] PDF saved to: ${result.filePath}`);
        shell.showItemInFolder(result.filePath);
        m.logPdf(account, 'direksiyon_takip', 1);
      }

      // Close modal
      parentWin.webContents.executeJavaScript(`
        (function() {
          const overlay = document.getElementById('mebbis-modal-overlay');
          if (overlay) overlay.remove();
        })();
      `).catch(() => {});

    } catch (error: any) {
      console.error(`[${account.label}] Download error:`, error);
      const errMsg = error?.message || 'PDF oluşturulamadı';

      // Show alert dialog with error
      dialog.showMessageBox(parentWin, {
        type: 'error',
        title: 'Direksiyon Takip Hatası',
        message: errMsg,
        buttons: ['Tamam'],
        noLink: true,
      }).catch(() => {});

      // Update modal status
      const escapedMsg = errMsg.replace(/'/g, "\\'").replace(/\n/g, ' ');
      parentWin.webContents.executeJavaScript(`
        (function() {
          const status = document.getElementById('mebbis-modal-status');
          if (status) {
            status.textContent = 'Hata: ${escapedMsg}';
            status.style.color = '#ff4444';
          }
          const submitBtn = document.querySelector('#mebbis-modal-overlay button:last-child');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'İndir';
            submitBtn.style.opacity = '1';
          }
        })();
      `).catch(() => {});
    }
}

export async function handleSkt02009SimulatorLoaded(m: MebbisManager, win: BrowserWindow, account: Account) {
    if (!m.pendingSimulatorReport) return;
    const { tc } = m.pendingSimulatorReport;
    console.log(`[${account.label}] skt02009 loaded for simulator, filling TC: ${tc}`);

    // Update modal status
    const parentWin = m.running.get(account.id)?.window;
    if (parentWin && !parentWin.isDestroyed()) {
      parentWin.webContents.executeJavaScript(`
        (function() {
          const overlay = document.getElementById('mebbis-modal-overlay');
          if (overlay) {
            const submitBtn = overlay.querySelector('button:last-of-type');
            if (submitBtn) submitBtn.textContent = 'TC sorgulanıyor...';
          }
        })();
      `).catch(() => {});
    }

    try {
      await win.webContents.executeJavaScript(`
        (function() {
          const tcInput = document.getElementById('txtTcKimlikNo');
          if (tcInput) {
            tcInput.value = '${tc}';
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
      console.error(`[${account.label}] Simulator TC fill error:`, e);
      m.pendingSimulatorReport = null;
      m.pendingDownloadPhase = null;
    }
}

export async function handleSkt02009SimulatorResults(m: MebbisManager, win: BrowserWindow, account: Account) {
    if (!m.pendingSimulatorReport) return;
    const { tc, simulationType } = m.pendingSimulatorReport;
    m.pendingSimulatorReport = null;
    console.log(`[${account.label}] skt02009 simulator results loaded, scraping for ${simulationType}...`);

    const parentWin = m.running.get(account.id)?.window;

    try {
      if (parentWin && !parentWin.isDestroyed()) {
        parentWin.webContents.executeJavaScript(`
          (function() {
            const overlay = document.getElementById('mebbis-modal-overlay');
            if (overlay) {
              const submitBtn = overlay.querySelector('button:last-of-type');
              if (submitBtn) submitBtn.textContent = 'Veriler okunuyor...';
            }
          })();
        `).catch(() => {});
      }

      // Scrape student info and lessons (same as direksiyon takip)
      const lessonData = await win.webContents.executeJavaScript(`
        (function() {
          const donemTable = document.getElementById('dgDonemBilgileri');
          const studentInfo = { 'ad-soyad': '', 'tc-kimlik-no': '${tc}', 'istenen-sertifika': '' };
          if (donemTable) {
            const dataRows = donemTable.querySelectorAll('tr:not(.frmListBaslik)');
            if (dataRows.length > 0) {
              // Use LAST row (most recent period), matching PHP: end($adaybilgiler)
              const lastRow = dataRows[dataRows.length - 1];
              const cells = lastRow.querySelectorAll('td');
              if (cells.length >= 8) {
                studentInfo['tc-kimlik-no'] = cells[0].textContent.trim() || '${tc}';
                studentInfo['ad-soyad'] = cells[1].textContent.trim();
                studentInfo['istenen-sertifika'] = cells[7].textContent.trim();
              }
            }
          }
          ${PERIOD_HELPERS_JS}
          const lessonTable = document.getElementById('dgDersProgrami');
          if (!lessonTable) {
            return { error: 'Direksiyon ders programı tablosu bulunamadı' };
          }
          const lessons = [];
          const rows = lessonTable.querySelectorAll('tr');
          for (const row of rows) {
            if (row.classList.contains('frmListBaslik')) continue;
            const cells = row.querySelectorAll('td');
            if (cells.length < 6) continue;
            const cellTexts = Array.from(cells).map(c => c.textContent.trim());
            lessons.push(cellTexts);
          }
          // Pick the chronologically newest period (column 0 = Dönemi).
          const filteredLessons = _filterByNewest(lessons);
          return { studentInfo, lessons: filteredLessons };
        })();
      `);

      if (lessonData.error) {
        throw new Error(lessonData.error);
      }

      // Filter for simulator sessions only
      let simulatorSessions = m.extractSimulatorSessions(lessonData.lessons);
      console.log(`[${account.label}] Found ${simulatorSessions.length} simulator sessions out of ${lessonData.lessons.length} total lessons`);

      if (simulatorSessions.length === 0) {
        throw new Error('Simulatör dersi bulunamadı');
      }

      // Sort by date+time descending and take top 2 (matching PHP: usort + array_slice)
      simulatorSessions.sort((a, b) => {
        // col[6] = date (dd/mm/yyyy), col[7] = time (HH:MM - HH:MM)
        const dateA = (a[6] || '').split('/').reverse().join('-');
        const dateB = (b[6] || '').split('/').reverse().join('-');
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        const timeA = (a[7] || '').split('-')[0].trim();
        const timeB = (b[7] || '').split('-')[0].trim();
        return timeB.localeCompare(timeA);
      });
      simulatorSessions = simulatorSessions.slice(0, 2);

      if (parentWin && !parentWin.isDestroyed()) {
        parentWin.webContents.executeJavaScript(`
          (function() {
            const overlay = document.getElementById('mebbis-modal-overlay');
            if (overlay) {
              const submitBtn = overlay.querySelector('button:last-of-type');
              if (submitBtn) submitBtn.textContent = 'PDF oluşturuluyor...';
            }
          })();
        `).catch(() => {});
      }

      // Generate PDFs (simulator + ek4) into a folder
      const savedDir = await m.generateSimulatorReportPdf(
        lessonData.studentInfo,
        simulatorSessions,
        simulationType,
        account,
        parentWin || win
      );

      console.log(`[${account.label}] Simulator + EK4 PDFs saved to: ${savedDir}`);
      shell.openPath(savedDir);

      // Close modal
      if (parentWin && !parentWin.isDestroyed()) {
        parentWin.webContents.executeJavaScript(`
          (function() {
            const overlay = document.getElementById('mebbis-modal-overlay');
            if (overlay) overlay.remove();
          })();
        `).catch(() => {});
      }

    } catch (error: any) {
      console.error(`[${account.label}] Simulator report error:`, error);
      const errMsg = error?.message || 'Simulatör raporu oluşturulamadı';

      if (parentWin && !parentWin.isDestroyed()) {
        dialog.showMessageBox(parentWin, {
          type: 'error',
          title: 'Simulatör Raporu Hatası',
          message: errMsg,
          buttons: ['Tamam'],
          noLink: true,
        }).catch(() => {});

        const escapedMsg = errMsg.replace(/'/g, "\\'").replace(/\n/g, ' ');
        parentWin.webContents.executeJavaScript(`
          (function() {
            const overlay = document.getElementById('mebbis-modal-overlay');
            if (overlay) {
              const submitBtn = overlay.querySelector('button:last-of-type');
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Oluştur';
                submitBtn.style.opacity = '1';
              }
            }
          })();
        `).catch(() => {});
      }
    }
}

export async function handleSimulationReport(m: MebbisManager, tc: string, simulationType: string, account: Account, parentWin: BrowserWindow) {
    console.log(`[${account.label}] Simulator report for TC: ${tc}, simulationType: ${simulationType}`);

    m.pendingSimulatorReport = { tc, simulationType, account };

    try {
      await parentWin.webContents.executeJavaScript(`
        (function() {
          const overlay = document.getElementById('mebbis-modal-overlay');
          if (overlay) {
            const submitBtn = overlay.querySelector('button:last-of-type');
            if (submitBtn) {
              submitBtn.textContent = 'Veriler getiriliyor...';
              submitBtn.disabled = true;
              submitBtn.style.opacity = '0.6';
            }
          }
        })();
      `);
    } catch {}

    // Use the same navigation pattern as direksiyon takip — navigate via menu clicks in the same window
    const currentURL = parentWin.webContents.getURL().toLowerCase();

    if (currentURL.includes('skt00001') || currentURL.includes('/skt/')) {
      // Already on an SKT page, can click directly to skt02009
      m.pendingDownloadPhase = 'navigate-simulator';
      m.clickMenuItemForSkt02009(parentWin, account);
    } else {
      // On main.aspx or other non-SKT page, first navigate to SKT module
      m.pendingDownloadPhase = 'skt-module';
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
        m.pendingSimulatorReport = null;
        m.pendingDownloadPhase = null;
        parentWin.webContents.executeJavaScript(`
          (function() {
            const overlay = document.getElementById('mebbis-modal-overlay');
            if (overlay) {
              const submitBtn = overlay.querySelector('button:last-of-type');
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Oluştur';
                submitBtn.style.opacity = '1';
              }
            }
          })();
        `).catch(() => {});
      }
    }
}
