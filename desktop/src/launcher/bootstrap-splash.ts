/**
 * BootstrapSplash
 * ───────────────
 * Loading window shown while the main-process bundle and renderer files
 * are being fetched + decrypted + loaded into memory at startup.
 *
 *   Loading state:   "Yükleniyor..." with a progress message
 *   Error state:     error text + [Tekrar Dene] [Çıkış]  buttons
 *
 * The splash uses nodeIntegration on inline HTML it generates itself —
 * no remote content is loaded, so there's no XSS surface.
 */

import { BrowserWindow, ipcMain, app } from 'electron';

const ACTION_CHANNEL = 'bootstrap-splash:action';

const HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1a1a2e; color: #e9e9f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; user-select: none; -webkit-user-select: none; padding: 24px; text-align: center; }
  h1 { font-size: 22px; color: #4361ee; margin-bottom: 4px; font-weight: 600; }
  .version { font-size: 12px; color: #6b6b8a; margin-bottom: 24px; }
  #status { font-size: 14px; color: #b9b9d1; margin-bottom: 16px; min-height: 20px; }
  #error-detail { font-size: 12px; color: #fc8181; margin-bottom: 18px; max-width: 360px; word-wrap: break-word; line-height: 1.4; display: none; }
  .spinner { width: 28px; height: 28px; border: 3px solid #2a2a4a; border-top-color: #4361ee; border-radius: 50%; animation: spin 0.8s linear infinite; }
  .actions { display: none; gap: 10px; margin-top: 4px; }
  button { background: #4361ee; color: white; border: 0; padding: 8px 18px; border-radius: 6px; font-size: 13px; cursor: pointer; font-family: inherit; }
  button.secondary { background: #2a2a4a; color: #e9e9f5; }
  button:hover { filter: brightness(1.1); }
  @keyframes spin { to { transform: rotate(360deg); } }
  .show-error #spinner { display: none; }
  .show-error #error-detail { display: block; }
  .show-error .actions { display: flex; }
</style></head>
<body>
  <h1>MTSK Uygulaması</h1>
  <div class="version" id="version"></div>
  <div id="status">Yükleniyor...</div>
  <div id="error-detail"></div>
  <div id="spinner" class="spinner"></div>
  <div class="actions">
    <button id="btn-retry">Tekrar Dene</button>
    <button id="btn-quit" class="secondary">Çıkış</button>
  </div>
  <script>
    const { ipcRenderer } = require('electron');
    document.getElementById('btn-retry').addEventListener('click', () => {
      ipcRenderer.send('${ACTION_CHANNEL}', 'retry');
    });
    document.getElementById('btn-quit').addEventListener('click', () => {
      ipcRenderer.send('${ACTION_CHANNEL}', 'quit');
    });
    ipcRenderer.on('splash:status', (_e, text) => {
      document.getElementById('status').textContent = text;
    });
    ipcRenderer.on('splash:error', (_e, detail) => {
      document.body.classList.add('show-error');
      document.getElementById('status').textContent = 'Bağlantı sağlanamadı';
      document.getElementById('error-detail').textContent = detail || '';
    });
    ipcRenderer.on('splash:loading', () => {
      document.body.classList.remove('show-error');
      document.getElementById('status').textContent = 'Yükleniyor...';
    });
    ipcRenderer.on('splash:version', (_e, v) => {
      document.getElementById('version').textContent = v ? 'v' + v : '';
    });
  </script>
</body>
</html>`;

export type BootstrapAction = 'retry' | 'quit';

export class BootstrapSplash {
  private win: BrowserWindow | null = null;
  private actionListener: ((event: Electron.IpcMainEvent, action: BootstrapAction) => void) | null = null;
  private pendingAction: ((a: BootstrapAction) => void) | null = null;

  show(version?: string): void {
    if (this.win && !this.win.isDestroyed()) return;

    this.win = new BrowserWindow({
      width: 420,
      height: 280,
      frame: false,
      resizable: false,
      alwaysOnTop: true,
      center: true,
      show: true,
      backgroundColor: '#1a1a2e',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        sandbox: false,
      },
    });

    this.win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(HTML)}`);

    if (version) {
      this.win.webContents.once('did-finish-load', () => {
        this.send('splash:version', version);
      });
    }

    this.actionListener = (_event, action) => {
      const cb = this.pendingAction;
      this.pendingAction = null;
      if (cb) cb(action);
    };
    ipcMain.on(ACTION_CHANNEL, this.actionListener);
  }

  setStatus(text: string): void {
    this.send('splash:loading');
    this.send('splash:status', text);
  }

  /**
   * Switch the splash to error state and resolve when the user clicks
   * Tekrar Dene or Çıkış. Caller owns the retry loop.
   */
  showErrorAndAwaitAction(detail: string): Promise<BootstrapAction> {
    this.send('splash:error', detail);
    return new Promise<BootstrapAction>((resolve) => {
      this.pendingAction = resolve;
    });
  }

  close(): void {
    if (this.actionListener) {
      ipcMain.removeListener(ACTION_CHANNEL, this.actionListener);
      this.actionListener = null;
    }
    if (this.pendingAction) {
      this.pendingAction = null;
    }
    if (this.win && !this.win.isDestroyed()) {
      this.win.close();
    }
    this.win = null;
  }

  private send(channel: string, ...args: unknown[]): void {
    if (!this.win || this.win.isDestroyed()) return;
    try {
      this.win.webContents.send(channel, ...args);
    } catch {
      // window destroyed mid-send — ignore
    }
  }
}

/**
 * Convenience for the bootstrap: run a fetcher that may fail, retry on
 * user request, quit on user request. Resolves with the fetcher's value
 * on success or null if the user chose Çıkış (caller should app.quit()).
 */
export async function fetchWithSplashRetry<T>(
  splash: BootstrapSplash,
  fetcher: () => Promise<T>,
  loadingMessage = 'Sunucudan güncel kod alınıyor...',
): Promise<T | null> {
  while (true) {
    splash.setStatus(loadingMessage);
    try {
      return await fetcher();
    } catch (err: any) {
      const detail = err?.message ?? String(err);
      console.warn('[BootstrapSplash] Fetch failed:', detail);
      const action = await splash.showErrorAndAwaitAction(detail);
      if (action === 'quit') {
        app.quit();
        return null;
      }
      // 'retry' falls through the loop
    }
  }
}
