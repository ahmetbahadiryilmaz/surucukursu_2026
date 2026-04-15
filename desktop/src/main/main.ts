import { app, BrowserWindow, ipcMain, session } from 'electron';
import * as path from 'path';
import { AccountStore, Account } from './account-store';
import { MebbisManager } from './mebbis-manager';
import { enforceVersionCheck } from './auto-updater';

let mainWindow: BrowserWindow | null = null;
let accountStore: AccountStore;
let mebbisManager: MebbisManager;

const API_SERVER_URL = process.env.API_SERVER_URL || 'http://localhost:3001';

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

  mainWindow.removeMenu();

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

  ipcMain.handle('accounts:update', async (_event, data: { id: string; username?: string; password?: string; label?: string }) => {
    return accountStore.update(data.id, data);
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

  createMainWindow();

  // STRICT VERSION GATE — must pass before app becomes usable
  const allowed = await enforceVersionCheck(API_SERVER_URL, mainWindow!);
  if (!allowed) {
    // App is being updated or user chose to quit — don't set up IPC
    return;
  }

  setupIPC();
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
