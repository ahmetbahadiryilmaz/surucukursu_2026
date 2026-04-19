import { app, BrowserWindow, ipcMain, session, Menu, dialog, shell } from 'electron';
import * as path from 'path';
import { AccountStore, Account, SimulatorType } from './account-store';
import { MebbisManager } from './mebbis-manager';
import { enforceVersionCheckWithSplash, showWhatsNewIfUpdated, setupAutoUpdater } from './auto-updater';

// Fix "discard virtual memory" crash on Windows
// These must be set before app.whenReady()
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,RendererCodeIntegrity');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

let mainWindow: BrowserWindow | null = null;
let accountStore: AccountStore;
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
  // Account CRUD
  ipcMain.handle('accounts:list', async () => {
    return accountStore.getAll();
  });

  ipcMain.handle('accounts:add', async (_event, data: { username: string; password: string; label: string }) => {
    return accountStore.add(data.username, data.password, data.label);
  });

  ipcMain.handle('accounts:update', async (_event, data: { id: string; username?: string; password?: string; label?: string; simulatorType?: string }) => {
    const { id, simulatorType, ...rest } = data;
    return accountStore.update(id, { ...rest, simulatorType: simulatorType as SimulatorType | undefined });
  });

  ipcMain.handle('accounts:remove', async (_event, id: string) => {
    // Stop if running
    mebbisManager.stop(id);
    // Clear session data for this account
    const partition = `persist:mebbis-${id}`;
    const ses = session.fromPartition(partition);
    await ses.clearStorageData();
    accountStore.remove(id);
    return true;
  });

  // Account session controls
  ipcMain.handle('accounts:start', async (_event, id: string) => {
    const account = accountStore.getById(id);
    if (!account) throw new Error('Account not found');
    mebbisManager.start(account, mainWindow!);
    accountStore.setRunning(id, true);
    return true;
  });

  ipcMain.handle('accounts:stop', async (_event, id: string) => {
    mebbisManager.stop(id);
    accountStore.setRunning(id, false);
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
  accountStore = new AccountStore();
  mebbisManager = new MebbisManager();

  // STRICT VERSION GATE — splash window checks version BEFORE main window exists
  const allowed = await enforceVersionCheckWithSplash();
  if (!allowed) {
    // App is being updated or user chose to quit
    return;
  }

  // Version is OK — now create the main window
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
