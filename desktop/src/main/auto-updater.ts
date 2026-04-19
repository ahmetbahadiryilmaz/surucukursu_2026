import { autoUpdater } from 'electron-updater';
import { app, BrowserWindow, dialog } from 'electron';
import https from 'https';
import * as fs from 'fs';
import * as path from 'path';

const VERSION_CHECK_URL = 'https://online.mtsk.app/desktop-updates/minimum_version.json';
const UPDATE_BASE_URL = 'https://online.mtsk.app/desktop-updates';

/**
 * Changelog entries — add a new key for every deployed version.
 * Shown BEFORE update (in the update prompt) and AFTER update (on first launch).
 */
const CHANGELOG: Record<string, string[]> = {
  '1.1.6': [
    'Hakkında menüü eklendi — sürüm, WhatsApp ve web sitesi bilgisi',
  ],
  '1.1.5': [
    'Güncelleme zorla yükleniyor — “Daha Sonra” seçeneği kaldırıldı, indirme otomatik başlıyor',
  ],
  '1.1.4': [
    '"Yenilikler" bildirimi eklendi — güncelleme öncesi ve sonrası değişiklikler gösteriliyor',
  ],
  '1.1.3': [
    'Simulatör klasör adından kurum adı kaldırıldı (artık sadece TC_AD_SOYAD)',
  ],
  '1.1.2': [
    'Uygulama ikonu güncellendi (kuş ikonu)',
    'Simulatör ek4 şablon desteği eklendi',
    'Öğrenci adı düzeltildi (kurum adı karışmaması)',
  ],
  '1.1.1': [
    'Dönem bilgisi MEBBIS\'ten doğru sütundan okunuyor (Dönemi kolonu)',
    'Toplu direksiyon klasör yapısı: direksiyon/{dönem}/{tc}_{ad}_direksiyon.pdf',
    'Klasör yazma yetkisi kontrolü eklendi',
    'Simulasyon menüsü yeniden düzenlendi',
  ],
  '1.1.0': [
    'Sanal bellek çökmesi düzeltildi',
    'Sertifika dönem bilgisi ilk satırdan (en yeni) okunuyor',
  ],
};

function getChangelog(version: string): string {
  const entries = CHANGELOG[version];
  if (!entries || entries.length === 0) return '';
  return '\n\nYenilikler:\n' + entries.map((e) => `  • ${e}`).join('\n');
}

/** Path to the file that stores which version was last shown in "What's New" */
function getLastSeenVersionPath(): string {
  return path.join(app.getPath('userData'), 'last-seen-version.txt');
}

function readLastSeenVersion(): string {
  try {
    return fs.readFileSync(getLastSeenVersionPath(), 'utf-8').trim();
  } catch {
    return '';
  }
}

function writeLastSeenVersion(version: string): void {
  try {
    fs.writeFileSync(getLastSeenVersionPath(), version, 'utf-8');
  } catch {
    // non-critical
  }
}

/**
 * Show "What's New" dialog on first launch after a version update.
 * Collects all changelog entries from versions newer than last-seen.
 */
export function showWhatsNewIfUpdated(mainWindow: BrowserWindow): void {
  const current = app.getVersion();
  const lastSeen = readLastSeenVersion();

  if (lastSeen === current) return; // already shown for this version

  // Collect all versions newer than lastSeen, sorted newest first
  const allVersions = Object.keys(CHANGELOG).sort((a, b) => compareSemver(b, a));
  const newVersions = lastSeen
    ? allVersions.filter((v) => compareSemver(v, lastSeen) > 0)
    : allVersions.slice(0, 1); // fresh install: just show current

  if (newVersions.length === 0) {
    writeLastSeenVersion(current);
    return;
  }

  const changeLines = newVersions
    .map((v) => {
      const entries = CHANGELOG[v];
      if (!entries || entries.length === 0) return null;
      return `v${v}:\n` + entries.map((e) => `  • ${e}`).join('\n');
    })
    .filter(Boolean)
    .join('\n\n');

  if (!changeLines) {
    writeLastSeenVersion(current);
    return;
  }

  writeLastSeenVersion(current);

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: `v${current} — Yenilikler`,
    message: `Uygulama güncellendi! (v${current})\n\n${changeLines}`,
    buttons: ['Tamam'],
    noLink: true,
  });
}

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
 * Creates a dedicated splash window, checks version, handles update if needed.
 * Returns true if app is allowed to run (splash window is closed).
 * Returns false if app must quit (update in progress or user quit).
 * The main window should ONLY be created after this returns true.
 */
export async function enforceVersionCheckWithSplash(): Promise<boolean> {
  console.log(`[VersionGate] Current version: ${APP_VERSION}`);

  const splash = new BrowserWindow({
    width: 400,
    height: 260,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    transparent: false,
    center: true,
    show: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Render a simple HTML splash screen inline
  splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: #1a1a2e; color: white; font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; user-select: none; }
      h1 { font-size: 22px; color: #4361ee; margin-bottom: 8px; }
      .version { font-size: 13px; color: #666; margin-bottom: 24px; }
      .status { font-size: 14px; color: #ccc; margin-bottom: 16px; }
      .progress-bar { width: 300px; height: 6px; background: #2a2a4a; border-radius: 3px; overflow: hidden; display: none; }
      .progress-fill { height: 100%; background: #4361ee; width: 0%; transition: width 0.3s; border-radius: 3px; }
    </style></head>
    <body>
      <h1>MTSK Uygulaması</h1>
      <div class="version">v${APP_VERSION}</div>
      <div class="status" id="status">Sürüm kontrol ediliyor...</div>
      <div class="progress-bar" id="progressBar"><div class="progress-fill" id="progressFill"></div></div>
    </body>
    </html>
  `)}`);

  const setStatus = (text: string) => {
    if (!splash.isDestroyed()) {
      splash.webContents.executeJavaScript(
        `document.getElementById('status').textContent = ${JSON.stringify(text)};`
      ).catch(() => {});
    }
  };

  const showProgress = (percent: number) => {
    if (!splash.isDestroyed()) {
      splash.webContents.executeJavaScript(`
        document.getElementById('progressBar').style.display = 'block';
        document.getElementById('progressFill').style.width = '${Math.round(percent)}%';
      `).catch(() => {});
    }
  };

  try {
    const splashStart = Date.now();
    const result = await fetchVersionCheck(APP_VERSION);
    console.log(`[VersionGate] Server response:`, result);

    if (result.allowed) {
      console.log('[VersionGate] Version allowed. Starting app normally.');
      // Show splash for at least 1 second
      const elapsed = Date.now() - splashStart;
      if (elapsed < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
      }
      if (!splash.isDestroyed()) splash.close();
      return true;
    }

    // VERSION BLOCKED — force update in splash window
    console.log(
      `[VersionGate] BLOCKED! Current: ${APP_VERSION}, minimum: ${result.minimumVersion}, latest: ${result.latestVersion}`,
    );

    setStatus('Güncelleme zorunlu! İndiriliyor...');
    await forceMandatoryUpdate(splash, result, setStatus, showProgress);
    // If we reach here, the download failed or user somehow dismissed
    return false;
  } catch (err: any) {
    // Server unreachable — allow the app to run
    console.warn(`[VersionGate] Server unreachable: ${err.message}. Allowing app to run.`);
    if (!splash.isDestroyed()) splash.close();
    return true;
  }
}

/**
 * @deprecated Use enforceVersionCheckWithSplash() instead.
 * Kept for backward compatibility but redirects to splash version.
 */
export async function enforceVersionCheck(
  _mainWindow: BrowserWindow,
): Promise<boolean> {
  return enforceVersionCheckWithSplash();
}

/**
 * Show a non-dismissable dialog and force download + install.
 * The user cannot use the app until they update.
 */
async function forceMandatoryUpdate(
  splashWindow: BrowserWindow,
  versionInfo: VersionCheckResult,
  setStatus: (text: string) => void,
  showProgress: (percent: number) => void,
): Promise<void> {
  // Configure auto-updater
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: UPDATE_BASE_URL,
  });
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  setStatus(`Güncelleme indiriliyor... (v${versionInfo.minimumVersion})`);

  // Start downloading
  return new Promise<void>((resolve) => {
    autoUpdater.on('download-progress', (progress) => {
      const pct = Math.round(progress.percent);
      console.log(`[VersionGate] Downloading: ${pct}%`);
      setStatus(`İndiriliyor... %${pct}`);
      showProgress(progress.percent);
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.setProgressBar(progress.percent / 100);
      }
    });

    autoUpdater.on('update-downloaded', () => {
      console.log('[VersionGate] Update downloaded. Installing and restarting...');
      setStatus('Güncelleme yükleniyor...');
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.setProgressBar(-1);
      }
      // Immediately quit and install — no choice
      autoUpdater.quitAndInstall(false, true);
    });

    autoUpdater.on('error', async (err) => {
      console.error('[VersionGate] Download error:', err.message);
      const retry = await dialog.showMessageBox(splashWindow, {
        type: 'error',
        title: 'Güncelleme Hatası',
        message: `Güncelleme indirilemedi: ${err.message}\n\nTekrar denemek ister misiniz?`,
        buttons: ['Tekrar Dene', 'Çıkış'],
        noLink: true,
      });

      if (retry.response === 0) {
        setStatus('Tekrar deneniyor...');
        autoUpdater.downloadUpdate().catch(() => {});
      } else {
        app.quit();
        resolve();
      }
    });

    autoUpdater.on('update-not-available', async () => {
      console.error('[VersionGate] No update file on server despite version being blocked.');
      await dialog.showMessageBox(splashWindow, {
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
 * Periodic version gate — checks minimum_version.json every 10 seconds.
 * If the current version is no longer allowed, forcefully shows the splash
 * update screen (hides main window) and forces the update.
 */
let periodicCheckInterval: ReturnType<typeof setInterval> | null = null;

export function setupAutoUpdater(mainWindow: BrowserWindow | null) {
  if (periodicCheckInterval) return; // already running

  console.log('[PeriodicVersionCheck] Starting periodic check every 10s');

  periodicCheckInterval = setInterval(async () => {
    try {
      const result = await fetchVersionCheck(APP_VERSION);
      if (!result.allowed) {
        console.log(`[PeriodicVersionCheck] BLOCKED! Current: ${APP_VERSION}, minimum: ${result.minimumVersion}`);
        // Stop further checks
        if (periodicCheckInterval) {
          clearInterval(periodicCheckInterval);
          periodicCheckInterval = null;
        }
        // Hide main window so user can't interact
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.hide();
        }
        // Show splash update screen
        await enforceVersionCheckWithSplash();
      }
    } catch (err: any) {
      // Server unreachable — skip this check silently
      console.warn(`[PeriodicVersionCheck] Check failed: ${err.message}`);
    }
  }, 10000);
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
