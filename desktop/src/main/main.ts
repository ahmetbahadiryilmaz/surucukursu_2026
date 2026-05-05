import { app, BrowserWindow, ipcMain, session, Menu, dialog, shell } from 'electron';
import * as path from 'path';
import { Account, SimulatorType } from './account-store';
import { MebbisAccount } from './api-client';
import { AuthStore } from './auth-store';
import { apiClient } from './api-client';
import { MebbisManager } from './mebbis-manager';
import { enforceVersionCheckWithSplash, showWhatsNewIfUpdated, setupAutoUpdater, getPendingWhatsNew, markWhatsNewSeen, fetchVersionCheck } from './auto-updater';
import { getCodeLoader } from './remote-code-loader';
import { initDeviceId, getDeviceId } from './device-id';
import { IS_DEV } from './config';

// Fix "discard virtual memory" crash on Windows
// These must be set before app.whenReady()
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,RendererCodeIntegrity');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

let mainWindow: BrowserWindow | null = null;
let authStore: AuthStore;
let mebbisManager: MebbisManager;

function createMainWindow() {
  // __dirname is dist/main, renderer files are in src/renderer
  const rendererPath = path.join(__dirname, '..', '..', 'src', 'renderer');
  const preloadPath = path.join(__dirname, '..', 'preload', 'preload.js');

  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    title: 'MEBBIS Account Manager',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(rendererPath, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIPC() {
  // Device identity
  ipcMain.handle('device:id', () => getDeviceId());

  // What's New
  ipcMain.handle('whats-new:check', () => getPendingWhatsNew());
  ipcMain.handle('whats-new:dismiss', () => { markWhatsNewSeen(); return true; });

  // Profile
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

  // Dev mode flag
  ipcMain.handle('app:is-dev', () => IS_DEV);

  // Remote code version (e.g. "1.2.4.001"). Returns null until first sync
  // completes — renderer subscribes to 'code-version-updated' for live updates.
  ipcMain.handle('desktop-code:version', () => getCodeLoader().getVersion());

  // Installed desktop app version from package.json (e.g. "1.2.5")
  ipcMain.handle('app:version', () => app.getVersion());

  // Dev test PDF generators — only functional in dev mode
  ipcMain.handle('dev:test-direksiyon-pdf', async (_event, sinif: string) => {
    if (!IS_DEV) throw new Error('Only available in development mode');
    if (!mainWindow) throw new Error('No main window');
    return mebbisManager.generateTestDireksiyonPdf(sinif || '0,B|16', mainWindow);
  });

  ipcMain.handle('dev:test-simulator-pdf', async (_event, simType: string) => {
    if (!IS_DEV) throw new Error('Only available in development mode');
    if (!mainWindow) throw new Error('No main window');
    return mebbisManager.generateTestSimulatorPdf(simType || 'sesim', mainWindow);
  });

  // Auth handlers
  ipcMain.handle('auth:check', async () => {
    const token = authStore.getToken();
    const user = authStore.getUser();
    if (!token || !user) return null;
    try {
      const isAdmin = IS_DEV && (user.userType === -1 || user.userType === -2);
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
      // Remember the password (encrypted via OS keychain) so the renderer
      // can pre-fill the field on next launch.
      authStore.setRememberedPassword(password);
      authStore.setAutoLogin(autoLogin === true);
      const isAdmin = IS_DEV && (result.user.userType === -1 || result.user.userType === -2);
      console.log('[auth:login] Logged in:', email, 'userType:', result.user.userType, 'isAdmin:', isAdmin);
      let school = null;
      if (!isAdmin) {
        school = await apiClient.getMySchool(result.token).catch(() => null);
        if (school?.name) authStore.setSavedSchoolName(school.name);
      }
      return { user: result.user, school };
    } catch (err: any) {
      const raw = String(err?.message || '');
      // Map common backend errors to user-friendly Turkish messages
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
      try { await apiClient.logout(token); } catch { /* ignore network errors */ }
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
    try {
      return await apiClient.forgotPassword(email, phone);
    } catch (err: any) {
      return { success: false, message: err?.message || 'Bir hata oluştu.' };
    }
  });

  ipcMain.handle('auth:verify-reset-code', async (_event, email: string, code: string) => {
    try {
      return await apiClient.verifyResetCode(email, code);
    } catch (err: any) {
      return { success: false, message: err?.message || 'Bir hata oluştu.' };
    }
  });

  ipcMain.handle('auth:reset-password', async (_event, email: string, code: string, newPassword: string) => {
    try {
      return await apiClient.resetPassword(email, code, newPassword);
    } catch (err: any) {
      return { success: false, message: err?.message || 'Bir hata oluştu.' };
    }
  });

  ipcMain.handle('shell:open-external', async (_event, url: string) => {
    // Only allow https URLs
    if (url.startsWith('https://')) {
      await shell.openExternal(url);
    }
  });

  // Convert DB MebbisAccount to the Account shape used by MebbisManager
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

  // Fire-and-forget activity log helper
  function logActivity(body: import('./api-client').ActivityLogBody) {
    const token = authStore.getToken();
    if (!token) return;
    apiClient.logActivity(token, body).catch(() => { /* ignore */ });
  }

  // Allow MebbisManager to log PDF downloads without a direct dependency on authStore
  mebbisManager.setActivityLogger((schoolIdStr, pdfType, count) => {
    const schoolId = parseInt(schoolIdStr, 10);
    if (!Number.isFinite(schoolId)) return;
    logActivity({ event: 'pdf_download', school_id: schoolId, pdf_type: pdfType, count });
  });

  // Account CRUD
  ipcMain.handle('accounts:list', async () => {
    const token = authStore.getToken();
    const user = authStore.getUser();
    if (!token) return [];
    try {
      const isAdmin = IS_DEV && (user?.userType === -1 || user?.userType === -2);
      const dbAccounts = isAdmin
        ? await apiClient.getAllSchools(token)
        : await apiClient.getMebbisAccounts(token);
      console.log(`[accounts:list] IS_DEV=${IS_DEV} userType=${user?.userType} isAdmin=${isAdmin} count=${dbAccounts.length}`);
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

    // If the owner has no school yet, create one using the label as the school name
    if (!dbAccounts.length) {
      await apiClient.setupSchool(token, data.label || 'Sürücü Kursum');
      dbAccounts = await apiClient.getMebbisAccounts(token);
    }

    if (!dbAccounts.length) throw new Error('No driving school found for this account');
    // Use first school without credentials, or first school overall
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
    const isAdmin = IS_DEV && (user?.userType === -1 || user?.userType === -2);
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

  // Account session controls
  ipcMain.handle('accounts:start', async (_event, id: string) => {
    const token = authStore.getToken();
    const user = authStore.getUser();
    if (!token) throw new Error('Not authenticated');
    const isAdmin = IS_DEV && (user?.userType === -1 || user?.userType === -2);
    const dbAccounts = isAdmin
      ? await apiClient.getAllSchools(token)
      : await apiClient.getMebbisAccounts(token);
    const found = dbAccounts.find(m => String(m.id) === id);
    if (!found) throw new Error('Account not found');
    // Block start when subscription is not active (demo or expired)
    if (!found.subscriptionActive) {
      throw new Error('SUBSCRIPTION_INACTIVE');
    }
    // Enforce simulator type selection — must be set in DB before starting
    if (!found.simulatorType) {
      throw new Error('NO_SIMULATOR_TYPE');
    }
    const account = { ...dbToAccount(found), isRunning: false };
    mebbisManager.start(account, mainWindow!);
    // Fire-and-forget activity log
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

app.whenReady().then(async () => {
  // Compute hardware-bound device ID as early as possible.
  // Non-blocking — errors are silently swallowed inside initDeviceId().
  await initDeviceId().catch(() => {});

  authStore = new AuthStore();
  mebbisManager = new MebbisManager();

  // STRICT VERSION GATE — splash window checks version BEFORE main window exists
  const allowed = await enforceVersionCheckWithSplash();
  if (!allowed) {
    // App is being updated or user chose to quit
    return;
  }

  // Version is OK — sync remote code files in the background.
  // This updates scripts/renderer without requiring a reinstall.
  // Errors are caught inside sync(); app always starts even if server is down.
  const syncPromise = getCodeLoader().sync().catch(() => {});

  // Start polling for new server-side deploys. On change, prompt user to
  // restart so the new code loads fresh. No mid-session live-swap.
  getCodeLoader().startVersionPolling(() => mainWindow);

  // After the initial sync resolves, show the post-update "Yenilikler"
  // dialog if the server provided a whatsNew message and the user hasn't
  // already seen this version's notes (or opted out). Safe no-op otherwise.
  syncPromise.then(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      getCodeLoader().showCodeWhatsNewIfPending(mainWindow).catch(() => {});
    }
  });

  // Register IPC handlers before creating window so they're ready
  // when the renderer loads and immediately calls accounts:list
  setupIPC();

  createMainWindow();

  // Set up auto-updater for future checks
  setupAutoUpdater(mainWindow!);

  // Application menu: "Hakkında" always; "Check Remote Version" only in dev;
  // "Test" submenu appears while user holds Shift.
  rebuildAppMenu();

  // Track Shift key state to toggle the hidden Test menu.
  // Released-on-blur guards against the user alt-tabbing while Shift is held.
  mainWindow!.webContents.on('before-input-event', (_event, input) => {
    const next = input.shift === true;
    if (next !== isShiftHeld) {
      isShiftHeld = next;
      rebuildAppMenu();
    }
  });
  mainWindow!.on('blur', () => {
    if (isShiftHeld) {
      isShiftHeld = false;
      rebuildAppMenu();
    }
  });

  // Show "What's New" dialog on first launch after update
  showWhatsNewIfUpdated(mainWindow!);
});

let isShiftHeld = false;

function rebuildAppMenu() {
  const items: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Hakkında',
      click: showAboutDialog,
    },
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

  const installedVer = app.getVersion();

  // Force a fresh sync so the dialog reflects the live server state.
  // sync() never throws — it logs and falls back to cache.
  let remoteCodeLine: string;
  try {
    await getCodeLoader().sync({ force: true });
    const fresh = getCodeLoader().getVersion();
    remoteCodeLine = fresh
      ? `   Uzak kod sürümü     v${fresh}`
      : `   Uzak kod sürümü     (sunucuda version.json yok)`;
  } catch (err: any) {
    remoteCodeLine = `   Uzak kod sürümü     ✗ ${err?.message || 'sync hatası'}`;
  }

  let updaterLines: string[];
  try {
    const result = await fetchVersionCheck(installedVer);
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

app.on('window-all-closed', () => {
  // Stop all running accounts and flush cookies
  mebbisManager.stopAll();
  app.quit();
});

// Also flush when app is about to quit
app.on('before-quit', () => {
  console.log('App quitting, flushing all cookies...');
  mebbisManager.stopAll();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});
