import { autoUpdater } from 'electron-updater';
import { app, BrowserWindow, dialog } from 'electron';
import https from 'https';

const VERSION_CHECK_URL = 'https://online.mtsk.app/desktop-updates/minimum_version.json';
const UPDATE_BASE_URL = 'https://online.mtsk.app/desktop-updates';

interface VersionCheckResult {
  allowed: boolean;
  latestVersion: string;
  minimumVersion: string;
  message: string;
}

/**
 * Compare two semver strings. Returns:
 *  -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

/**
 * STRICT VERSION GATE
 *
 * On startup, the app fetches the minimum required version from minimum_version.json.
 * If the current version is below that → the app is LOCKED.
 * The user MUST update to continue. No skip, no "later".
 *
 * Flow:
 * 1. App starts → enforceVersionCheck() blocks until check completes
 * 2. GET https://online.mtsk.app/desktop-updates/minimum_version.json
 * 3. If allowed=false → show mandatory update dialog (no dismiss)
 * 4. Force download → force install → app restarts with new version
 * 5. If server unreachable → allow running (can't gate without server)
 */

const APP_VERSION = app.getVersion(); // reads from package.json "version"

/**
 * Must be called BEFORE the main window loads any content.
 * Returns true if app is allowed to run, false if it must quit.
 */
export async function enforceVersionCheck(
  mainWindow: BrowserWindow,
): Promise<boolean> {
  console.log(`[VersionGate] Current version: ${APP_VERSION}`);

  try {
    const result = await fetchVersionCheck(APP_VERSION);
    console.log(`[VersionGate] Server response:`, result);

    if (result.allowed) {
      console.log('[VersionGate] Version allowed. Starting app normally.');
      // Still set up auto-updater for non-mandatory updates
      setupAutoUpdater(mainWindow);
      return true;
    }

    // VERSION BLOCKED — force update
    console.log(
      `[VersionGate] BLOCKED! Current: ${APP_VERSION}, minimum: ${result.minimumVersion}, latest: ${result.latestVersion}`,
    );

    await forceMandatoryUpdate(mainWindow, result);
    // If we reach here, the download failed or user somehow dismissed
    return false;
  } catch (err: any) {
    // Server unreachable — allow the app to run
    // (can't enforce gate if server is down)
    console.warn(`[VersionGate] Server unreachable: ${err.message}. Allowing app to run.`);
    return true;
  }
}

/**
 * Show a non-dismissable dialog and force download + install.
 * The user cannot use the app until they update.
 */
async function forceMandatoryUpdate(
  mainWindow: BrowserWindow,
  versionInfo: VersionCheckResult,
): Promise<void> {
  // Configure auto-updater
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: UPDATE_BASE_URL,
  });
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  // Show blocking dialog — only one button: "Güncelle"
  await dialog.showMessageBox(mainWindow, {
    type: 'error',
    title: 'Güncelleme Zorunlu',
    message:
      `Mevcut sürüm: v${APP_VERSION}\n` +
      `Gerekli minimum sürüm: v${versionInfo.minimumVersion}\n\n` +
      `${versionInfo.message}\n\n` +
      `Uygulamayı kullanmaya devam etmek için güncelleme yapmanız gerekmektedir.`,
    buttons: ['Güncelle'],
    noLink: true,
  });

  // Start downloading — show progress on taskbar
  return new Promise<void>((resolve) => {
    autoUpdater.on('download-progress', (progress) => {
      const pct = Math.round(progress.percent);
      console.log(`[VersionGate] Downloading: ${pct}%`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setProgressBar(progress.percent / 100);
        mainWindow.setTitle(`MEBBIS - Güncelleniyor... %${pct}`);
      }
    });

    autoUpdater.on('update-downloaded', () => {
      console.log('[VersionGate] Update downloaded. Installing and restarting...');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setProgressBar(-1);
      }
      // Immediately quit and install — no choice
      autoUpdater.quitAndInstall(false, true);
    });

    autoUpdater.on('error', async (err) => {
      console.error('[VersionGate] Download error:', err.message);
      const retry = await dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Güncelleme Hatası',
        message: `Güncelleme indirilemedi: ${err.message}\n\nTekrar denemek ister misiniz?`,
        buttons: ['Tekrar Dene', 'Çıkış'],
        noLink: true,
      });

      if (retry.response === 0) {
        autoUpdater.downloadUpdate().catch(() => {});
      } else {
        app.quit();
        resolve();
      }
    });

    autoUpdater.on('update-not-available', async () => {
      // Server says we're outdated but electron-updater says no update available
      // This means the update files aren't deployed yet on the server
      console.error('[VersionGate] No update file on server despite version being blocked.');
      await dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Güncelleme Bulunamadı',
        message:
          'Güncelleme dosyası sunucuda henüz mevcut değil.\n' +
          'Lütfen yöneticinize başvurun.\n\n' +
          'Uygulama kapatılacak.',
        buttons: ['Tamam'],
        noLink: true,
      });
      app.quit();
      resolve();
    });

    // Trigger check + download
    autoUpdater.checkForUpdates().catch(() => {});

    autoUpdater.on('update-available', () => {
      autoUpdater.downloadUpdate().catch(() => {});
    });
  });
}

/**
 * Non-blocking auto-updater for when the version IS allowed.
 * Shows optional update prompts for newer versions.
 */
function setupAutoUpdater(mainWindow: BrowserWindow | null) {
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: UPDATE_BASE_URL,
  });

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    console.log(`[AutoUpdater] Optional update available: v${info.version}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog
        .showMessageBox(mainWindow, {
          type: 'info',
          title: 'Güncelleme Mevcut',
          message: `Yeni sürüm mevcut: v${info.version}\n\nŞimdi indirmek ister misiniz?`,
          buttons: ['İndir', 'Daha Sonra'],
          defaultId: 0,
        })
        .then((result) => {
          if (result.response === 0) {
            autoUpdater.downloadUpdate();
          }
        });
    }
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdater] Already on latest version.');
  });

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setProgressBar(progress.percent / 100);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setProgressBar(-1);
      dialog
        .showMessageBox(mainWindow, {
          type: 'info',
          title: 'Güncelleme Hazır',
          message: `v${info.version} indirildi.\n\nYeniden başlatmak ister misiniz?`,
          buttons: ['Yeniden Başlat', 'Daha Sonra'],
          defaultId: 0,
        })
        .then((result) => {
          if (result.response === 0) {
            autoUpdater.quitAndInstall();
          }
        });
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err.message);
  });

  autoUpdater.checkForUpdates().catch((err) => {
    console.warn('[AutoUpdater] Check failed:', err.message);
  });
}

/**
 * Fetch minimum required version from minimum_version.json and compare with current.
 */
function fetchVersionCheck(
  version: string,
): Promise<VersionCheckResult> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      VERSION_CHECK_URL,
      {
        timeout: 10000,
        headers: {
          'User-Agent': `mebbis-desktop/${version}`,
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const minimumVersion = (json.minimumVersion || '').trim();
            if (!/^\d+\.\d+\.\d+/.test(minimumVersion)) {
              reject(new Error('Invalid version format in minimum_version.json'));
              return;
            }
            const allowed = compareSemver(version, minimumVersion) >= 0;
            resolve({
              allowed,
              latestVersion: minimumVersion,
              minimumVersion,
              message: json.message || (allowed
                ? 'Sürümünüz güncel.'
                : 'Uygulamanızın sürümü eski. Lütfen güncelleyin.'),
            });
          } catch {
            reject(new Error('Invalid JSON in minimum_version.json'));
          }
        });
      },
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}
