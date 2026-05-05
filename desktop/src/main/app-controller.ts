/**
 * AppController
 * ─────────────
 * Remoted entry point — bundled by `scripts/build-remote.js` into
 * `remote-code/main/app-bundle.js` and loaded into memory at runtime by
 * the bootstrap. Everything in this module is replaceable via a
 * remote-code deploy without rebuilding the exe.
 *
 * Runtime model
 *   - Exports a single `start(ctx)` entry point.
 *   - The bootstrap calls `start(ctx)` once per process. ctx supplies
 *     bootstrap-only services (RemoteCodeLoader singleton, autoUpdater,
 *     device-id, computed renderer URL/preload path, app version).
 *   - All other dependencies (`./auth-store`, `./mebbis-manager`, etc.)
 *     are bundled via esbuild into the same artifact.
 *
 * What this owns
 *   - IPC handler registration (auth, accounts, profile, dev-only PDFs)
 *   - Main BrowserWindow lifecycle
 *   - Application menu (Hakkında + hidden Test menu while Shift is held)
 *   - About / PDF / What's-New dialogs
 *   - App-level event handlers (window-all-closed, before-quit, activate)
 */

import { app, BrowserWindow, ipcMain, session, Menu, dialog, shell } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import { Account, SimulatorType } from './account-store';
import { AuthStore } from './auth-store';
import { MebbisManager } from './mebbis-manager';
import { apiClient, MebbisAccount, ActivityLogBody } from './api-client';
import { getCodeLoader } from './remote-code-loader';
import type { VersionCheckResult } from './auto-updater';

type RemoteCodeLoader = ReturnType<typeof getCodeLoader>;

export interface BootstrapContext {
  /** Installed-app version string (from package.json). */
  appVersion: string;
  /** True when running unpackaged (dev mode). */
  isDev: boolean;
  /** URL the main BrowserWindow should load. file:// in dev, mtsk-ui:// in prod. */
  rendererIndexUrl: string;
  /** Absolute path to the compiled preload script. */
  preloadPath: string;

  // Bootstrap singletons / utilities
  codeLoader: RemoteCodeLoader;
  setupAutoUpdater: (win: BrowserWindow | null) => void;
  fetchVersionCheck: (version: string) => Promise<VersionCheckResult>;
  showWhatsNewIfUpdated: (win: BrowserWindow) => void;
  getPendingWhatsNew: () => { version: string; lines: string[] } | null;
  markWhatsNewSeen: () => void;
  getDeviceId: () => string;
}

export interface AppControllerHandle {
  mainWindow: BrowserWindow;
}

export async function start(ctx: BootstrapContext): Promise<AppControllerHandle> {
  const authStore = new AuthStore();
  const mebbisManager = new MebbisManager();

  let mainWindow: BrowserWindow | null = null;
  let isShiftHeld = false;

  // ── Helpers ─────────────────────────────────────────────────────

  function dbToAccount(m: MebbisAccount): Account & { ownerEmail?: string | null } {
    return {
      id: String(m.id),
      username: m.username ?? '',
      password: m.password ?? '',
      label: m.label,
      ownerEmail: m.ownerEmail ?? null,
      isRunning: false,
      createdAt: new Date().toISOString(),
      simulatorType: (m.simulatorType as SimulatorType) || undefined,
      subscriptionActive: m.subscriptionActive,
    };
  }

  function logActivity(body: ActivityLogBody) {
    const token = authStore.getToken();
    if (!token) return;
    apiClient.logActivity(token, body).catch(() => { /* ignore */ });
  }

  function createMainWindow(): BrowserWindow {
    const win = new BrowserWindow({
      width: 900,
      height: 700,
      minWidth: 700,
      minHeight: 500,
      title: 'MEBBIS Account Manager',
      webPreferences: {
        preload: ctx.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    win.loadURL(ctx.rendererIndexUrl);
    win.on('closed', () => {
      if (mainWindow === win) mainWindow = null;
    });
    return win;
  }

  function rebuildAppMenu() {
    const items: MenuItemConstructorOptions[] = [
      { label: 'Hakkında', click: showAboutDialog },
    ];
    if (isShiftHeld) {
      items.push({
        label: '🧪 Test',
        submenu: [
          { label: 'Direksiyon Takip PDF…', click: showDireksiyonPdfDialog },
          { label: 'Simülasyon Raporu PDF…', click: showSimulatorPdfDialog },
        ],
      });
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate(items));
  }

  async function showAboutDialog() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const installedVer = ctx.appVersion;

    let remoteVer = '';
    try {
      await ctx.codeLoader.sync({ force: true });
      const fresh = ctx.codeLoader.getVersion();
      remoteVer = fresh ? `v${fresh}` : '(yok)';
    } catch {
      remoteVer = 'hata';
    }

    let statusLine = '';
    try {
      const result = await ctx.fetchVersionCheck(installedVer);
      statusLine = result.allowed ? '✓ Güncel' : `✗ Engellendi`;
    } catch {
      statusLine = '✗ Sunucuya ulaşılamadı';
    }

    const aboutWin = new BrowserWindow({
      width: 400,
      height: 380,
      resizable: false,
      minimizable: false,
      maximizable: false,
      frame: false,
      alwaysOnTop: true,
      center: true,
      parent: mainWindow,
      modal: true,
      show: false,
      backgroundColor: '#1a1a2e',
      webPreferences: { nodeIntegration: true, contextIsolation: false, sandbox: false },
    });

    const WHATSAPP_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#25D366" width="20" height="20"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

    const APP_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4361ee" width="20" height="20"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{background:#1a1a2e;color:#e9e9f5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;display:flex;flex-direction:column;height:100vh;user-select:none;-webkit-user-select:none}
      .drag{-webkit-app-region:drag;background:#12122a;padding:10px 16px;display:flex;align-items:center;justify-content:space-between}
      .drag-title{font-size:13px;color:#8888aa;font-weight:500}
      .close-btn{-webkit-app-region:no-drag;background:none;border:none;color:#8888aa;font-size:18px;cursor:pointer;padding:0 4px;line-height:1}
      .close-btn:hover{color:#fff}
      .body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 32px;gap:6px}
      .app-name{font-size:22px;font-weight:700;color:#4361ee;margin-bottom:2px}
      .tagline{font-size:12px;color:#6b6b8a;margin-bottom:16px}
      .info-box{background:#12122a;border-radius:10px;padding:14px 20px;width:100%;font-size:12px;color:#b9b9d1;line-height:1.9}
      .info-row{display:flex;justify-content:space-between}
      .info-label{color:#6b6b8a}
      .info-val{color:#e9e9f5;font-weight:500}
      .divider{height:1px;background:#2a2a4a;margin:10px 0}
      .btns{display:flex;gap:10px;width:100%;margin-top:16px}
      .btn{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 0;border-radius:8px;border:none;font-size:13px;font-family:inherit;cursor:pointer;font-weight:600;transition:filter .15s}
      .btn:hover{filter:brightness(1.12)}
      .btn-wa{background:#25D366;color:#fff}
      .btn-web{background:#4361ee;color:#fff}
      .btn-close{background:#2a2a4a;color:#e9e9f5;flex:0.6}
    </style></head>
    <body>
      <div class="drag">
        <span class="drag-title">Hakkında</span>
        <button class="close-btn" id="btnClose">✕</button>
      </div>
      <div class="body">
        <div class="app-name">MTSK Uygulaması</div>
        <div class="tagline">Motorlu Taşıt Sürücüleri Kursu Yönetim Sistemi</div>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Uygulama</span><span class="info-val">v${installedVer}</span></div>
          <div class="info-row"><span class="info-label">Uzak kod</span><span class="info-val">${remoteVer}</span></div>
          <div class="divider"></div>
          <div class="info-row"><span class="info-label">Durum</span><span class="info-val">${statusLine}</span></div>
          <div class="divider"></div>
          <div class="info-row"><span class="info-label">Web</span><span class="info-val">mtsk.app</span></div>
          <div class="info-row"><span class="info-label">WhatsApp</span><span class="info-val">+90 552 187 03 34</span></div>
        </div>
        <div class="btns">
          <button class="btn btn-wa" id="btnWa">${WHATSAPP_ICON} WhatsApp</button>
          <button class="btn btn-web" id="btnWeb">${APP_ICON} Web Sitesi</button>
          <button class="btn btn-close" id="btnClose2">Kapat</button>
        </div>
      </div>
      <script>
        const {ipcRenderer} = require('electron');
        document.getElementById('btnWa').onclick = () => ipcRenderer.send('about:action', 'wa');
        document.getElementById('btnWeb').onclick = () => ipcRenderer.send('about:action', 'web');
        document.getElementById('btnClose').onclick = () => ipcRenderer.send('about:action', 'close');
        document.getElementById('btnClose2').onclick = () => ipcRenderer.send('about:action', 'close');
      </script>
    </body></html>`;

    aboutWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    aboutWin.once('ready-to-show', () => aboutWin.show());

    await new Promise<void>((resolve) => {
      const { ipcMain: ipc } = require('electron');
      const handler = (_e: any, action: string) => {
        ipc.removeListener('about:action', handler);
        if (!aboutWin.isDestroyed()) aboutWin.close();
        if (action === 'wa') shell.openExternal('https://wa.me/905521870334');
        else if (action === 'web') shell.openExternal('https://mtsk.app');
        resolve();
      };
      ipc.on('about:action', handler);
      aboutWin.on('closed', () => { ipc.removeListener('about:action', handler); resolve(); });
    });
  }

  async function showDireksiyonPdfDialog() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const r1 = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: 'Direksiyon Takip PDF',
      message: 'Hangi sınıf için test PDF oluşturulsun?',
      buttons: ['Yeni A (14)', 'Yeni B (16)', 'Geçiş…', 'İptal'],
      defaultId: 1,
      cancelId: 3,
      noLink: true,
    });

    let sinif: string | null = null;
    if (r1.response === 0) sinif = '0,A|14';
    else if (r1.response === 1) sinif = '0,B|16';
    else if (r1.response === 2) {
      const r2 = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        title: 'Geçiş Türü',
        message: 'Hangi geçiş türü için PDF oluşturulsun?',
        buttons: [
          'B → C (20 ders)',
          'B → A2 (12, simülatörlü)',
          'B → A2 (12, sim. yok)',
          'D → C (10 ders)',
          'C → D1 (4 ders)',
          'İptal',
        ],
        defaultId: 0,
        cancelId: 5,
        noLink: true,
      });
      if (r2.response === 0) sinif = 'B(2016 Sonrası),C|20';
      else if (r2.response === 1) sinif = 'B,A2|12';
      else if (r2.response === 2) sinif = 'B,A2|12-nosim';
      else if (r2.response === 3) sinif = 'D,C|10';
      else if (r2.response === 4) sinif = 'C,D1|4';
    }
    if (!sinif) return;

    try {
      await mebbisManager.generateTestDireksiyonPdf(sinif, mainWindow);
    } catch (err: any) {
      dialog.showErrorBox('PDF Oluşturulamadı', err?.message || 'Bilinmeyen hata');
    }
  }

  async function showSimulatorPdfDialog() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const r = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: 'Simülasyon Raporu PDF',
      message: 'Hangi tip simülasyon raporu oluşturulsun?',
      detail: 'Rastgele test verisi ile PDF üretilir.',
      buttons: ['Sesim (1 rapor)', 'Ana Grup (11 rapor)', 'Her İkisi (12 rapor)', 'İptal'],
      defaultId: 0,
      cancelId: 3,
      noLink: true,
    });
    let simType: string | null = null;
    if (r.response === 0) simType = 'sesim';
    else if (r.response === 1) simType = 'ana_grup';
    else if (r.response === 2) simType = 'both';
    if (!simType) return;
    try {
      await mebbisManager.generateTestSimulatorPdf(simType, mainWindow);
    } catch (err: any) {
      dialog.showErrorBox('PDF Oluşturulamadı', err?.message || 'Bilinmeyen hata');
    }
  }

  // ── IPC ─────────────────────────────────────────────────────────

  function setupIPC() {
    ipcMain.handle('device:id', () => ctx.getDeviceId());

    ipcMain.handle('whats-new:check', () => ctx.getPendingWhatsNew());
    ipcMain.handle('whats-new:dismiss', () => { ctx.markWhatsNewSeen(); return true; });

    ipcMain.handle('profile:get', async () => {
      const token = authStore.getToken();
      if (!token) throw new Error('Not authenticated');
      return apiClient.getProfile(token);
    });
    ipcMain.handle('profile:update', async (_event, phone: string) => {
      const token = authStore.getToken();
      if (!token) throw new Error('Not authenticated');
      return apiClient.updateProfile(token, phone);
    });

    ipcMain.handle('app:is-dev', () => ctx.isDev);
    ipcMain.handle('desktop-code:version', () => ctx.codeLoader.getVersion());
    ipcMain.handle('app:version', () => ctx.appVersion);

    ipcMain.handle('dev:test-direksiyon-pdf', async (_event, sinif: string) => {
      if (!ctx.isDev) throw new Error('Only available in development mode');
      if (!mainWindow) throw new Error('No main window');
      return mebbisManager.generateTestDireksiyonPdf(sinif || '0,B|16', mainWindow);
    });
    ipcMain.handle('dev:test-simulator-pdf', async (_event, simType: string) => {
      if (!ctx.isDev) throw new Error('Only available in development mode');
      if (!mainWindow) throw new Error('No main window');
      return mebbisManager.generateTestSimulatorPdf(simType || 'sesim', mainWindow);
    });

    ipcMain.handle('auth:check', async () => {
      const token = authStore.getToken();
      const user = authStore.getUser();
      if (!token || !user) return null;
      try {
        const isAdmin = ctx.isDev && (user.userType === -1 || user.userType === -2);
        if (isAdmin) {
          return { user, school: null };
        }
        const school = await apiClient.getMySchool(token).catch(() => null);
        if (school?.name) authStore.setSavedSchoolName(school.name);
        return { user, school };
      } catch {
        authStore.clear();
        return null;
      }
    });

    ipcMain.handle('auth:login', async (_event, email: string, password: string, autoLogin?: boolean) => {
      try {
        const result = await apiClient.login(email, password);
        authStore.save(result.token, result.user);
        authStore.setRememberedPassword(password);
        authStore.setAutoLogin(autoLogin === true);
        const isAdmin = ctx.isDev && (result.user.userType === -1 || result.user.userType === -2);
        console.log('[auth:login] Logged in:', email, 'userType:', result.user.userType, 'isAdmin:', isAdmin);
        let school = null;
        if (!isAdmin) {
          school = await apiClient.getMySchool(result.token).catch(() => null);
          if (school?.name) authStore.setSavedSchoolName(school.name);
        }
        return { user: result.user, school };
      } catch (err: any) {
        const raw = String(err?.message || '');
        if (/invalid credentials/i.test(raw) || /unauthorized/i.test(raw)) {
          throw new Error('E-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.');
        }
        if (/timed out|ECONN|network|fetch failed/i.test(raw)) {
          throw new Error('Sunucuya ulaşılamıyor. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.');
        }
        throw new Error(raw || 'Giriş başarısız. Lütfen tekrar deneyin.');
      }
    });

    ipcMain.handle('auth:logout', async () => {
      const token = authStore.getToken();
      if (token) {
        try { await apiClient.logout(token); } catch { /* ignore */ }
      }
      authStore.clear();
      return true;
    });

    ipcMain.handle('auth:get-saved-email', () => authStore.getSavedEmail());
    ipcMain.handle('auth:get-saved-school', () => authStore.getSavedSchoolName());
    ipcMain.handle('auth:get-saved-credentials', () => ({
      email: authStore.getSavedEmail(),
      password: authStore.getRememberedPassword(),
      autoLogin: authStore.getAutoLogin(),
    }));
    ipcMain.handle('auth:set-auto-login', (_event, value: boolean) => {
      authStore.setAutoLogin(!!value);
      return true;
    });

    ipcMain.handle('auth:forgot-password', async (_event, email: string, phone: string) => {
      try { return await apiClient.forgotPassword(email, phone); }
      catch (err: any) { return { success: false, message: err?.message || 'Bir hata oluştu.' }; }
    });
    ipcMain.handle('auth:verify-reset-code', async (_event, email: string, code: string) => {
      try { return await apiClient.verifyResetCode(email, code); }
      catch (err: any) { return { success: false, message: err?.message || 'Bir hata oluştu.' }; }
    });
    ipcMain.handle('auth:reset-password', async (_event, email: string, code: string, newPassword: string) => {
      try { return await apiClient.resetPassword(email, code, newPassword); }
      catch (err: any) { return { success: false, message: err?.message || 'Bir hata oluştu.' }; }
    });

    ipcMain.handle('shell:open-external', async (_event, url: string) => {
      if (url.startsWith('https://')) {
        await shell.openExternal(url);
      }
    });

    mebbisManager.setActivityLogger((schoolIdStr, pdfType, count) => {
      const schoolId = parseInt(schoolIdStr, 10);
      if (!Number.isFinite(schoolId)) return;
      logActivity({ event: 'pdf_download', school_id: schoolId, pdf_type: pdfType, count });
    });

    ipcMain.handle('accounts:list', async () => {
      const token = authStore.getToken();
      const user = authStore.getUser();
      if (!token) return [];
      try {
        const isAdmin = ctx.isDev && (user?.userType === -1 || user?.userType === -2);
        const dbAccounts = isAdmin
          ? await apiClient.getAllSchools(token)
          : await apiClient.getMebbisAccounts(token);
        console.log(`[accounts:list] IS_DEV=${ctx.isDev} userType=${user?.userType} isAdmin=${isAdmin} count=${dbAccounts.length}`);
        return dbAccounts.map(m => ({
          ...dbToAccount(m),
          isRunning: mebbisManager.isRunning(String(m.id)),
          subscription: m.subscription,
        }));
      } catch (err: any) {
        console.error('[accounts:list] Failed to fetch accounts. userType:', user?.userType, 'isAdmin:', user?.userType === -1 || user?.userType === -2, 'error:', err?.message || String(err));
        return [];
      }
    });

    ipcMain.handle('accounts:add', async (_event, data: { username: string; password: string; label: string }) => {
      const token = authStore.getToken();
      if (!token) throw new Error('Not authenticated');
      let dbAccounts = await apiClient.getMebbisAccounts(token);
      if (!dbAccounts.length) {
        await apiClient.setupSchool(token, data.label || 'Sürücü Kursum');
        dbAccounts = await apiClient.getMebbisAccounts(token);
      }
      if (!dbAccounts.length) throw new Error('No driving school found for this account');
      const target = dbAccounts.find(m => !m.username) ?? dbAccounts[0];
      const result = await apiClient.upsertMebbisAccount(token, target.id, {
        username: data.username,
        password: data.password,
      });
      return dbToAccount(result);
    });

    ipcMain.handle('accounts:update', async (_event, data: { id: string; username?: string; password?: string; label?: string; simulatorType?: string }) => {
      const token = authStore.getToken();
      const user = authStore.getUser();
      if (!token) throw new Error('Not authenticated');
      const schoolId = parseInt(data.id, 10);
      const isAdmin = ctx.isDev && (user?.userType === -1 || user?.userType === -2);
      const dbAccounts = isAdmin
        ? await apiClient.getAllSchools(token)
        : await apiClient.getMebbisAccounts(token);
      const current = dbAccounts.find(m => m.id === schoolId);
      if (!current) throw new Error('Account not found');
      const result = await apiClient.upsertMebbisAccount(token, schoolId, {
        username: data.username ?? current.username ?? '',
        password: data.password ?? current.password ?? '',
        simulatorType: data.simulatorType,
      });
      return dbToAccount(result);
    });

    ipcMain.handle('accounts:remove', async (_event, id: string) => {
      const token = authStore.getToken();
      if (!token) throw new Error('Not authenticated');
      mebbisManager.stop(id);
      const partition = `persist:mebbis-${id}`;
      const ses = session.fromPartition(partition);
      await ses.clearStorageData();
      await apiClient.removeMebbisAccount(token, parseInt(id, 10));
      return true;
    });

    ipcMain.handle('accounts:start', async (_event, id: string) => {
      const token = authStore.getToken();
      const user = authStore.getUser();
      if (!token) throw new Error('Not authenticated');
      const isAdmin = ctx.isDev && (user?.userType === -1 || user?.userType === -2);
      const dbAccounts = isAdmin
        ? await apiClient.getAllSchools(token)
        : await apiClient.getMebbisAccounts(token);
      const found = dbAccounts.find(m => String(m.id) === id);
      if (!found) throw new Error('Account not found');
      if (!found.subscriptionActive) {
        throw new Error('SUBSCRIPTION_INACTIVE');
      }
      if (!found.simulatorType) {
        throw new Error('NO_SIMULATOR_TYPE');
      }
      const account = { ...dbToAccount(found), isRunning: false };
      mebbisManager.start(account, mainWindow!);
      logActivity({ event: 'school_login', school_id: found.id });
      return true;
    });

    ipcMain.handle('accounts:stop', async (_event, id: string) => {
      mebbisManager.stop(id);
      return true;
    });
    ipcMain.handle('accounts:focus', async (_event, id: string) => {
      mebbisManager.focus(id);
      return true;
    });
    ipcMain.handle('accounts:get-status', async (_event, id: string) => {
      return mebbisManager.isRunning(id);
    });
  }

  // ── Wire it all up ──────────────────────────────────────────────

  setupIPC();

  mainWindow = createMainWindow();

  ctx.setupAutoUpdater(mainWindow);

  rebuildAppMenu();

  // Track Shift to toggle the hidden Test menu. Released-on-blur guards
  // against the user alt-tabbing while Shift is held.
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    const next = input.shift === true;
    if (next !== isShiftHeld) {
      isShiftHeld = next;
      rebuildAppMenu();
    }
  });
  mainWindow.on('blur', () => {
    if (isShiftHeld) {
      isShiftHeld = false;
      rebuildAppMenu();
    }
  });

  ctx.showWhatsNewIfUpdated(mainWindow);

  // Process-level events. These persist for the app lifetime; the bundle
  // is loaded once per process so re-registering on a hot-swap is N/A.
  app.on('window-all-closed', () => {
    mebbisManager.stopAll();
    app.quit();
  });
  app.on('before-quit', () => {
    console.log('App quitting, flushing all cookies...');
    mebbisManager.stopAll();
  });
  app.on('activate', () => {
    if (mainWindow === null) {
      mainWindow = createMainWindow();
    }
  });

  return { mainWindow };
}
