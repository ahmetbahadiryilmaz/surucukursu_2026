import { app, BrowserWindow, session, dialog, shell } from 'electron';
import { Account } from './account-store';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';

const TEMPLATE_BASE_URL = 'https://online.mtsk.app/templates/direksiyon-takip';
const SIMULATOR_TEMPLATE_BASE_URL = 'https://online.mtsk.app/templates/simulator';

interface RunningAccount {
  account: Account;
  window: BrowserWindow;
}

export class MebbisManager {
  private running: Map<string, RunningAccount> = new Map();
  private loginAttempts: Map<string, number> = new Map();
  private autoRefreshIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();

  start(account: Account, parentWindow: BrowserWindow) {
    console.log(`\n========== STARTING ACCOUNT: ${account.label} ==========`);

    const existing = this.running.get(account.id);
    if (existing && !existing.window.isDestroyed()) {
      console.log(`[${account.label}] Already running, focusing window...`);
      existing.window.focus();
      return;
    }

    const partition = `persist:mebbis-${account.id}`;
    console.log(`[${account.label}] Using partition: ${partition}`);

    const win = new BrowserWindow({
      width: 1280,
      height: 900,
      title: `MEBBIS - ${account.label}`,
      icon: undefined,
      webPreferences: {
        partition,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        devTools: true,
      },
      show: false,
    });

    // Hide menu bar
    win.removeMenu();

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    win.webContents.setUserAgent(userAgent);
    console.log(`[${account.label}] User agent set`);

    this.running.set(account.id, { account, window: win });
    console.log(`[${account.label}] Window registered`);

    win.on('closed', () => {
      console.log(`[${account.label}] Window closed`);
      const interval = this.autoRefreshIntervals.get(account.id);
      if (interval) {
        clearInterval(interval);
        this.autoRefreshIntervals.delete(account.id);
        console.log(`[${account.label}] Auto-refresh cleared on close`);
      }
      const ses = session.fromPartition(partition);
      ses.cookies.flushStore().then(() => {
        console.log(`[${account.label}] Cookies flushed on close`);
      }).catch(() => {});
      this.running.delete(account.id);
      if (parentWindow && !parentWindow.isDestroyed()) {
        parentWindow.webContents.send('account:stopped', account.id);
      }
    });

    win.webContents.on('did-start-navigation', (_event, url) => {
      console.log(`[${account.label}] NAVIGATION: ${url}`);
    });

    win.webContents.on('did-redirect-navigation', (_event, url) => {
      console.log(`[${account.label}] REDIRECT: ${url}`);
    });

    // Check existing cookies in this partition
    const ses = session.fromPartition(partition);

    // Convert session cookies to persistent cookies.
    // MEBBIS sets session cookies (no expiry) which Electron deletes on window close.
    // We intercept and re-set them with a 30-day expiration so they survive restarts.
    ses.cookies.on('changed', (_event, cookie, _cause, removed) => {
      if (removed) return;
      if (!cookie.expirationDate) {
        const thirtyDaysFromNow = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
        const cookieDetails: Electron.CookiesSetDetails = {
          url: `https://${(cookie.domain || '').replace(/^\./, '')}${cookie.path}`,
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite as 'unspecified' | 'no_restriction' | 'lax' | 'strict',
          expirationDate: thirtyDaysFromNow,
        };
        ses.cookies.set(cookieDetails).then(() => {
          console.log(`[${account.label}] Made cookie persistent: ${cookie.name}`);
        }).catch(() => {});
      }
    });

    ses.cookies.get({ domain: '.meb.gov.tr' }).then(cookies => {
      console.log(`[${account.label}] COOKIES ON DISK: ${cookies.length} cookies found`);
      cookies.forEach(c => {
        console.log(`[${account.label}]   Cookie: ${c.name} = ${c.value.substring(0, 20)}... (domain: ${c.domain}, expires: ${c.expirationDate || 'session'})`);
      });
    }).catch(e => console.error(`[${account.label}] Cookie check error:`, e));

    // Listen for download TC trigger from injected modal
    win.webContents.on('console-message', (_event, _level, message) => {
      if (message.startsWith('MEBBIS_DOWNLOAD_TC:')) {
        const payload = message.replace('MEBBIS_DOWNLOAD_TC:', '').trim();
        const [tc, sinif] = payload.split('|||');
        console.log(`[${account.label}] Download triggered for TC: ${tc}, sinif: ${sinif}`);
        this.downloadDireksiyonTakip(tc, partition, account, win, sinif);
      }
      if (message.startsWith('MEBBIS_SIMULATION_REPORT:')) {
        const payload = message.replace('MEBBIS_SIMULATION_REPORT:', '').trim();
        const [tc, simType] = payload.split('|||');
        console.log(`[${account.label}] Simulation report triggered for TC: ${tc}, simType: ${simType || 'sesim'}`);
        this.handleSimulationReport(tc, simType || 'sesim', account, win);
      }
      if (message === 'MEBBIS_BATCH_DIREKSIYON') {
        console.log(`[${account.label}] Batch direksiyon takip triggered`);
        this.handleBatchDireksiyon(account, win);
      }
      if (message === 'MEBBIS_BATCH_SIMULATOR') {
        console.log(`[${account.label}] Batch simulator triggered`);
        this.handleBatchGeneric('simulator', account, win);
      }
      if (message.startsWith('MEBBIS_BATCH_START:')) {
        const payload = message.replace('MEBBIS_BATCH_START:', '').trim();
        try {
          const options = JSON.parse(payload);
          console.log(`[${account.label}] Batch start with options:`, options);
          this.handleBatchStart(options, account, win);
        } catch (e) {
          console.error(`[${account.label}] Batch start parse error:`, e);
        }
      }
      if (message === 'MEBBIS_BATCH_CANCEL') {
        console.log(`[${account.label}] Batch cancelled by user`);
        this.pendingBatchDownload = null;
        this.pendingDownloadPhase = null;
      }
      if (message === 'MEBBIS_DEV_AUTO_REFRESH') {
        const existing = this.autoRefreshIntervals.get(account.id);
        if (existing) {
          clearInterval(existing);
          this.autoRefreshIntervals.delete(account.id);
          console.log(`[${account.label}] Auto-refresh STOPPED`);
        } else {
          const interval = setInterval(() => {
            if (!win.isDestroyed()) {
              console.log(`[${account.label}] Auto-refresh: reloading page...`);
              win.webContents.reload();
            } else {
              clearInterval(interval);
              this.autoRefreshIntervals.delete(account.id);
            }
          }, 30000);
          this.autoRefreshIntervals.set(account.id, interval);
          console.log(`[${account.label}] Auto-refresh STARTED (every 30s)`);
        }
      }
    });

    // Handle F12 to toggle dev tools
    let devToolsOpen = false;
    win.webContents.on('before-input-event', (event, input) => {
      if (input.key.toLowerCase() === 'f12' && input.type === 'keyDown') {
        event.preventDefault();
        if (devToolsOpen) {
          win.webContents.closeDevTools();
          devToolsOpen = false;
          console.log(`[${account.label}] Dev tools closed`);
        } else {
          win.webContents.openDevTools({ mode: 'detach' });
          devToolsOpen = true;
          console.log(`[${account.label}] Dev tools opened`);
        }
      }
    });

    // Show window when ready
    win.once('ready-to-show', () => {
      win.show();
    });

    // Navigate to MEBBIS
    console.log(`[${account.label}] Navigating to SKT page...`);
    this.showStatus(win, 'CHECKING LOGIN...', '#FFA500');
    win.loadURL('https://mebbis.meb.gov.tr/SKT/skt00001.aspx');

    win.webContents.on('did-finish-load', () => {
      const currentURL = win.webContents.getURL();
      console.log(`[${account.label}] PAGE LOADED: ${currentURL}`);

      // Save response HTML to responses folder
      this.saveResponse(win, account, currentURL);

      if (this.isLoginPage(currentURL)) {
        const attempts = this.loginAttempts.get(account.id) || 0;
        if (attempts >= 3) {
          console.log(`[${account.label}] Max login attempts (${attempts}) reached, stopping auto-fill`);
          this.showStatus(win, 'LOGIN FAILED - Max attempts reached', '#FF0000');
          // Reset pending download if login failed during download
          if (this.pendingDownload) {
            this.pendingDownload = null;
            this.pendingDownloadPhase = null;
          }
          if (this.pendingBatchDownload) {
            this.pendingBatchDownload = null;
            this.pendingDownloadPhase = null;
          }
        } else {
          this.loginAttempts.set(account.id, attempts + 1);
          console.log(`[${account.label}] LOGIN PAGE! Auto-filling... (attempt ${attempts + 1})`);
          this.showStatus(win, 'TRYING LOGIN...', '#FF6B6B');
          this.autoFillLogin(win, account);
        }
      } else if ((this.pendingDownload || this.pendingSimulatorReport) && this.pendingDownloadPhase === 'skt-module' && currentURL.toLowerCase().includes('skt00001')) {
        // Phase 1: SKT module loaded, now click the menu item for skt02009
        console.log(`[${account.label}] SKT module loaded, clicking Aday Durum Görüntüleme...`);
        this.pendingDownloadPhase = this.pendingSimulatorReport ? 'navigate-simulator' : 'navigate';
        this.injectLeftMenu(win, account);
        this.handleSktModuleLoaded(win, account);
      } else if (this.pendingBatchDownload && this.pendingDownloadPhase === 'batch-skt-module' && currentURL.toLowerCase().includes('skt00001')) {
        // Batch: SKT module loaded, now navigate to skt02006
        console.log(`[${account.label}] Batch: SKT module loaded, navigating to skt02006...`);
        this.pendingDownloadPhase = 'batch-skt02006-options';
        this.injectLeftMenu(win, account);
        this.reinjectBatchStatus(win);
        this.clickMenuItemForSkt02006(win, account);
      } else if (currentURL.toLowerCase().includes('skt02006') && this.pendingBatchDownload) {
        // Handle skt02006 page loads for batch direksiyon takip
        if (this.pendingDownloadPhase === 'batch-skt02006-options') {
          console.log(`[${account.label}] Batch: skt02006 loaded, scraping options...`);
          this.injectLeftMenu(win, account);
          this.handleSkt02006Options(win, account);
        } else if (this.pendingDownloadPhase === 'batch-skt02006-results') {
          console.log(`[${account.label}] Batch: skt02006 results loaded, scraping student list...`);
          this.injectLeftMenu(win, account);
          this.reinjectBatchStatus(win);
          this.handleSkt02006Results(win, account);
        } else {
          this.hideStatus(win);
          this.injectLeftMenu(win, account);
        }
      } else if (currentURL.toLowerCase().includes('skt02009')) {
        // Handle skt02009 page loads for direksiyon takip download
        if (this.pendingDownload && this.pendingDownloadPhase === 'navigate') {
          // First load: page loaded after menu click, fill TC and search
          this.pendingDownloadPhase = 'search';
          this.injectLeftMenu(win, account);
          this.handleSkt02009Loaded(win, account);
        } else if (this.pendingDownload && this.pendingDownloadPhase === 'search') {
          // Second load: results after form submission
          this.pendingDownloadPhase = null;
          this.injectLeftMenu(win, account);
          this.handleSkt02009Results(win, account);
        } else if (this.pendingSimulatorReport && this.pendingDownloadPhase === 'navigate-simulator') {
          // Simulator: page loaded, fill TC and search
          this.pendingDownloadPhase = 'search-simulator';
          this.injectLeftMenu(win, account);
          this.handleSkt02009SimulatorLoaded(win, account);
        } else if (this.pendingSimulatorReport && this.pendingDownloadPhase === 'search-simulator') {
          // Simulator: results loaded, extract simulator sessions and generate PDF
          this.pendingDownloadPhase = null;
          this.injectLeftMenu(win, account);
          this.handleSkt02009SimulatorResults(win, account);
        } else if (this.pendingBatchDownload && this.pendingDownloadPhase === 'batch-skt02009-navigate') {
          // Batch: skt02009 loaded for current student, fill TC and search
          console.log(`[${account.label}] Batch: skt02009 loaded, filling TC for student ${this.pendingBatchDownload.currentStudentIndex + 1}/${this.pendingBatchDownload.students.length}...`);
          this.pendingDownloadPhase = 'batch-skt02009-results';
          this.injectLeftMenu(win, account);
          this.reinjectBatchStatus(win);
          this.handleBatchStudentNavigate(win, account);
        } else if (this.pendingBatchDownload && this.pendingDownloadPhase === 'batch-skt02009-results') {
          // Batch: skt02009 results loaded, scrape data and generate PDF
          console.log(`[${account.label}] Batch: skt02009 results loaded, processing student...`);
          this.injectLeftMenu(win, account);
          this.reinjectBatchStatus(win);
          this.handleBatchStudentResults(win, account);
        } else {
          // Normal visit to skt02009 (not triggered by download)
          this.hideStatus(win);
          this.injectLeftMenu(win, account);
        }
      } else {
        // Successfully past login - reset attempts counter
        this.loginAttempts.set(account.id, 0);
        console.log(`[${account.label}] Success! Hiding status`);
        this.hideStatus(win);
        this.injectLeftMenu(win, account);
      }
    });

    win.webContents.on('dom-ready', () => {
      const currentURL = win.webContents.getURL();
      console.log(`[${account.label}] DOM READY: ${currentURL}`);
      if (!this.isLoginPage(currentURL)) {
        this.injectLeftMenu(win, account);
      }
      if (this.isLoginPage(currentURL)) {
        const attempts = this.loginAttempts.get(account.id) || 0;
        if (attempts < 3) {
          console.log(`[${account.label}] Login page (dom-ready), auto-filling...`);
          this.showStatus(win, 'TRYING LOGIN...', '#FF6B6B');
          this.autoFillLogin(win, account);
        }
      }
    });

    console.log(`========== STARTED: ${account.label} ==========\n`);
  }

  private async autoFillLogin(win: BrowserWindow, account: Account) {
    if (win.isDestroyed()) return;
    console.log(`[${account.label}] Injecting auto-fill script...`);

    const script = `
      (function() {
        console.log('[MEBBIS] Auto-fill script loaded');
        function tryFill() {
          const usernameField = document.getElementById('txtKullaniciAd');
          const passwordField = document.getElementById('txtSifre');
          console.log('[MEBBIS] Looking for fields: username=' + !!usernameField + ', password=' + !!passwordField);
          
          if (usernameField && passwordField) {
            console.log('[MEBBIS] Found form fields, filling...');
            usernameField.value = ${JSON.stringify(account.username)};
            passwordField.value = ${JSON.stringify(account.password)};
            console.log('[MEBBIS] Values set: username=' + usernameField.value + ', password_length=' + passwordField.value.length);
            
            usernameField.dispatchEvent(new Event('input', { bubbles: true }));
            usernameField.dispatchEvent(new Event('change', { bubbles: true }));
            passwordField.dispatchEvent(new Event('input', { bubbles: true }));
            passwordField.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('[MEBBIS] Events triggered');
            
            setTimeout(() => {
              console.log('[MEBBIS] Looking for submit button...');
              const submitBtn = 
                document.getElementById('btnGiris') ||
                document.getElementById('dogrula') ||
                document.querySelector('button[id*="Giris"]') ||
                document.querySelector('button[id*="giris"]') ||
                document.querySelector('input[type="submit"]') ||
                Array.from(document.querySelectorAll('button')).find(b => 
                  b.textContent.includes('Giriş') || b.textContent.includes('giriş')
                );
              
              console.log('[MEBBIS] Submit button found: ' + !!submitBtn);
              if (submitBtn) {
                console.log('[MEBBIS] Button: id=' + submitBtn.id + ', name=' + submitBtn.name + ', text=' + submitBtn.textContent);
                console.log('[MEBBIS] *** CLICKING LOGIN BUTTON ***');
                submitBtn.click();
              } else {
                console.log('[MEBBIS] No button, trying form.submit()');
                const form = usernameField.closest('form');
                if (form) {
                  console.log('[MEBBIS] *** SUBMITTING FORM ***');
                  form.submit();
                } else {
                  console.log('[MEBBIS] ERROR: No form found');
                }
              }
            }, 300);
            return true;
          }
          return false;
        }
        
        console.log('[MEBBIS] Trying initial fill...');
        if (!tryFill()) {
          console.log('[MEBBIS] Initial failed, retrying 10 times...');
          let attempts = 0;
          const interval = setInterval(() => {
            attempts++;
            console.log('[MEBBIS] Retry ' + attempts + '/10');
            if (tryFill() || attempts >= 10) {
              if (attempts >= 10) console.log('[MEBBIS] Max retries reached');
              clearInterval(interval);
            }
          }, 500);
        }
      })();
    `;

    try {
      await win.webContents.executeJavaScript(script);
      console.log(`[${account.label}] Auto-fill script executed`);
    } catch (e) {
      console.error(`[${account.label}] Auto-fill error:`, e);
    }
  }

  private showStatus(win: BrowserWindow, message: string, color: string) {
    const script = `
      (function() {
        let statusBar = document.getElementById('mebbis-status-bar');
        if (!statusBar) {
          statusBar = document.createElement('div');
          statusBar.id = 'mebbis-status-bar';
          statusBar.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; z-index: 999999; background: ${color}; color: white; padding: 12px 20px; font-size: 14px; font-weight: bold; box-shadow: 0 2px 10px rgba(0,0,0,0.3); text-align: center; font-family: Arial, sans-serif;';
          document.body.appendChild(statusBar);
        }
        statusBar.textContent = '${message}';
        statusBar.style.background = '${color}';
        console.log('[MEBBIS] Status: ${message}');
      })();
    `;

    if (!win.isDestroyed()) {
      win.webContents.executeJavaScript(script).catch(e => {
        console.error('Status bar error:', e);
      });
    }
  }

  private hideStatus(win: BrowserWindow) {
    const script = `
      (function() {
        const statusBar = document.getElementById('mebbis-status-bar');
        if (statusBar) {
          statusBar.style.display = 'none';
          console.log('[MEBBIS] Status bar hidden');
        }
      })();
    `;

    if (!win.isDestroyed()) {
      win.webContents.executeJavaScript(script).catch(e => {
        console.error('Hide status error:', e);
      });
    }
  }

  private async injectLeftMenu(win: BrowserWindow, account: Account) {
    if (win.isDestroyed()) return;

    const script = `
      (function() {
        if (document.getElementById('mebbis-left-menu')) return;

        const sidebar = document.createElement('div');
        sidebar.id = 'mebbis-left-menu';
        sidebar.style.cssText = 'position: fixed; left: 0; top: 0; bottom: 0; width: 200px; z-index: 10000; background: #1a1a2e; border-right: 1px solid #2a2a4a; display: flex; flex-direction: column; color: white; font-family: Arial, sans-serif; overflow-y: auto;';

        const title = document.createElement('div');
        title.style.cssText = 'padding: 15px; border-bottom: 1px solid #2a2a4a; font-weight: bold; color: #4361ee;';
        title.textContent = 'Menu';
        sidebar.appendChild(title);

        const items = [
          { label: 'Direksiyon Takip İndir', action: 'direksiyon' },
          { label: 'Çoklu Direksiyon Takip', action: 'coklu-direksiyon' },
          { label: 'Simulasyon Raporu Oluştur', action: 'simulasyon' },
          { label: 'Çoklu Simulasyon Raporu', action: 'coklu-simulasyon' },
        ];

        items.forEach(item => {
          const btn = document.createElement('button');
          btn.style.cssText = 'background: none; border: none; width: 100%; padding: 12px 15px; text-align: left; color: #ccc; cursor: pointer; border-bottom: 1px solid #2a2a4a; font-size: 14px; transition: all 0.2s;';
          btn.textContent = item.label;
          btn.onmouseover = () => {
            btn.style.background = '#2a2a4a';
            btn.style.color = '#4361ee';
          };
          btn.onmouseout = () => {
            btn.style.background = 'none';
            btn.style.color = '#ccc';
          };
          btn.onclick = () => {
            if (item.action === 'simulasyon') {
              // Show simulator report modal with simulator type selection
              let overlay = document.getElementById('mebbis-modal-overlay');
              if (overlay) { overlay.remove(); }

              overlay = document.createElement('div');
              overlay.id = 'mebbis-modal-overlay';
              overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 99999; display: flex; align-items: center; justify-content: center;';

              const modal = document.createElement('div');
              modal.style.cssText = 'background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 8px; padding: 24px; width: 380px; font-family: Arial, sans-serif; color: white;';

              const modalTitle = document.createElement('h3');
              modalTitle.style.cssText = 'margin: 0 0 16px 0; color: #4361ee; font-size: 16px;';
              modalTitle.textContent = 'Simulasyon Raporu İndir';
              modal.appendChild(modalTitle);

              const tcLabel = document.createElement('label');
              tcLabel.style.cssText = 'display: block; margin-bottom: 8px; font-size: 14px; color: #ccc;';
              tcLabel.textContent = 'TC Kimlik No';
              modal.appendChild(tcLabel);

              const tcInput = document.createElement('input');
              tcInput.type = 'text';
              tcInput.maxLength = 11;
              tcInput.placeholder = 'TC Kimlik No';
              tcInput.style.cssText = 'width: 100%; padding: 10px; border: 1px solid #2a2a4a; border-radius: 4px; background: #16213e; color: white; font-size: 14px; box-sizing: border-box; outline: none; margin-bottom: 16px;';
              tcInput.onfocus = () => { tcInput.style.borderColor = '#4361ee'; };
              tcInput.onblur = () => { tcInput.style.borderColor = '#2a2a4a'; };
              modal.appendChild(tcInput);

              const simTypeLabel = document.createElement('label');
              simTypeLabel.style.cssText = 'display: block; margin-bottom: 12px; font-size: 14px; color: #ccc;';
              simTypeLabel.textContent = 'Simülasyon Makinesi';
              modal.appendChild(simTypeLabel);

              const radioContainer = document.createElement('div');
              radioContainer.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;';

              const sesimRadio = document.createElement('label');
              sesimRadio.style.cssText = 'display: flex; align-items: center; cursor: pointer; font-size: 14px; color: #ccc;';
              sesimRadio.innerHTML = '<input type="radio" name="simType" value="sesim" style="margin-right: 8px;"> Sesim (1 rapor)';
              radioContainer.appendChild(sesimRadio);

              const anagrupRadio = document.createElement('label');
              anagrupRadio.style.cssText = 'display: flex; align-items: center; cursor: pointer; font-size: 14px; color: #ccc;';
              anagrupRadio.innerHTML = '<input type="radio" name="simType" value="ana_grup" style="margin-right: 8px;"> Ana Grup (11 rapor)';
              radioContainer.appendChild(anagrupRadio);

              const bothRadio = document.createElement('label');
              bothRadio.style.cssText = 'display: flex; align-items: center; cursor: pointer; font-size: 14px; color: #ccc;';
              bothRadio.innerHTML = '<input type="radio" name="simType" value="both" checked style="margin-right: 8px;"> Her İkisi (12 rapor)';
              radioContainer.appendChild(bothRadio);

              modal.appendChild(radioContainer);

              const btnRow = document.createElement('div');
              btnRow.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;';

              const cancelBtn = document.createElement('button');
              cancelBtn.textContent = 'İptal';
              cancelBtn.style.cssText = 'padding: 8px 16px; border: 1px solid #2a2a4a; border-radius: 4px; background: none; color: #ccc; cursor: pointer; font-size: 14px;';
              cancelBtn.onclick = () => { overlay.remove(); };
              btnRow.appendChild(cancelBtn);

              const submitBtn = document.createElement('button');
              submitBtn.textContent = 'İndir';
              submitBtn.style.cssText = 'padding: 8px 16px; border: none; border-radius: 4px; background: #4361ee; color: white; cursor: pointer; font-size: 14px;';
              submitBtn.onclick = () => {
                const tc = tcInput.value.trim();
                if (tc.length !== 11 || !/^[0-9]+$/.test(tc)) {
                  tcInput.style.borderColor = '#ff4444';
                  return;
                }
                const simType = document.querySelector('input[name="simType"]:checked')?.value || 'sesim';
                console.log('MEBBIS_SIMULATION_REPORT:' + tc + '|||' + simType);
                submitBtn.disabled = true;
                submitBtn.textContent = 'Yükleniyor...';
                submitBtn.style.opacity = '0.6';
              };
              btnRow.appendChild(submitBtn);

              modal.appendChild(btnRow);
              overlay.appendChild(modal);
              overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
              document.body.appendChild(overlay);
              tcInput.focus();
              return;
            }

            if (item.action === 'coklu-direksiyon') {
              console.log('MEBBIS_BATCH_DIREKSIYON');
              return;
            }

            if (item.action === 'coklu-simulasyon') {
              console.log('MEBBIS_BATCH_SIMULATOR');
              return;
            }

            // Show TC modal for Direksiyon Takip
            let overlay = document.getElementById('mebbis-modal-overlay');
            if (overlay) { overlay.remove(); }

            overlay = document.createElement('div');
            overlay.id = 'mebbis-modal-overlay';
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 99999; display: flex; align-items: center; justify-content: center;';

            const modal = document.createElement('div');
            modal.style.cssText = 'background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 8px; padding: 24px; width: 350px; font-family: Arial, sans-serif; color: white;';

            const modalTitle = document.createElement('h3');
            modalTitle.style.cssText = 'margin: 0 0 16px 0; color: #4361ee; font-size: 16px;';
            modalTitle.textContent = 'Direksiyon Takip İndir';
            modal.appendChild(modalTitle);

            const label = document.createElement('label');
            label.style.cssText = 'display: block; margin-bottom: 8px; font-size: 14px; color: #ccc;';
            label.textContent = 'TC Giriniz';
            modal.appendChild(label);

            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 11;
            input.placeholder = 'TC Kimlik No';
            input.style.cssText = 'width: 100%; padding: 10px; border: 1px solid #2a2a4a; border-radius: 4px; background: #16213e; color: white; font-size: 14px; box-sizing: border-box; outline: none;';
            input.onfocus = () => { input.style.borderColor = '#4361ee'; };
            input.onblur = () => { input.style.borderColor = '#2a2a4a'; };
            modal.appendChild(input);

            const sinifLabel = document.createElement('label');
            sinifLabel.style.cssText = 'display: block; margin-top: 12px; margin-bottom: 8px; font-size: 14px; color: #ccc;';
            sinifLabel.textContent = 'Sınıf Seçiniz';
            modal.appendChild(sinifLabel);

            const sinifSelect = document.createElement('select');
            sinifSelect.style.cssText = 'width: 100%; padding: 10px; border: 1px solid #2a2a4a; border-radius: 4px; background: #16213e; color: white; font-size: 14px; box-sizing: border-box; outline: none; cursor: pointer;';
            sinifSelect.onfocus = () => { sinifSelect.style.borderColor = '#4361ee'; };
            sinifSelect.onblur = () => { sinifSelect.style.borderColor = '#2a2a4a'; };
            const sinifOptions = [
              { label: 'Yeni B (16 ders)', value: '0,B|16' },
              { label: 'Yeni A (14 ders)', value: '0,A|14' },
              { label: 'A1 \u2192 A2 (6 ders)', value: 'A1,A2|6' },
              { label: 'A2 \u2192 A (12 ders)', value: 'A2,A|12' },
              { label: 'A \u2192 B (14 ders)', value: 'A,B|14' },
              { label: 'B \u2192 A1 (12 ders)', value: 'B,A1|12' },
              { label: 'B \u2192 A2 (12 ders)', value: 'B,A2|12' },
              { label: 'B \u2192 A (12 ders)', value: 'B,A|12' },
              { label: 'B \u2192 BE (6 ders)', value: 'B,BE|6' },
              { label: 'B \u2192 C (12 ders)', value: 'B,C|12' },
              { label: 'B \u2192 D1 (7 ders)', value: 'B,D1|7' },
              { label: 'B(2016 \u00d6ncesi) \u2192 C (12 ders)', value: 'B(2016 \u00d6ncesi),C|12' },
              { label: 'B(2016 Sonras\u0131) \u2192 C (20 ders)', value: 'B(2016 Sonras\u0131),C|20' },
              { label: 'B(2016 \u00d6ncesi) \u2192 D (7 ders)', value: 'B(2016 \u00d6ncesi),D|7' },
              { label: 'C \u2192 CE (6 ders)', value: 'C,CE|6' },
              { label: 'C \u2192 D (7 ders)', value: 'C,D|7' },
              { label: 'C \u2192 D1 (4 ders)', value: 'C,D1|4' },
              { label: 'C \u2192 A2 (12 ders)', value: 'C,A2|12' },
              { label: 'D \u2192 C (10 ders)', value: 'D,C|10' },
              { label: 'D1 \u2192 D (6 ders)', value: 'D1,D|6' },
            ];
            sinifOptions.forEach(opt => {
              const option = document.createElement('option');
              option.value = opt.value;
              option.textContent = opt.label;
              option.style.cssText = 'color: white; background-color: #16213e;';
              sinifSelect.appendChild(option);
            });
            modal.appendChild(sinifSelect);

            const btnRow = document.createElement('div');
            btnRow.style.cssText = 'display: flex; gap: 10px; margin-top: 16px; justify-content: flex-end;';

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'İptal';
            cancelBtn.style.cssText = 'padding: 8px 16px; border: 1px solid #2a2a4a; border-radius: 4px; background: none; color: #ccc; cursor: pointer; font-size: 14px;';
            cancelBtn.onclick = () => { overlay.remove(); };
            btnRow.appendChild(cancelBtn);

            const submitBtn = document.createElement('button');
            submitBtn.textContent = 'İndir';
            submitBtn.style.cssText = 'padding: 8px 16px; border: none; border-radius: 4px; background: #4361ee; color: white; cursor: pointer; font-size: 14px;';
            submitBtn.onclick = () => {
              const tc = input.value.trim();
              if (tc.length !== 11 || !/^[0-9]+$/.test(tc)) {
                input.style.borderColor = '#ff4444';
                return;
              }
              console.log('MEBBIS_DOWNLOAD_TC:' + tc + '|||' + sinifSelect.value);
              submitBtn.disabled = true;
              submitBtn.textContent = 'Yükleniyor...';
              submitBtn.style.opacity = '0.6';
            };
            btnRow.appendChild(submitBtn);

            modal.appendChild(btnRow);
            overlay.appendChild(modal);
            overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
            document.body.appendChild(overlay);
            input.focus();
          };
          sidebar.appendChild(btn);
        });

        ${!app.isPackaged ? `
        // Developer menu section
        const devTitle = document.createElement('div');
        devTitle.style.cssText = 'padding: 10px 15px; border-top: 2px solid #ff6b35; border-bottom: 1px solid #2a2a4a; font-weight: bold; color: #ff6b35; font-size: 12px; margin-top: auto;';
        devTitle.textContent = '⚙ Developer';
        sidebar.appendChild(devTitle);

        const refreshBtn = document.createElement('button');
        refreshBtn.id = 'dev-auto-refresh-btn';
        refreshBtn.style.cssText = 'background: none; border: none; width: 100%; padding: 12px 15px; text-align: left; color: #ccc; cursor: pointer; border-bottom: 1px solid #2a2a4a; font-size: 13px; transition: all 0.2s;';
        refreshBtn.textContent = '⟳ Auto Refresh (30s)';
        refreshBtn.onmouseover = () => { refreshBtn.style.background = '#2a2a4a'; refreshBtn.style.color = '#ff6b35'; };
        refreshBtn.onmouseout = () => { if (!refreshBtn.dataset.active) { refreshBtn.style.background = 'none'; refreshBtn.style.color = '#ccc'; } };
        refreshBtn.onclick = () => {
          const isActive = refreshBtn.dataset.active === '1';
          if (isActive) {
            refreshBtn.dataset.active = '';
            refreshBtn.textContent = '⟳ Auto Refresh (30s)';
            refreshBtn.style.background = 'none';
            refreshBtn.style.color = '#ccc';
          } else {
            refreshBtn.dataset.active = '1';
            refreshBtn.textContent = '⟳ Auto Refresh (ON)';
            refreshBtn.style.background = '#3a1a0a';
            refreshBtn.style.color = '#ff6b35';
          }
          console.log('MEBBIS_DEV_AUTO_REFRESH');
        };
        sidebar.appendChild(refreshBtn);
        ` : ''}

        if (document.body) {
          document.body.appendChild(sidebar);
          const style = document.createElement('style');
          style.textContent = 'body { margin-left: 200px !important; } main { margin-left: 0 !important; }';
          document.head.appendChild(style);
          console.log('[MEBBIS] Left menu injected');
        }
      })();
    `;

    try {
      await win.webContents.executeJavaScript(script);
    } catch (e) {
      console.error('Left menu injection error:', e);
    }
  }

  stop(accountId: string) {
    const entry = this.running.get(accountId);
    if (entry && !entry.window.isDestroyed()) {
      const partition = `persist:mebbis-${accountId}`;
      const ses = session.fromPartition(partition);
      ses.cookies.flushStore().then(() => {
        console.log(`[${entry.account.label}] Cookies flushed to disk`);
      }).catch(e => console.error('Flush error:', e));
      entry.window.close();
    }
    this.running.delete(accountId);
  }

  focus(accountId: string) {
    const entry = this.running.get(accountId);
    if (entry && !entry.window.isDestroyed()) {
      entry.window.focus();
    }
  }

  isRunning(accountId: string): boolean {
    const entry = this.running.get(accountId);
    return !!entry && !entry.window.isDestroyed();
  }

  private isLoginPage(url: string): boolean {
    const lower = url.toLowerCase();
    // default.aspx is always a login page (with any query params: ?tkn, ?lg1, ?NoSession, etc.)
    if (lower.includes('default.aspx')) return true;
    return false;
  }

  private async saveResponse(win: BrowserWindow, account: Account, url: string) {
    try {
      if (win.isDestroyed()) return;
      const html = await win.webContents.executeJavaScript('document.documentElement.outerHTML');
      const responsesDir = path.join(__dirname, '..', '..', 'responses');
      if (!fs.existsSync(responsesDir)) {
        fs.mkdirSync(responsesDir, { recursive: true });
      }
      // Extract page name from URL
      const urlObj = new URL(url);
      const pageName = urlObj.pathname.split('/').pop()?.replace(/\.aspx$/i, '') || 'unknown';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${account.label}_${pageName}_${timestamp}.html`;
      const filePath = path.join(responsesDir, filename);
      fs.writeFileSync(filePath, html, 'utf-8');
      console.log(`[${account.label}] Response saved: ${filename}`);
    } catch (e) {
      console.error(`[${account.label}] Failed to save response:`, e);
    }
  }

  private async downloadDireksiyonTakip(tc: string, _partition: string, account: Account, parentWin: BrowserWindow, sinif?: string) {
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

    // Store the TC and sinif so we can use it after navigation
    this.pendingDownload = { tc, sinif: sinif || '0,B|16', account, parentWin };

    const currentURL = parentWin.webContents.getURL().toLowerCase();

    if (currentURL.includes('skt00001') || currentURL.includes('/skt/')) {
      // Already on an SKT page, can click directly to skt02009
      this.pendingDownloadPhase = 'navigate';
      this.clickMenuItemForSkt02009(parentWin, account);
    } else {
      // On main.aspx or other non-SKT page, first navigate to SKT module
      this.pendingDownloadPhase = 'skt-module';
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
        this.pendingDownload = null;
        this.pendingDownloadPhase = null;
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

  private async clickMenuItemForSkt02009(win: BrowserWindow, account: Account) {
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
      this.pendingDownload = null;
      this.pendingSimulatorReport = null;
      this.pendingDownloadPhase = null;
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

  private async handleSktModuleLoaded(win: BrowserWindow, account: Account) {
    // SKT module page loaded, now click the skt02009 menu item
    this.clickMenuItemForSkt02009(win, account);
  }

  private pendingDownload: { tc: string; sinif: string; account: Account; parentWin: BrowserWindow } | null = null;
  private pendingDownloadPhase:
    'skt-module' | 'navigate' | 'search' | 'navigate-simulator' | 'search-simulator' |
    'batch-skt-module' | 'batch-navigate-skt02006' | 'batch-skt02006-options' |
    'batch-skt02006-results' | 'batch-skt02009-navigate' | 'batch-skt02009-results' | null = null;

  private pendingBatchDownload: {
    batchType: 'direksiyon' | 'simulator';
    options: { donemi: string; ogrenciDurumu: string; onayDurumu: string; grubu: string; subesi: string; simType?: string };
    donemList: { value: string; label: string }[];
    currentDonemIndex: number;
    students: { tc: string; name: string }[];
    processedTcs: Set<string>;
    currentStudentIndex: number;
    outputDir: string;
    account: Account;
    parentWin: BrowserWindow;
    completed: number;
    failed: number;
    statusMessage: string;
  } | null = null;

  private async handleSkt02009Loaded(win: BrowserWindow, account: Account) {
    if (!this.pendingDownload || this.pendingDownload.parentWin !== win) return;
    const { tc, parentWin } = this.pendingDownload;
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
      this.pendingDownload = null;
      this.pendingDownloadPhase = null;
    }
  }

  private async handleSkt02009Results(win: BrowserWindow, account: Account) {
    if (!this.pendingDownload || this.pendingDownload.parentWin !== win) return;
    const { tc, sinif, parentWin } = this.pendingDownload;
    this.pendingDownload = null;
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

          // Filter to most recent period (column 0 = Dönemi)
          // Find the last period value in the table
          let filteredLessons = lessons;
          if (lessons.length > 0) {
            const lastPeriod = lessons[lessons.length - 1][0];
            if (lastPeriod) {
              filteredLessons = lessons.filter(l => l[0] === lastPeriod);
            }
          }
          
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
      const pdfBuffer = await this.generatePdfFromTemplate(lessonData.studentInfo, lessonData.lessons, sinif);

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

  private async handleSkt02009SimulatorLoaded(win: BrowserWindow, account: Account) {
    if (!this.pendingSimulatorReport) return;
    const { tc } = this.pendingSimulatorReport;
    console.log(`[${account.label}] skt02009 loaded for simulator, filling TC: ${tc}`);

    // Update modal status
    const parentWin = this.running.get(account.id)?.window;
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
      this.pendingSimulatorReport = null;
      this.pendingDownloadPhase = null;
    }
  }

  private async handleSkt02009SimulatorResults(win: BrowserWindow, account: Account) {
    if (!this.pendingSimulatorReport) return;
    const { tc, simulationType } = this.pendingSimulatorReport;
    this.pendingSimulatorReport = null;
    console.log(`[${account.label}] skt02009 simulator results loaded, scraping for ${simulationType}...`);

    const parentWin = this.running.get(account.id)?.window;

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
          // Filter to most recent period
          let filteredLessons = lessons;
          if (lessons.length > 0) {
            const lastPeriod = lessons[lessons.length - 1][0];
            if (lastPeriod) {
              filteredLessons = lessons.filter(l => l[0] === lastPeriod);
            }
          }
          return { studentInfo, lessons: filteredLessons };
        })();
      `);

      if (lessonData.error) {
        throw new Error(lessonData.error);
      }

      // Filter for simulator sessions only
      let simulatorSessions = this.extractSimulatorSessions(lessonData.lessons);
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
      const savedDir = await this.generateSimulatorReportPdf(
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

  private fetchSimulatorTemplate(templateName: string): Promise<string> {
    const url = `${SIMULATOR_TEMPLATE_BASE_URL}/${templateName}`;
    return new Promise((resolve, reject) => {
      const req = https.get(url, { timeout: 15000 }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${templateName}`));
          return;
        }
        res.setEncoding('utf-8');
        let data = '';
        res.on('data', (chunk: string) => { data += chunk; });
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
  }

  private async generatePdfFromHtml(html: string): Promise<Buffer> {
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

  private async generatePdfFromTemplate(
    studentInfo: { 'ad-soyad': string; 'tc-kimlik-no': string; 'istenen-sertifika': string },
    lessons: string[][],
    sinif?: string
  ): Promise<Buffer> {
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

    const supportedCounts = [4, 6, 7, 10, 12, 14, 16, 20];
    let closestCount = 4;
    for (const count of supportedCounts) {
      if (lessonCount <= count) {
        closestCount = count;
        break;
      }
    }
    if (lessonCount > 20) closestCount = 20;

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
      html = await this.fetchTemplate(templateName);
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

  private async handleSimulationReport(tc: string, simulationType: string, account: Account, parentWin: BrowserWindow) {
    console.log(`[${account.label}] Simulator report for TC: ${tc}, simulationType: ${simulationType}`);

    this.pendingSimulatorReport = { tc, simulationType, account };

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
      this.pendingDownloadPhase = 'navigate-simulator';
      this.clickMenuItemForSkt02009(parentWin, account);
    } else {
      // On main.aspx or other non-SKT page, first navigate to SKT module
      this.pendingDownloadPhase = 'skt-module';
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
        this.pendingSimulatorReport = null;
        this.pendingDownloadPhase = null;
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

  /**
   * Extract simulator sessions from lesson records
   * Returns only lessons where ders_yeri contains "Simulatör" or "Direksiyon Eğitim Alanı"
   */
  private extractSimulatorSessions(lessons: string[][]): string[][] {
    return lessons.filter(lesson => {
      const dersYeri = lesson[5]?.trim() || '';
      return dersYeri.toLowerCase().includes('simulatör') || 
             dersYeri.toLowerCase().includes('direksiyon eğitim');
    });
  }

  /**
   * Generate Simulator Report PDF locally
   * Similar to PDF generation flow but uses sesim/anagrup templates
   */
  private async generateSimulatorReportPdf(
    studentInfo: { 'ad-soyad': string; 'tc-kimlik-no': string; 'istenen-sertifika': string },
    simulatorSessions: string[][],
    simulationType: string,
    account: Account,
    parentWindow: BrowserWindow
  ): Promise<string> {
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
      const htmlContent = await this.generateSesimHtml(studentInfo, simulatorSessions, account.label);
      const pdfBuffer = await this.generatePdfFromHtml(htmlContent);
      fs.writeFileSync(path.join(studentDir, 'sesim.pdf'), pdfBuffer);
      console.log(`[${account.label}] Saved sesim.pdf`);
    }

    if (simulationType === 'ana_grup' || simulationType === 'both') {
      const scenarios = this.getAnagrupScenarios();
      const baseTemplate = await this.fetchSimulatorTemplate('anagrup/anagrup.html');

      for (let i = 0; i < scenarios.length; i++) {
        const scenario = scenarios[i];
        console.log(`[${account.label}] Generating anagrup PDF ${i + 1}/${scenarios.length}: ${scenario}`);

        const html = this.generateAnagrupHtml(baseTemplate, {
          studentName: studentInfo['ad-soyad'],
          instructorName,
          date1, time1, date2, time2, donem,
          scenario,
          accountLabel: account.label,
          isDual,
        });

        const scenarioPdf = await this.generatePdfFromHtml(html);
        const safeScenarioName = scenario.replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9 ]/g, '').trim();
        fs.writeFileSync(path.join(studentDir, `${i + 1}_${safeScenarioName}.pdf`), scenarioPdf);
      }
    }

    // Always generate EK4 alongside simulator reports
    const ek4Html = await this.generateEk4Html(
      studentInfo['ad-soyad'],
      record?.[4] || '',  // plaka (araç plakası col 4)
      instructorName,
      account.label,
      date1,               // tarih (ders tarihi)
    );
    const ek4Pdf = await this.generatePdfFromHtml(ek4Html);
    fs.writeFileSync(path.join(studentDir, 'ek4.pdf'), ek4Pdf);
    console.log(`[${account.label}] Saved ek4.pdf`);

    return studentDir;
  }

  /**
   * Generate Sesim HTML from template with session data
   * Matches PHP sesimkaydet() for single session, sesimkaydet2() for dual sessions
   * Generates 16 timing rows with 6-min intervals (8-min for rows 8 and 16)
   * +18min break gap at row 8 for single session, switches to session 2 for dual
   */
  private async generateSesimHtml(
    studentInfo: any,
    sessions: string[][],
    accountLabel: string
  ): Promise<string> {
    const templateContent = await this.fetchSimulatorTemplate('sesim/sesim.html');
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

  private generateAnagrupHtml(
    baseTemplate: string,
    data: {
      studentName: string; instructorName: string;
      date1: string; time1: string; date2: string; time2: string;
      donem: string; scenario: string; accountLabel: string; isDual: boolean;
    }
  ): string {
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

  /**
   * Get list of anagrup scenarios
   */
  private getAnagrupScenarios(): string[] {
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

  private pendingSimulatorReport: { tc: string; simulationType: string; account: Account } | null = null;

  private fetchTemplate(templateName: string): Promise<string> {
    const url = `${TEMPLATE_BASE_URL}/${encodeURIComponent(templateName)}`;
    return new Promise((resolve, reject) => {
      const req = https.get(url, { timeout: 15000 }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        res.setEncoding('utf-8');
        let data = '';
        res.on('data', (chunk: string) => { data += chunk; });
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
  }

  // ==================== BATCH DİREKSİYON TAKİP / SİMÜLATÖR ====================

  private async handleBatchDireksiyon(account: Account, parentWin: BrowserWindow) {
    this.handleBatchGeneric('direksiyon', account, parentWin);
  }

  private async handleBatchGeneric(batchType: 'direksiyon' | 'simulator', account: Account, parentWin: BrowserWindow) {
    const labels: Record<string, string> = { direksiyon: 'Çoklu Direksiyon Takip', simulator: 'Çoklu Simülatör Raporu' };
    console.log(`[${account.label}] Starting batch ${batchType}...`);

    // Initialize batch state
    this.pendingBatchDownload = {
      batchType,
      options: { donemi: '', ogrenciDurumu: '0', onayDurumu: '4', grubu: '-1', subesi: '-1' },
      donemList: [],
      currentDonemIndex: 0,
      students: [],
      processedTcs: new Set<string>(),
      currentStudentIndex: 0,
      outputDir: '',
      account,
      parentWin,
      completed: 0,
      failed: 0,
      statusMessage: 'Başlatılıyor...',
    };

    const currentURL = parentWin.webContents.getURL().toLowerCase();

    if (currentURL.includes('skt02006')) {
      // Already on skt02006
      this.pendingDownloadPhase = 'batch-skt02006-options';
      this.handleSkt02006Options(parentWin, account);
    } else if (currentURL.includes('/skt/')) {
      // On an SKT page, navigate directly to skt02006
      this.pendingDownloadPhase = 'batch-skt02006-options';
      this.clickMenuItemForSkt02006(parentWin, account);
    } else {
      // On main page, first navigate to SKT module
      this.pendingDownloadPhase = 'batch-skt-module';
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
        this.pendingBatchDownload = null;
        this.pendingDownloadPhase = null;
      }
    }
  }

  private async clickMenuItemForSkt02006(win: BrowserWindow, account: Account) {
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

  private async handleSkt02006Options(win: BrowserWindow, account: Account) {
    if (!this.pendingBatchDownload) return;
    const batchType = this.pendingBatchDownload.batchType;
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
      this.pendingBatchDownload.donemList = formOptions.donemi || [];

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
          modal.appendChild(createSelect('Eğitim Dönemi', 'batch-donemi', donemOptions, donemOptions[0]?.value || ''));

          const ogrenciOptions = ${JSON.stringify(formOptions.ogrenciDurumu || [])};
          const sertifikaOpt = ogrenciOptions.find(o => o.label.toLowerCase().includes('sertifika almaya'));
          modal.appendChild(createSelect('Öğrenci Durumu', 'batch-ogrenciDurumu',
            ogrenciOptions, sertifikaOpt?.value || ogrenciOptions[0]?.value || ''));

          modal.appendChild(createSelect('Onay Durumu', 'batch-onayDurumu',
            ${JSON.stringify(formOptions.onayDurumu || [])}, '4'));

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
      this.pendingBatchDownload = null;
      this.pendingDownloadPhase = null;
    }
  }

  private async handleBatchStart(
    options: { donemi: string; ogrenciDurumu: string; onayDurumu: string; grubu: string; subesi: string; simType?: string },
    account: Account,
    win: BrowserWindow
  ) {
    if (!this.pendingBatchDownload) return;

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

    this.pendingBatchDownload.outputDir = folderResult.filePaths[0];
    this.pendingBatchDownload.options = options;
    this.pendingBatchDownload.students = [];
    this.pendingBatchDownload.processedTcs = new Set<string>();
    this.pendingBatchDownload.currentStudentIndex = 0;
    this.pendingBatchDownload.completed = 0;
    this.pendingBatchDownload.failed = 0;

    console.log(`[${account.label}] Batch: output dir=${folderResult.filePaths[0]}, options=`, options);

    // Check if the selected dönem is "Tüm Dönemler" by matching its label
    const selectedDonem = this.pendingBatchDownload.donemList.find(d => d.value === options.donemi);
    const isTumDonemler = selectedDonem?.label?.toLowerCase().includes('tüm') || false;

    if (isTumDonemler && this.pendingBatchDownload.donemList.length > 1) {
      // "Tüm Dönemler" selected — loop through each real period
      const realPeriods = this.pendingBatchDownload.donemList.filter(d => !d.label.toLowerCase().includes('tüm'));
      this.pendingBatchDownload.donemList = realPeriods;
      this.pendingBatchDownload.currentDonemIndex = 0;
      if (realPeriods.length === 0) {
        this.showBatchProgress(win, 'Hata: Dönem listesi boş!', '#ff4444');
        this.pendingBatchDownload = null;
        this.pendingDownloadPhase = null;
        return;
      }
      const firstDonem = realPeriods[0];
      this.showBatchProgress(win, `Dönem taranıyor: ${firstDonem.label} (1/${realPeriods.length})...`);
      this.pendingDownloadPhase = 'batch-skt02006-results';
      this.submitSkt02006Form(win, firstDonem.value, options);
    } else {
      // Single period selected
      this.pendingBatchDownload.donemList = []; // No looping
      this.showBatchProgress(win, 'Öğrenci listesi alınıyor...');
      this.pendingDownloadPhase = 'batch-skt02006-results';
      this.submitSkt02006Form(win, options.donemi, options);
    }
  }

  private async submitSkt02006Form(
    win: BrowserWindow,
    donemiValue: string,
    options: { ogrenciDurumu: string; onayDurumu: string; grubu: string; subesi: string }
  ) {
    try {
      await win.webContents.executeJavaScript(`
        (function() {
          function setSelectValue(id, value) {
            const sel = document.getElementById(id);
            if (sel) {
              sel.value = value;
              sel.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
          setSelectValue('cmbEgitimDonemi', '${donemiValue}');
          setSelectValue('cmbOgrenciDurumu', '${options.ogrenciDurumu}');
          setSelectValue('cmbDurumu', '${options.onayDurumu}');
          setSelectValue('cmbGrubu', '${options.grubu}');
          setSelectValue('cmbSubesi', '${options.subesi}');

          setTimeout(() => {
            const submitBtn = document.querySelector('[name="btnListeleGrid"]') ||
                             document.querySelector('input[value="Listele"]') ||
                             document.querySelector('input[type="submit"]');
            if (submitBtn) {
              console.log('[MEBBIS] Clicking Listele button...');
              submitBtn.click();
            } else {
              console.log('[MEBBIS] Listele button not found, trying __doPostBack...');
              if (typeof __doPostBack === 'function') {
                __doPostBack('btnListeleGrid', '');
              }
            }
          }, 500);
        })();
      `);
    } catch (e) {
      console.error(`[${this.pendingBatchDownload?.account.label}] Batch: form submit error:`, e);
      this.pendingBatchDownload = null;
      this.pendingDownloadPhase = null;
    }
  }

  private async handleSkt02006Results(win: BrowserWindow, account: Account) {
    if (!this.pendingBatchDownload) return;

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
            if (cells.length < 3) continue;
            const cellTexts = Array.from(cells).map(c => c.textContent.trim());
            // TC is at column index 2, name at index 1 (based on PHP: $record[2] for TC)
            const tc = cellTexts[2] || '';
            const name = cellTexts[1] || '';
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
        if (!this.pendingBatchDownload.processedTcs.has(student.tc)) {
          this.pendingBatchDownload.processedTcs.add(student.tc);
          this.pendingBatchDownload.students.push(student);
        }
      }

      // Check if we need to process more periods
      if (this.pendingBatchDownload.donemList.length > 0 &&
          this.pendingBatchDownload.currentDonemIndex < this.pendingBatchDownload.donemList.length - 1) {
        // Move to next period
        this.pendingBatchDownload.currentDonemIndex++;
        const nextDonem = this.pendingBatchDownload.donemList[this.pendingBatchDownload.currentDonemIndex];
        const total = this.pendingBatchDownload.donemList.length;
        this.showBatchProgress(win, `Dönem taranıyor: ${nextDonem.label} (${this.pendingBatchDownload.currentDonemIndex + 1}/${total})... Toplam: ${this.pendingBatchDownload.students.length} öğrenci`);
        this.pendingDownloadPhase = 'batch-skt02006-results';
        this.submitSkt02006Form(win, nextDonem.value, this.pendingBatchDownload.options);
        return;
      }

      // All periods processed - start downloading individual student data
      const totalStudents = this.pendingBatchDownload.students.length;
      if (totalStudents === 0) {
        this.showBatchProgress(win, 'Öğrenci bulunamadı!', '#ff4444');
        this.pendingBatchDownload = null;
        this.pendingDownloadPhase = null;
        return;
      }

      console.log(`[${account.label}] Batch: total unique students: ${totalStudents}, starting PDF generation...`);
      this.showBatchProgress(win, `${totalStudents} öğrenci bulundu. PDF oluşturuluyor... (0/${totalStudents})`);

      // Navigate to skt02009 for the first student
      this.pendingBatchDownload.currentStudentIndex = 0;
      this.pendingDownloadPhase = 'batch-skt02009-navigate';
      this.clickMenuItemForSkt02009(win, account);
    } catch (e) {
      console.error(`[${account.label}] Batch: results scrape error:`, e);
      this.showBatchProgress(win, 'Hata: Öğrenci listesi okunamadı', '#ff4444');
      this.pendingBatchDownload = null;
      this.pendingDownloadPhase = null;
    }
  }

  private async handleBatchStudentNavigate(win: BrowserWindow, account: Account) {
    if (!this.pendingBatchDownload) return;
    const { students, currentStudentIndex } = this.pendingBatchDownload;
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
      console.error(`[${account.label}] Batch: TC fill error for ${student.tc}:`, e);
      this.pendingBatchDownload.failed++;
      this.batchProcessNextStudent(win, account);
    }
  }

  private async handleBatchStudentResults(win: BrowserWindow, account: Account) {
    if (!this.pendingBatchDownload) return;
    const { students, currentStudentIndex, outputDir } = this.pendingBatchDownload;
    if (currentStudentIndex >= students.length) return;

    const student = students[currentStudentIndex];
    const total = students.length;

    try {
      // Scrape lesson data (same logic as handleSkt02009Results)
      const lessonData = await win.webContents.executeJavaScript(`
        (function() {
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
          // Filter to most recent period
          let filteredLessons = lessons;
          if (lessons.length > 0) {
            const lastPeriod = lessons[lessons.length - 1][0];
            if (lastPeriod) {
              filteredLessons = lessons.filter(l => l[0] === lastPeriod);
            }
          }
          return { studentInfo, lessons: filteredLessons };
        })();
      `);

      if (lessonData.error) {
        console.log(`[${account.label}] Batch: ${student.tc} - ${lessonData.error}`);
        this.pendingBatchDownload.failed++;
      } else {
        await this.batchGenerateForStudent(lessonData, student, account);
      }
    } catch (e) {
      console.error(`[${account.label}] Batch: PDF error for ${student.tc}:`, e);
      this.pendingBatchDownload.failed++;
    }

    // Update progress and continue
    const completed = this.pendingBatchDownload.completed;
    const failed = this.pendingBatchDownload.failed;
    const processed = completed + failed;
    this.showBatchProgress(win, `PDF oluşturuluyor... (${processed}/${total}) - Başarılı: ${completed}${failed > 0 ? ', Hatalı: ' + failed : ''}`);

    this.batchProcessNextStudent(win, account);
  }

  private async batchGenerateForStudent(
    lessonData: { studentInfo: any; lessons: string[][] },
    student: { tc: string; name: string },
    account: Account
  ) {
    if (!this.pendingBatchDownload) return;
    const { batchType, outputDir } = this.pendingBatchDownload;

    const studentName = (lessonData.studentInfo['ad-soyad'] || student.name || 'unknown')
      .replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9\s]/g, '')
      .replace(/\s+/g, '_');

    if (batchType === 'direksiyon') {
      const pdfBuffer = await this.generatePdfFromTemplate(lessonData.studentInfo, lessonData.lessons);
      const filename = `direksiyon_${student.tc}_${studentName}.pdf`;
      fs.writeFileSync(path.join(outputDir, filename), pdfBuffer);
      console.log(`[${account.label}] Batch: saved ${filename}`);
      this.pendingBatchDownload.completed++;

    } else if (batchType === 'simulator') {
      // Extract simulator sessions
      let simulatorSessions = this.extractSimulatorSessions(lessonData.lessons);
      if (simulatorSessions.length === 0) {
        console.log(`[${account.label}] Batch: ${student.tc} - Simülatör dersi bulunamadı`);
        this.pendingBatchDownload.failed++;
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

      const simType = this.pendingBatchDownload.options.simType || 'both';
      const record = simulatorSessions[0];
      const recordo = simulatorSessions.length >= 2 ? simulatorSessions[1] : null;
      const donem = record?.[0] || 'bilinmeyen';
      const safeDonem = donem.replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9\s\-]/g, '').replace(/\s+/g, '-').trim();

      // Monthly/period-based foldering: outputDir/{period}/{tc}_{name}/
      const periodDir = path.join(outputDir, safeDonem);
      const studentDir = path.join(periodDir, `${student.tc}_${studentName}`);
      if (!fs.existsSync(studentDir)) fs.mkdirSync(studentDir, { recursive: true });

      if (simType === 'sesim' || simType === 'both') {
        const sesimHtml = await this.generateSesimHtml(lessonData.studentInfo, simulatorSessions, account.label);
        const sesimPdf = await this.generatePdfFromHtml(sesimHtml);
        fs.writeFileSync(path.join(studentDir, 'sesim.pdf'), sesimPdf);
      }

      if (simType === 'ana_grup' || simType === 'both') {
        const scenarios = this.getAnagrupScenarios();
        const baseTemplate = await this.fetchSimulatorTemplate('anagrup/anagrup.html');

        for (let i = 0; i < scenarios.length; i++) {
          const html = this.generateAnagrupHtml(baseTemplate, {
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
          const pdf = await this.generatePdfFromHtml(html);
          const safeName = scenarios[i].replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9 ]/g, '').trim();
          fs.writeFileSync(path.join(studentDir, `${i + 1}_${safeName}.pdf`), pdf);
        }
      }

      // Auto-generate EK4 alongside simulator reports
      const ek4Html = await this.generateEk4Html(
        lessonData.studentInfo['ad-soyad'],
        record?.[4] || '',  // plaka
        record?.[8] || '',  // egitmen
        account.label,
        record?.[6] || '',  // tarih
      );
      const ek4Pdf = await this.generatePdfFromHtml(ek4Html);
      fs.writeFileSync(path.join(studentDir, 'ek4.pdf'), ek4Pdf);

      console.log(`[${account.label}] Batch: simulator + ek4 saved for ${student.tc} in ${safeDonem}`);
      this.pendingBatchDownload.completed++;
    }
  }

  private async generateEk4Html(
    studentName: string,
    plateNumber: string,
    instructorName: string,
    companyName: string,
    examDate: string,
  ): Promise<string> {
    const templateContent = await this.fetchSimulatorTemplate('ek4/ek4.html');
    let html = templateContent;

    // Fill data using regex (preserve span attributes)
    html = html.replace(/(<span[^>]*class="kursiyer"[^>]*>)[^<]*(<\/span>)/i, `$1${studentName}$2`);
    html = html.replace(/(<span[^>]*class="plakano"[^>]*>)[^<]*(<\/span>)/i, `$1${plateNumber}$2`);
    html = html.replace(/(<span[^>]*class="egitmen"[^>]*>)[^<]*(<\/span>)/i, `$1${instructorName}$2`);
    html = html.replace(/(<span[^>]*class="companyName"[^>]*>)[^<]*(<\/span>)/i, `$1${companyName.toUpperCase()}$2`);
    html = html.replace(/(<span[^>]*class="tarih"[^>]*>)[^<]*(<\/span>)/i, `$1${examDate}$2`);

    // Randomize separator visibility (matching PHP randomizeSeparators)
    // Hide all .sep elements by adding display:none
    html = html.replace(/class="sep\b/g, 'style="display:none;" class="sep');

    // Separator groups
    const groups = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['10', '11', '12', '13'],
    ];
    const selectedGroup = groups[Math.floor(Math.random() * groups.length)];

    // Show selected group by removing the display:none we just added
    for (const num of selectedGroup) {
      const sepRegex = new RegExp(`style="display:none;" class="sep sep${num}"`, 'g');
      html = html.replace(sepRegex, `class="sep sep${num}"`);
    }

    return html;
  }

  private async batchProcessNextStudent(win: BrowserWindow, account: Account) {
    if (!this.pendingBatchDownload) return;

    this.pendingBatchDownload.currentStudentIndex++;
    const { students, currentStudentIndex } = this.pendingBatchDownload;

    if (currentStudentIndex >= students.length) {
      // All students processed
      const { completed, failed, outputDir, batchType } = this.pendingBatchDownload;
      const titles: Record<string, string> = { direksiyon: 'Çoklu Direksiyon Takip', simulator: 'Çoklu Simülatör Raporu' };
      console.log(`[${account.label}] Batch ${batchType}: completed! ${completed} success, ${failed} failed`);
      this.showBatchProgress(win, `Tamamlandı! ${completed} PDF oluşturuldu${failed > 0 ? ', ' + failed + ' hatalı' : ''}`, '#00cc66');
      this.pendingBatchDownload = null;
      this.pendingDownloadPhase = null;

      // Auto-hide the top bar after 8 seconds
      setTimeout(() => { this.hideBatchStatus(win); }, 8000);

      // Show completion dialog
      dialog.showMessageBox(win, {
        type: 'info',
        title: titles[batchType] || 'Çoklu İndirme',
        message: `${completed} PDF oluşturuldu${failed > 0 ? ', ' + failed + ' hatalı' : ''}.`,
        detail: `Klasör: ${outputDir}`,
        buttons: ['Tamam'],
      }).catch(() => {});
      return;
    }

    // Navigate to skt02009 for the next student
    // Reload skt02009 page to get a fresh form
    this.pendingDownloadPhase = 'batch-skt02009-navigate';
    await win.webContents.executeJavaScript(`
      window.location.href = window.location.pathname;
    `).catch(() => {});
  }

  private showBatchProgress(win: BrowserWindow, message: string, color?: string) {
    if (this.pendingBatchDownload) {
      this.pendingBatchDownload.statusMessage = message;
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

  private hideBatchStatus(win: BrowserWindow) {
    if (!win.isDestroyed()) {
      win.webContents.executeJavaScript(`
        (function() {
          const bar = document.getElementById('mebbis-batch-status-bar');
          if (bar) bar.remove();
        })();
      `).catch(() => {});
    }
  }

  private reinjectBatchStatus(win: BrowserWindow) {
    if (this.pendingBatchDownload && this.pendingBatchDownload.statusMessage) {
      this.showBatchProgress(win, this.pendingBatchDownload.statusMessage);
    }
  }

  // ==================== END BATCH DİREKSİYON / SİMÜLATÖR ====================

  stopAll() {
    console.log('Stopping all accounts and flushing cookies...');
    for (const [id] of this.running) {
      const partition = `persist:mebbis-${id}`;
      const ses = session.fromPartition(partition);
      ses.cookies.flushStore().catch(() => {});
      this.stop(id);
    }
  }
}
