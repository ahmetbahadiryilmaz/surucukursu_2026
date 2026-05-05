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

    let remoteCodeLine: string;
    try {
      await ctx.codeLoader.sync({ force: true });
      const fresh = ctx.codeLoader.getVersion();
      remoteCodeLine = fresh
        ? `   Uzak kod sürümü     v${fresh}`
        : `   Uzak kod sürümü     (sunucuda version.json yok)`;
    } catch (err: any) {
      remoteCodeLine = `   Uzak kod sürümü     ✗ ${err?.message || 'sync hatası'}`;
    }

    let updaterLines: string[];
    try {
      const result = await ctx.fetchVersionCheck(installedVer);
      updaterLines = [
        `   Sunucu minimum      v${result.minimumVersion}`,
        result.maximumVersion ? `   Sunucu maksimum     v${result.maximumVersion}` : null,
        `   Durum               ${result.allowed ? '✓ izin verildi' : `✗ engellendi (${result.reason})`}`,
      ].filter((x): x is string => x !== null);
    } catch (err: any) {
      updaterLines = [`   Sunucu              ✗ ulaşılamadı (${err?.message || 'bilinmeyen hata'})`];
    }

    const detail = [
      '─────────────  İletişim  ─────────────',
      '   Web                 online.mtsk.app',
      '   WhatsApp            +90 552 187 03 34',
      '',
      '─────────────  Sürüm Bilgisi  ─────────────',
      `   Yüklü uygulama      v${installedVer}`,
      remoteCodeLine,
      ...updaterLines,
    ].join('\n');

    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Hakkında',
      message: 'MTSK Uygulaması',
      detail,
      buttons: ['💬  WhatsApp', '🌐  Web Sitesi', 'Kapat'],
      defaultId: 2,
      cancelId: 2,
      noLink: true,
    });
    if (result.response === 0) {
      shell.openExternal('https://wa.me/905521870334');
    } else if (result.response === 1) {
      shell.openExternal('https://online.mtsk.app');
    }
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
