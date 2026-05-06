/**
 * Bootstrap (stays in the exe).
 *
 * Responsibilities:
 *   1. Crash-fix command-line switches (must run before app.whenReady).
 *   2. Privileged-scheme registration for the renderer protocol.
 *   3. Hardware device-id init.
 *   4. Mandatory version gate (electron-updater) — happens BEFORE any
 *      remote-code is fetched, so a broken bundle on the server can't
 *      brick existing clients.
 *   5. Fetch + decrypt + execute the remoted main bundle in memory.
 *      In dev mode, skip the fetch and import app-controller directly
 *      for fast iteration.
 *   6. Hand off control to `app-controller.start(ctx)` — everything
 *      after that point is updateable via remote-code deploy.
 *
 * Anything that changes often (UI strings, IPC handlers, business
 * logic, MEBBIS automation) lives in app-controller.ts and the renderer
 * files — both are remoted. This file should rarely change.
 */

import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { IS_DEV } from './config';
import {
  registerRendererSchemeAsPrivileged,
  installRendererProtocol,
  RENDERER_INDEX_URL,
} from './renderer-protocol';
import {
  enforceVersionCheckWithSplash,
  setupAutoUpdater,
  fetchVersionCheck,
  showWhatsNewIfUpdated,
  getPendingWhatsNew,
  markWhatsNewSeen,
} from './auto-updater';
import { getCodeLoader } from './remote-code-loader';
import * as remoteCodeLoaderModule from './remote-code-loader';
import * as configModule from './config';
import * as cryptoClientModule from './desktop-crypto-client';
import * as autoUpdaterModule from './auto-updater';
import { initDeviceId, getDeviceId } from './device-id';
import { BootstrapSplash, fetchWithSplashRetry } from './bootstrap-splash';
import { loadBundle } from './module-host';
import type { BootstrapContext, AppControllerHandle } from '../main/app-controller';

// Crash-fix switches: must be set before app.whenReady().
app.commandLine.appendSwitch(
  'disable-features',
  'CalculateNativeWinOcclusion,RendererCodeIntegrity',
);
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

// Renderer scheme registration must also run before whenReady.
registerRendererSchemeAsPrivileged();

app.whenReady().then(async () => {
  await initDeviceId().catch(() => {});

  // Mandatory exe version gate. May force-update the installer or quit.
  const allowed = await enforceVersionCheckWithSplash();
  if (!allowed) return;

  // Bundled module-host uses these path strings directly — compute once.
  const preloadPath = path.join(__dirname, '..', 'preload', 'preload.js');
  const devRendererIndex = path.join(
    __dirname, '..', '..', 'src', 'renderer', 'index.html',
  );
  const rendererIndexUrl = IS_DEV
    ? `file://${devRendererIndex.replace(/\\/g, '/')}`
    : RENDERER_INDEX_URL;

  const codeLoader = getCodeLoader();

  let appControllerStart: (ctx: BootstrapContext) => Promise<AppControllerHandle>;

  if (IS_DEV) {
    // Dev mode: import the controller directly — no bundle build needed.
    // Set DESKTOP_FORCE_REMOTE_CODE=1 in .env to test the prod bundle
    // pipeline locally end-to-end.
    appControllerStart = (await import('../main/app-controller')).start;
  } else {
    const remoteStart = await loadRemoteController(codeLoader);
    if (!remoteStart) return; // user chose Çıkış
    appControllerStart = remoteStart;
    installRendererProtocol();
  }

  await appControllerStart({
    appVersion: app.getVersion(),
    isDev: IS_DEV,
    rendererIndexUrl,
    preloadPath,
    codeLoader,
    setupAutoUpdater,
    fetchVersionCheck,
    showWhatsNewIfUpdated,
    getPendingWhatsNew,
    markWhatsNewSeen,
    getDeviceId,
  });

  // Background tasks that depend on the controller having created a
  // BrowserWindow. The getter rescans every tick so re-creation via
  // `app.on('activate')` is handled.
  const findWindow = () => {
    const wins = BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed());
    return wins[0] ?? null;
  };
  codeLoader.startVersionPolling(findWindow);

  const initialWindow = findWindow();
  if (initialWindow) {
    codeLoader.showCodeWhatsNewIfPending(initialWindow).catch(() => {});
  }
});

/**
 * Production-only path: shows the splash, fetches the encrypted bundle
 * from the server, decrypts in-memory, and evaluates it via the
 * module-host. Returns the bundle's `start` function on success, or
 * null if the user clicked Çıkış after exhausting retries.
 */
async function loadRemoteController(
  codeLoader: ReturnType<typeof getCodeLoader>,
): Promise<((ctx: BootstrapContext) => Promise<AppControllerHandle>) | null> {
  const splash = new BootstrapSplash();
  splash.show(app.getVersion());

  const start = await fetchWithSplashRetry(splash, async () => {
    await codeLoader.sync();
    const bundleBuf = codeLoader.getFileBuffer('main/app-bundle.js');
    if (!bundleBuf) {
      throw new Error('Sunucudan ana modül alınamadı (main/app-bundle.js eksik).');
    }
    const code = bundleBuf.toString('utf-8');
    // Every launcher module that the bundle imports via ../launcher/* must
    // be exposed here so the module-host's custom require() can resolve the
    // bootstrap:<name> alias the build-remote esbuild plugin emits.
    const loaded = loadBundle(code, 'app-bundle.js', {
      'bootstrap:remote-code-loader': remoteCodeLoaderModule,
      'bootstrap:config': configModule,
      'bootstrap:desktop-crypto-client': cryptoClientModule,
      'bootstrap:auto-updater': autoUpdaterModule,
    });
    const fn = loaded.exports?.start;
    if (typeof fn !== 'function') {
      throw new Error('Ana modül "start" fonksiyonunu dışa aktarmıyor.');
    }
    return fn as (ctx: BootstrapContext) => Promise<AppControllerHandle>;
  });

  splash.close();
  return start;
}
