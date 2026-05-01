import { app, BrowserWindow, ipcMain, session, Menu, dialog, shell } from 'electron';
import * as path from 'path';
import { Account, SimulatorType } from './account-store';
import { MebbisAccount } from './api-client';
import { AuthStore } from './auth-store';
import { apiClient } from './api-client';
import { MebbisManager } from './mebbis-manager';
import { enforceVersionCheckWithSplash, showWhatsNewIfUpdated, setupAutoUpdater, getPendingWhatsNew, markWhatsNewSeen } from './auto-updater';
import { getCodeLoader } from './remote-code-loader';
import { initDeviceId, getDeviceId } from './device-id';

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

  // Auth handlers
  ipcMain.handle('auth:check', async () => {
    const token = authStore.getToken();
    const user = authStore.getUser();
    if (!token || !user) return null;
    try {
      const school = await apiClient.getMySchool(token).catch(() => null);
      return { user, school };
    } catch {
      authStore.clear();
      return null;
    }
  });

  ipcMain.handle('auth:login', async (_event, email: string, password: string) => {
    const result = await apiClient.login(email, password);
    authStore.save(result.token, result.user);
    const school = await apiClient.getMySchool(result.token).catch(() => null);
    return { user: result.user, school };
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
  function dbToAccount(m: MebbisAccount): Account {
    return {
      id: String(m.id),
      username: m.username ?? '',
      password: m.password ?? '',
      label: m.label,
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
    if (!token) return [];
    try {
      const dbAccounts = await apiClient.getMebbisAccounts(token);
      return dbAccounts.map(m => ({
        ...dbToAccount(m),
        isRunning: mebbisManager.isRunning(String(m.id)),
        subscription: m.subscription,
      }));
    } catch {
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
    if (!token) throw new Error('Not authenticated');
    const schoolId = parseInt(data.id, 10);
    const dbAccounts = await apiClient.getMebbisAccounts(token);
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
    if (!token) throw new Error('Not authenticated');
    const dbAccounts = await apiClient.getMebbisAccounts(token);
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
  getCodeLoader().sync().catch(() => {});

  // Register IPC handlers before creating window so they're ready
  // when the renderer loads and immediately calls accounts:list
  setupIPC();

  createMainWindow();

  // Set up auto-updater for future checks
  setupAutoUpdater(mainWindow!);

  // Set up application menu with only "Hakkında"
  const menu = Menu.buildFromTemplate([
    {
      label: 'Hakkında',
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Hakkında',
          message: `MTSK Uygulaması\nSürüm: v${app.getVersion()}`,
          detail: `Web: online.mtsk.app\nWhatsApp: +90 552 187 03 34`,
          buttons: ['WhatsApp', 'Web Sitesi', 'Kapat'],
          defaultId: 2,
          cancelId: 2,
        }).then((result) => {
          if (result.response === 0) {
            shell.openExternal('https://wa.me/905521870334');
          } else if (result.response === 1) {
            shell.openExternal('https://online.mtsk.app');
          }
        });
      },
    },
  ]);
  Menu.setApplicationMenu(menu);

  // Show "What's New" dialog on first launch after update
  showWhatsNewIfUpdated(mainWindow!);
});

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
