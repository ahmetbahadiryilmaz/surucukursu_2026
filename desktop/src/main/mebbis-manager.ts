import { BrowserWindow, session, dialog } from 'electron';
import { Account } from './account-store';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';

const TEMPLATE_BASE_URL = 'https://online.mtsk.app/templates/direksiyon-takip';

interface RunningAccount {
  account: Account;
  window: BrowserWindow;
}

export class MebbisManager {
  private running: Map<string, RunningAccount> = new Map();
  private loginAttempts: Map<string, number> = new Map();

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
        const tc = message.replace('MEBBIS_DOWNLOAD_TC:', '').trim();
        console.log(`[${account.label}] Download triggered for TC: ${tc}`);
        this.downloadDireksiyonTakip(tc, partition, account, win);
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
    win.loadURL('https://mebbisyd.meb.gov.tr/SKT/skt00001.aspx');

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
        } else {
          this.loginAttempts.set(account.id, attempts + 1);
          console.log(`[${account.label}] LOGIN PAGE! Auto-filling... (attempt ${attempts + 1})`);
          this.showStatus(win, 'TRYING LOGIN...', '#FF6B6B');
          this.autoFillLogin(win, account);
        }
      } else if (this.pendingDownload && this.pendingDownloadPhase === 'skt-module' && currentURL.toLowerCase().includes('skt00001')) {
        // Phase 1: SKT module loaded, now click the menu item for skt02009
        console.log(`[${account.label}] SKT module loaded, clicking Aday Durum Görüntüleme...`);
        this.pendingDownloadPhase = 'navigate';
        this.injectLeftMenu(win, account);
        this.handleSktModuleLoaded(win, account);
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
          { label: 'Direksiyon Takip İndir' },
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
            // Show TC modal
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
              console.log('MEBBIS_DOWNLOAD_TC:' + tc);
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

  private async downloadDireksiyonTakip(tc: string, _partition: string, account: Account, parentWin: BrowserWindow) {
    console.log(`[${account.label}] Starting direksiyon takip download for TC: ${tc}`);

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

    // Store the TC so we can use it after navigation
    this.pendingDownload = { tc, account, parentWin };

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
      console.log(`[${account.label}] skt02009 menu not found, aborting download`);
      this.pendingDownload = null;
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

  private pendingDownload: { tc: string; account: Account; parentWin: BrowserWindow } | null = null;
  private pendingDownloadPhase: 'skt-module' | 'navigate' | 'search' | null = null;

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
    const { tc, parentWin } = this.pendingDownload;
    this.pendingDownload = null;
    console.log(`[${account.label}] skt02009 results loaded, scraping data...`);

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
              const cells = dataRows[0].querySelectorAll('td');
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
            lessons.push(cellTexts);
          }
          
          return { studentInfo, lessons };
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
      const pdfBuffer = await this.generatePdfFromTemplate(lessonData.studentInfo, lessonData.lessons);

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

  private async generatePdfFromTemplate(
    studentInfo: { 'ad-soyad': string; 'tc-kimlik-no': string; 'istenen-sertifika': string },
    lessons: string[][]
  ): Promise<Buffer> {
    // Determine template based on lesson count
    const lessonCount = lessons.length;
    const hasSimulator = lessons.some(l => {
      const text = l.join(' ');
      return text.includes('Simulatör') || text.includes('Direksiyon Eğitim Alanı');
    });

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
    }

    console.log(`[PDF] Fetching template: ${templateName} for ${lessonCount} lessons`);

    // Fetch template HTML from remote server
    let html: string;
    try {
      html = await this.fetchTemplate(templateName);
    } catch (err: any) {
      throw new Error(`Template indirilemedi: ${templateName} - ${err.message}`);
    }

    // Use a hidden BrowserWindow to render and fill the template
    const pdfWin = new BrowserWindow({
      width: 800,
      height: 1100,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // Load the HTML template
    await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // Extract vehicle class from certificate string
    const certParts = (studentInfo['istenen-sertifika'] || 'B').split(' ');
    const vClass = certParts[0] || 'B';

    // Fill student info and lesson data via DOM manipulation
    await pdfWin.webContents.executeJavaScript(`
      (function() {
        // Fill student info
        const nameEl = document.querySelector('.name');
        if (nameEl) nameEl.textContent = ${JSON.stringify(studentInfo['ad-soyad'] || '')};

        const tcEl = document.querySelector('.tc');
        if (tcEl) tcEl.textContent = ${JSON.stringify(studentInfo['tc-kimlik-no'] || '')};

        const classEl = document.querySelector('.vClass');
        if (classEl) classEl.textContent = ${JSON.stringify(vClass)};

        // Fill lesson records
        const dates = document.querySelectorAll('.date');
        const plates = document.querySelectorAll('.plate');
        const trainers = document.querySelectorAll('.mTrainer');
        const lessons = ${JSON.stringify(lessons)};

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

    // Print to PDF
    const pdfBuffer = await pdfWin.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: {
        top: 0.4,
        bottom: 0.4,
        left: 0.4,
        right: 0.4,
      },
    });

    pdfWin.close();
    return Buffer.from(pdfBuffer);
  }

  private fetchTemplate(templateName: string): Promise<string> {
    const url = `${TEMPLATE_BASE_URL}/${encodeURIComponent(templateName)}`;
    return new Promise((resolve, reject) => {
      const req = https.get(url, { timeout: 15000 }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        let data = '';
        res.on('data', (chunk: string) => { data += chunk; });
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
  }

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
