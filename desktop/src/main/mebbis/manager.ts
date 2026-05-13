import { app, BrowserWindow, session, dialog, shell } from 'electron';
import { Account } from '../storage/account-store';
import * as path from 'path';
import * as fs from 'fs';
import { getCodeLoader } from '../../launcher/remote-code-loader';
import { fetchEncryptedTemplate } from '../templates/template-fetcher';
import { getRequestLogger } from '../utils/request-logger';
import { getStudentDb } from '../storage/student-db';
import { pushList, pushDetail } from '../sync/student-sync';
import { getPersonnelDb, PersonnelDetailData } from '../storage/personnel-db';
import { pushPersonnelList, pushPersonnelDetail } from '../sync/personnel-sync';
import { fetchKurumInfo } from '../sync/kurum-info-sync';
import { fetchCars, updateCarRoute } from '../sync/car-sync';
import type { RemoteKurumInfo, RemoteCar } from '../api/api-client';


interface RunningAccount {
  account: Account;
  window: BrowserWindow;
}

// StudentRecord type is defined in student-db.ts (re-exported via DB module)

/**
 * In-page helpers injected into every dgDersProgrami scrape so we can pick
 * the right Dönem (period) regardless of MEBBIS row order. Parses
 * "YYYY - <Turkish month>" (or "YYYY - <month number>") into a comparable
 * key, exposes:
 *   _periodKey(label)      → numeric key (year*12 + monthIndex), -Infinity if unparseable
 *   _filterByNewest(rows)  → rows belonging to the chronologically newest period
 *   _filterByPeriod(rows, targetLabel)
 *                          → rows whose period matches targetLabel; falls back to newest
 *
 * Background: MEBBIS lists periods newest-first sometimes and oldest-first
 * sometimes, so we cannot trust array position. See the Mehmet Çelik
 * regression where "lessons[length-1]" picked the older Nisan period.
 */
const PERIOD_HELPERS_JS = `
  const TR_MONTHS = {
    'Ocak':0,'Şubat':1,'Mart':2,'Nisan':3,'Mayıs':4,'Haziran':5,
    'Temmuz':6,'Ağustos':7,'Eylül':8,'Ekim':9,'Kasım':10,'Aralık':11
  };
  function _periodKey(p) {
    const s = String(p == null ? '' : p).trim();
    const m = s.match(/(\\d{4})\\s*-\\s*(.+)/);
    if (!m) return -Infinity;
    const year = parseInt(m[1], 10);
    const tail = m[2].trim();
    let month;
    if (/^\\d+$/.test(tail)) {
      month = parseInt(tail, 10) - 1;
    } else {
      month = TR_MONTHS[tail];
    }
    if (month == null || isNaN(month)) return -Infinity;
    return year * 12 + month;
  }
  function _pickNewestPeriod(rows) {
    let best = -Infinity, picked = null;
    for (const r of rows) {
      const k = _periodKey(r[0]);
      if (k > best) { best = k; picked = r[0]; }
    }
    return picked;
  }
  function _filterByNewest(rows) {
    if (!rows.length) return rows;
    const newest = _pickNewestPeriod(rows);
    return newest ? rows.filter(r => r[0] === newest) : rows;
  }
  function _filterByPeriod(rows, targetLabel) {
    if (!targetLabel) return _filterByNewest(rows);
    const targetKey = _periodKey(targetLabel);
    const matches = targetKey > -Infinity
      ? rows.filter(r => _periodKey(r[0]) === targetKey)
      : rows.filter(r => r[0] === targetLabel);
    return matches.length ? matches : _filterByNewest(rows);
  }
`;

export class MebbisManager {
  private running: Map<string, RunningAccount> = new Map();
  private loginAttempts: Map<string, number> = new Map();
  private autoRefreshIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private activityLogger: ((accountId: string, pdfType: 'direksiyon_takip' | 'simulator_raporu', count: number) => void) | null = null;
  private batchStateListener: ((inProgress: boolean) => void) | null = null;

  // Pending "open student" navigation triggered from sidebar Details button
  private pendingOpenStudent: Map<string, { tc: string; phase: 'skt-module' | 'skt02009' }> = new Map();

  // Personnel-update navigation: when the user clicks "Güncelle" we set this
  // flag, navigate to OOK's home (ook00001) to establish the OOK module
  // session, then auto-navigate to ook12001 on home-page load. A direct hop
  // to ook12001 from elsewhere in MEBBIS bounces back to ook00001, so the
  // two-step is mandatory.
  private pendingPersonnelUpdate: Set<string> = new Set();

  // Tracks accounts where the auto-Ara click has already been fired on
  // ook12001 this update cycle, preventing infinite reload loops when the
  // grid is initially empty and needs the "Aç" filter applied.
  private personnelAutoSearched: Set<string> = new Set();

  // K Belgesi auto-fetch flow: when the user types a TC into K Belgesi that
  // is not in the local student cache, we navigate skt02009 to scrape that
  // student's detail. accountId → expected TC. Cleared on detail-load
  // (either the form is blank → toast "MEBBIS'te bulunamadı" or matches →
  // calls `window.__openKBelgesi(tc)` to re-open the form prefilled).
  private pendingKbFetch: Map<string, string> = new Map();

  // Cached Kurum Bilgisi per account, populated by a fire-and-forget fetch
  // from the backend on the first pushStoreToSidebar call. The sidebar reads
  // this via window.__mebbisStore.kurumInfo to render the "Kurum" modal.
  private kurumInfoCache: Map<string, RemoteKurumInfo> = new Map();
  // Tracks accounts with an in-flight fetch so we don't fire it repeatedly.
  private kurumInfoFetching: Set<string> = new Set();

  // Cars (plates + routes) per account, fetched once per account on first
  // pushStoreToSidebar. The K-Belgesi form reads store.cars to pre-fill
  // güzergah from the matched vehicle's saved route.
  private carsCache: Map<string, RemoteCar[]> = new Map();
  private carsFetching: Set<string> = new Set();

  // Öğrenciler "Güncelle" toplu listele flow: when the user clicks Güncelle
  // in the sidebar Öğrenciler modal we set this flag, navigate to skt02006,
  // and on load show a filter dialog (dönem/durum/grup/şube). Submitting the
  // dialog re-POSTs the form; the resulting list page is parsed by the
  // passive skt02006 branch in the page-load handler.
  private pendingStudentUpdate: Set<string> = new Set();

  // Sequential batch detail scraping state: after the personnel list is
  // ingested from ook12001 we click each row's "Aç" button one at a time,
  // visit ook12002, and scrape full detail fields. This holds the in-flight
  // batch (account-scoped) so navigation handlers can resume after each hop.
  private pendingPersonnelBatchDetail: {
    accountId: string;
    totalRows: number;
    currentIndex: number;
    formState: Record<string, string>;
  } | null = null;

  // Accounts that have completed a full detail batch this session. Cleared
  // when the user requests a fresh Güncelle so the next ook12001 visit
  // re-scrapes everything.
  private personnelBatchDetailDone: Set<string> = new Set();

  // Demo subscription gating: cap tekli at 5 (toplu blocked entirely)
  private static readonly DEMO_PDF_LIMIT = 5;
  private demoSessionUsage: Map<string, number> = new Map();

  setActivityLogger(fn: (accountId: string, pdfType: 'direksiyon_takip' | 'simulator_raporu', count: number) => void) {
    this.activityLogger = fn;
  }

  /**
   * Subscribe to batch start/end transitions. Called with `true` exactly
   * when a çoklu (batch) flow begins, and `false` when it ends (success,
   * cancellation, or error). Used by the bundle to pause the auto-update
   * restart prompt while a long-running batch is in progress.
   */
  setBatchStateListener(fn: (inProgress: boolean) => void) {
    this.batchStateListener = fn;
  }

  isBatchInProgress(): boolean {
    return this.pendingBatchDownload !== null;
  }

  private clearPendingBatchDownload(): void {
    if (this.pendingBatchDownload === null) return;
    this.pendingBatchDownload = null;
    try { this.batchStateListener?.(false); } catch { /* ignore */ }
  }

  private logPdf(account: Account, pdfType: 'direksiyon_takip' | 'simulator_raporu', count = 1) {
    try {
      this.activityLogger?.(account.id, pdfType, count);
    } catch { /* fire-and-forget */ }
    if (this.isDemoAccount(account)) {
      const cur = this.demoSessionUsage.get(account.id) ?? 0;
      this.demoSessionUsage.set(account.id, cur + count);
    }
  }

  private isDemoAccount(account: Account): boolean {
    return account.subscription?.type === 'demo';
  }

  private isDemoLimitReached(account: Account): boolean {
    if (!this.isDemoAccount(account)) return false;
    const baseline = account.subscription?.pdfPrintUsed ?? 0;
    const session = this.demoSessionUsage.get(account.id) ?? 0;
    return baseline + session >= MebbisManager.DEMO_PDF_LIMIT;
  }

  private async showDemoSingleBlocked(win: BrowserWindow) {
    if (win.isDestroyed()) return;
    const limit = MebbisManager.DEMO_PDF_LIMIT;
    await win.webContents.executeJavaScript(`
      (function() {
        const overlay = document.getElementById('mebbis-modal-overlay');
        if (!overlay) return;
        const buttons = overlay.querySelectorAll('button');
        const submit = buttons[buttons.length - 1];
        if (submit) { submit.disabled = false; submit.textContent = 'İndir'; submit.style.opacity = '1'; }
        let err = overlay.querySelector('.mebbis-demo-error');
        if (!err) {
          err = document.createElement('div');
          err.className = 'mebbis-demo-error';
          err.style.cssText = 'color: #ff6b6b; font-size: 13px; margin: 12px 0 0 0; text-align: center; padding: 10px; border: 1px solid #ff6b6b; border-radius: 4px; background: rgba(255,107,107,0.1);';
          const modal = overlay.firstElementChild;
          if (modal) modal.appendChild(err);
        }
        err.textContent = 'Demo limitiniz dolmuştur (${limit}/${limit}). Lütfen satın alın.';
      })();
    `).catch(() => {});
  }

  private async showDemoBatchBlocked(win: BrowserWindow) {
    if (win.isDestroyed()) return;
    await win.webContents.executeJavaScript(`
      (function() {
        const overlay = document.getElementById('mebbis-batch-overlay');
        if (!overlay) return;
        const startBtn = document.getElementById('batch-start-btn');
        if (startBtn) { startBtn.disabled = false; startBtn.textContent = 'Başlat'; startBtn.style.opacity = '1'; }
        overlay.querySelectorAll('button').forEach(b => { b.disabled = false; });
        const progress = document.getElementById('batch-progress');
        if (progress) progress.style.display = 'none';
        let err = overlay.querySelector('.mebbis-demo-error');
        if (!err) {
          err = document.createElement('div');
          err.className = 'mebbis-demo-error';
          err.style.cssText = 'color: #ff6b6b; font-size: 13px; margin: 12px 0 0 0; text-align: center; padding: 10px; border: 1px solid #ff6b6b; border-radius: 4px; background: rgba(255,107,107,0.1);';
          const modal = overlay.firstElementChild;
          if (modal) modal.appendChild(err);
        }
        err.textContent = 'Bu özellik demoda aktif değil.';
      })();
    `).catch(() => {});
  }

  start(account: Account, parentWindow: BrowserWindow) {
    console.log(`\n========== STARTING ACCOUNT: ${account.label} ==========`);

    const existing = this.running.get(account.id);
    if (existing && !existing.window.isDestroyed()) {
      console.log(`[${account.label}] Already running, focusing window...`);
      existing.window.focus();
      return;
    }

    const partition = `persist:mebbis-${account.id}`;
    console.log(`[${account.label}] Using partition: ${partition}`);

    const win = new BrowserWindow({
      width: 1280,
      height: 900,
      title: `MEBBIS - ${account.label}`,
      icon: undefined,
      webPreferences: {
        partition,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        devTools: true,
      },
      show: false,
    });

    // Hide menu bar
    win.removeMenu();

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    win.webContents.setUserAgent(userAgent);
    console.log(`[${account.label}] User agent set`);

    this.running.set(account.id, { account, window: win });
    console.log(`[${account.label}] Window registered`);

    win.on('closed', () => {
      console.log(`[${account.label}] Window closed`);
      const interval = this.autoRefreshIntervals.get(account.id);
      if (interval) {
        clearInterval(interval);
        this.autoRefreshIntervals.delete(account.id);
        console.log(`[${account.label}] Auto-refresh cleared on close`);
      }
      const ses = session.fromPartition(partition);
      ses.cookies.flushStore().then(() => {
        console.log(`[${account.label}] Cookies flushed on close`);
      }).catch(() => {});
      this.running.delete(account.id);
      if (parentWindow && !parentWindow.isDestroyed()) {
        parentWindow.webContents.send('account:stopped', account.id);
      }
    });

    win.webContents.on('did-start-navigation', (_event, url) => {
      console.log(`[${account.label}] NAVIGATION: ${url}`);
    });

    win.webContents.on('did-redirect-navigation', (_event, url) => {
      console.log(`[${account.label}] REDIRECT: ${url}`);
    });

    // Check existing cookies in this partition
    const ses = session.fromPartition(partition);

    // Capture all main-frame MEBBIS requests (incl. ASP.NET postbacks) so
    // recordResponse() can pair them with the response HTML.
    getRequestLogger().attach(ses);

    // Convert session cookies to persistent cookies.
    // MEBBIS sets session cookies (no expiry) which Electron deletes on window close.
    // We intercept and re-set them with a 30-day expiration so they survive restarts.
    ses.cookies.on('changed', (_event, cookie, _cause, removed) => {
      if (removed) return;
      if (!cookie.expirationDate) {
        const thirtyDaysFromNow = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
        const cookieDetails: Electron.CookiesSetDetails = {
          url: `https://${(cookie.domain || '').replace(/^\./, '')}${cookie.path}`,
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite as 'unspecified' | 'no_restriction' | 'lax' | 'strict',
          expirationDate: thirtyDaysFromNow,
        };
        ses.cookies.set(cookieDetails).then(() => {
          console.log(`[${account.label}] Made cookie persistent: ${cookie.name}`);
        }).catch(() => {});
      }
    });

    ses.cookies.get({ domain: '.meb.gov.tr' }).then(cookies => {
      console.log(`[${account.label}] COOKIES ON DISK: ${cookies.length} cookies found`);
      cookies.forEach(c => {
        console.log(`[${account.label}]   Cookie: ${c.name} = ${c.value.substring(0, 20)}... (domain: ${c.domain}, expires: ${c.expirationDate || 'session'})`);
      });
    }).catch(e => console.error(`[${account.label}] Cookie check error:`, e));

    // Listen for download TC trigger from injected modal
    win.webContents.on('console-message', (_event, _level, message) => {
      if (message.startsWith('MEBBIS_DOWNLOAD_TC:')) {
        const payload = message.replace('MEBBIS_DOWNLOAD_TC:', '').trim();
        const [tc, sinif] = payload.split('|||');
        if (this.isDemoLimitReached(account)) {
          console.log(`[${account.label}] Demo limit reached, blocking tekli direksiyon for TC: ${tc}`);
          this.showDemoSingleBlocked(win);
          return;
        }
        console.log(`[${account.label}] Download triggered for TC: ${tc}, sinif: ${sinif}`);
        this.downloadDireksiyonTakip(tc, partition, account, win, sinif);
      }
      if (message.startsWith('MEBBIS_SIMULATION_REPORT:')) {
        const payload = message.replace('MEBBIS_SIMULATION_REPORT:', '').trim();
        const [tc, simType] = payload.split('|||');
        if (this.isDemoLimitReached(account)) {
          console.log(`[${account.label}] Demo limit reached, blocking tekli simulasyon for TC: ${tc}`);
          this.showDemoSingleBlocked(win);
          return;
        }
        console.log(`[${account.label}] Simulation report triggered for TC: ${tc}, simType: ${simType || 'sesim'}`);
        this.handleSimulationReport(tc, simType || 'sesim', account, win);
      }
      if (message === 'MEBBIS_BATCH_DIREKSIYON') {
        console.log(`[${account.label}] Batch direksiyon takip triggered`);
        this.handleBatchDireksiyon(account, win);
      }
      if (message === 'MEBBIS_BATCH_SIMULATOR') {
        console.log(`[${account.label}] Batch simulator triggered`);
        this.handleBatchGeneric('simulator', account, win);
      }
      if (message.startsWith('MEBBIS_BATCH_START:')) {
        const payload = message.replace('MEBBIS_BATCH_START:', '').trim();
        try {
          const options = JSON.parse(payload);
          if (this.isDemoAccount(account)) {
            console.log(`[${account.label}] Demo account: blocking toplu start`);
            this.showDemoBatchBlocked(win);
            return;
          }
          console.log(`[${account.label}] Batch start with options:`, options);
          this.handleBatchStart(options, account, win);
        } catch (e) {
          console.error(`[${account.label}] Batch start parse error:`, e);
        }
      }
      if (message.startsWith('MEBBIS_OPEN_STUDENT:')) {
        const tc = message.replace('MEBBIS_OPEN_STUDENT:', '').trim();
        console.log(`[OpenStudent][${account.label}] Sidebar requested open for tc=${tc}`);
        this.openStudent(win, account, tc);
      }
      // K Belgesi auto-fetch: caller typed a TC not in the local cache; navigate
      // skt02009 to scrape it. parseAndLogStudentPage resolves the pending entry
      // once the detail loads (or surfaces a "not found" toast on a blank form).
      if (message.startsWith('MEBBIS_KB_FETCH_STUDENT:')) {
        const tc = message.replace('MEBBIS_KB_FETCH_STUDENT:', '').trim();
        if (!/^\d{11}$/.test(tc)) {
          console.log(`[KbFetch][${account.label}] Invalid TC: ${tc}`);
        } else {
          console.log(`[KbFetch][${account.label}] Fetching student data for TC=${tc}`);
          this.pendingKbFetch.set(account.id, tc);
          this.openStudent(win, account, tc);
        }
      }
      // Öğrenciler toplu Güncelle: navigate (or click into) skt02006 then show
      // the filter dialog. While a batch download is in progress we ignore the
      // request so we don't disturb that flow.
      if (message === 'MEBBIS_REQUEST_STUDENT_UPDATE') {
        console.log(`[StudentUpdate][${account.label}] Güncelle requested`);
        if (this.pendingBatchDownload) {
          console.log(`[StudentUpdate][${account.label}] Batch in progress, ignoring`);
          return;
        }
        this.pendingStudentUpdate.add(account.id);
        const currentURL = win.webContents.getURL().toLowerCase();
        if (currentURL.includes('skt02006')) {
          this.handleStudentUpdateOptions(win, account);
        } else if (currentURL.includes('/skt/')) {
          this.clickMenuItemForSkt02006(win, account);
        } else {
          win.loadURL('https://mebbis.meb.gov.tr/SKT/skt02006.aspx').catch((e) => {
            console.error(`[StudentUpdate][${account.label}] loadURL skt02006 failed:`, e);
            this.pendingStudentUpdate.delete(account.id);
          });
        }
      }
      if (message.startsWith('MEBBIS_STUDENT_UPDATE_START:')) {
        const payload = message.replace('MEBBIS_STUDENT_UPDATE_START:', '').trim();
        try {
          const options = JSON.parse(payload);
          console.log(`[StudentUpdate][${account.label}] Submitting with options:`, options);
          this.submitStudentUpdateForm(win, options);
        } catch (e) {
          console.error(`[StudentUpdate][${account.label}] start parse error:`, e);
        }
      }
      if (message === 'MEBBIS_STUDENT_UPDATE_CANCEL') {
        console.log(`[StudentUpdate][${account.label}] Cancelled by user`);
        this.pendingStudentUpdate.delete(account.id);
      }
      if (message === 'MEBBIS_REQUEST_PERSONNEL_UPDATE') {
        console.log(`[PersonnelUpdate][${account.label}] Güncelle requested`);
        this.pendingPersonnelUpdate.add(account.id);
        // Fresh cycle: clear per-account caches so the parser re-fires its
        // auto-Ara click and the detail batch is re-run from scratch.
        this.personnelAutoSearched.delete(account.id);
        this.personnelBatchDetailDone.delete(account.id);
        this.pendingPersonnelBatchDetail = null;
        const currentURL = win.webContents.getURL();
        if (currentURL.toLowerCase().includes('/skt/')) {
          // Inside MTSK module — a direct OOK navigation bounces back. Click
          // "Modül Çıkış" first so the OOK loadURL on the next page-load sticks.
          console.log(`[PersonnelUpdate][${account.label}] In MTSK module — clicking Modül Çıkış`);
          win.webContents.executeJavaScript(`
            (function() {
              const all = Array.from(document.querySelectorAll('a, td, button, input[type="button"]'));
              for (const el of all) {
                const txt = (el.textContent || el.value || '').trim();
                if (txt === 'Modül Çıkış' || txt === 'Modul Cikis') { el.click(); return true; }
              }
              for (const el of all) {
                const href = el.getAttribute('href') || '';
                const onclick = el.getAttribute('onclick') || '';
                if (href.toLowerCase().includes('main.aspx') || onclick.toLowerCase().includes('main.aspx')) {
                  el.click(); return true;
                }
              }
              console.log('[MEBBIS] Modül Çıkış not found, falling back to direct OOK navigation');
              return false;
            })();
          `).then((clicked: boolean) => {
            if (!clicked) {
              win.loadURL('https://mebbis.meb.gov.tr/Ookgm/ook00001.aspx').catch((e) => {
                console.error(`[PersonnelUpdate][${account.label}] ook00001 fallback failed:`, e);
                this.pendingPersonnelUpdate.delete(account.id);
              });
            }
          }).catch(() => {
            win.loadURL('https://mebbis.meb.gov.tr/Ookgm/ook00001.aspx').catch(() => {});
          });
        } else {
          win.loadURL('https://mebbis.meb.gov.tr/Ookgm/ook00001.aspx').catch((e) => {
            console.error(`[PersonnelUpdate][${account.label}] loadURL ook00001 failed:`, e);
            this.pendingPersonnelUpdate.delete(account.id);
          });
        }
      }
      if (message.startsWith('MEBBIS_K_BELGESI:')) {
        const payload = message.replace('MEBBIS_K_BELGESI:', '').trim();
        try {
          const data = JSON.parse(payload);
          console.log(`[${account.label}] K Belgesi requested for aday: ${data.adayAd} ${data.adaySoyad}`);
          this.generateKBelgesiPdf(data, win);
        } catch (e) {
          console.error(`[${account.label}] K Belgesi parse error:`, e);
        }
      }
      if (message.startsWith('MEBBIS_SAVE_CAR_ROUTE:')) {
        try {
          const { carId, route } = JSON.parse(message.replace('MEBBIS_SAVE_CAR_ROUTE:', '').trim());
          updateCarRoute(carId, route).then(() => {
            // Update the cache so subsequent store pushes carry the new route
            const cars = this.carsCache.get(account.id);
            if (cars) {
              const car = cars.find(c => c.id === carId);
              if (car) car.route = route;
            }
            console.log(`[${account.label}] Car route saved: id=${carId} route="${route}"`);
          });
        } catch (e) {
          console.error(`[${account.label}] MEBBIS_SAVE_CAR_ROUTE parse error:`, e);
        }
      }
      if (message === 'MEBBIS_BATCH_CANCEL') {
        console.log(`[${account.label}] Batch cancelled by user`);
        this.clearPendingBatchDownload();
        this.pendingDownloadPhase = null;
      }
      if (message === 'MEBBIS_DEV_AUTO_REFRESH') {
        const existing = this.autoRefreshIntervals.get(account.id);
        if (existing) {
          clearInterval(existing);
          this.autoRefreshIntervals.delete(account.id);
          console.log(`[${account.label}] Auto-refresh STOPPED`);
        } else {
          const interval = setInterval(() => {
            if (!win.isDestroyed()) {
              console.log(`[${account.label}] Auto-refresh: reloading page...`);
              win.webContents.reload();
            } else {
              clearInterval(interval);
              this.autoRefreshIntervals.delete(account.id);
            }
          }, 30000);
          this.autoRefreshIntervals.set(account.id, interval);
          console.log(`[${account.label}] Auto-refresh STARTED (every 30s)`);
        }
      }
    });

    // Handle F12 to toggle dev tools
    let devToolsOpen = false;
    win.webContents.on('before-input-event', (event, input) => {
      if (input.key.toLowerCase() === 'f12' && input.type === 'keyDown') {
        event.preventDefault();
        if (devToolsOpen) {
          win.webContents.closeDevTools();
          devToolsOpen = false;
          console.log(`[${account.label}] Dev tools closed`);
        } else {
          win.webContents.openDevTools({ mode: 'detach' });
          devToolsOpen = true;
          console.log(`[${account.label}] Dev tools opened`);
        }
      }
    });

    // Show window when ready
    win.once('ready-to-show', () => {
      win.show();
    });

    // Navigate to MEBBIS
    console.log(`[${account.label}] Navigating to SKT page...`);
    this.showStatus(win, 'CHECKING LOGIN...', '#FFA500');
    win.loadURL('https://mebbis.meb.gov.tr/SKT/skt00001.aspx');

    win.webContents.on('did-finish-load', () => {
      const currentURL = win.webContents.getURL();
      console.log(`[${account.label}] PAGE LOADED: ${currentURL}`);

      // Save response HTML to responses folder
      this.saveResponse(win, account, currentURL);

      if (this.isLoginPage(currentURL)) {
        const attempts = this.loginAttempts.get(account.id) || 0;
        if (attempts >= 1) {
          console.log(`[${account.label}] Max login attempts (${attempts}) reached, stopping auto-fill`);
          this.showStatus(win, 'LOGIN FAILED - Max attempts reached', '#FF0000');
          // Reset pending download if login failed during download
          if (this.pendingDownload) {
            this.pendingDownload = null;
            this.pendingDownloadPhase = null;
          }
          if (this.pendingBatchDownload) {
            this.clearPendingBatchDownload();
            this.pendingDownloadPhase = null;
          }
        } else {
          this.loginAttempts.set(account.id, attempts + 1);
          console.log(`[${account.label}] LOGIN PAGE! Auto-filling... (attempt ${attempts + 1})`);
          this.showStatus(win, 'TRYING LOGIN...', '#FF6B6B');
          this.autoFillLogin(win, account);
        }
      } else if (this.pendingOpenStudent.has(account.id) && currentURL.toLowerCase().includes('skt00001')) {
        // Sidebar Detay flow: SKT module loaded, click into skt02009
        const pending = this.pendingOpenStudent.get(account.id)!;
        console.log(`[OpenStudent][${account.label}] skt00001 loaded, clicking skt02009 menu for tc=${pending.tc}`);
        pending.phase = 'skt02009';
        this.injectLeftMenu(win, account);
        this.clickMenuItemForSkt02009(win, account);
      } else if (this.pendingOpenStudent.has(account.id) && currentURL.toLowerCase().includes('skt02009')) {
        // Sidebar Detay flow: skt02009 loaded, fill TC and submit (then clear pending so results land in normal-visit parser)
        const pending = this.pendingOpenStudent.get(account.id)!;
        this.pendingOpenStudent.delete(account.id);
        console.log(`[OpenStudent][${account.label}] skt02009 loaded, filling tc=${pending.tc} and submitting search`);
        this.injectLeftMenu(win, account);
        this.fillTcAndSubmit(win, pending.tc);
      } else if ((this.pendingDownload || this.pendingSimulatorReport) && this.pendingDownloadPhase === 'skt-module' && currentURL.toLowerCase().includes('skt00001')) {
        // Phase 1: SKT module loaded, now click the menu item for skt02009
        console.log(`[${account.label}] SKT module loaded, clicking Aday Durum Görüntüleme...`);
        this.pendingDownloadPhase = this.pendingSimulatorReport ? 'navigate-simulator' : 'navigate';
        this.injectLeftMenu(win, account);
        this.handleSktModuleLoaded(win, account);
      } else if (this.pendingBatchDownload && this.pendingDownloadPhase === 'batch-skt-module' && currentURL.toLowerCase().includes('skt00001')) {
        // Batch: SKT module loaded, now navigate to skt02006
        console.log(`[${account.label}] Batch: SKT module loaded, navigating to skt02006...`);
        this.pendingDownloadPhase = 'batch-skt02006-options';
        this.injectLeftMenu(win, account);
        this.reinjectBatchStatus(win);
        this.clickMenuItemForSkt02006(win, account);
      } else if (currentURL.toLowerCase().includes('skt02006') && this.pendingBatchDownload) {
        // Handle skt02006 page loads for batch direksiyon takip
        if (this.pendingDownloadPhase === 'batch-skt02006-options') {
          console.log(`[${account.label}] Batch: skt02006 loaded, scraping options...`);
          this.injectLeftMenu(win, account);
          this.handleSkt02006Options(win, account);
        } else if (this.pendingDownloadPhase === 'batch-skt02006-results') {
          console.log(`[${account.label}] Batch: skt02006 results loaded, scraping student list...`);
          this.injectLeftMenu(win, account);
          this.reinjectBatchStatus(win);
          this.parseAndIngestStudentList(win, account);
          this.handleSkt02006Results(win, account);
        } else {
          this.hideStatus(win);
          this.injectLeftMenu(win, account);
        }
      } else if (currentURL.toLowerCase().includes('skt02006') && this.pendingStudentUpdate.has(account.id)) {
        // Öğrenciler Güncelle flow: show the filter dialog. The user's submit
        // re-POSTs the form; the resulting list page falls into the passive
        // branch below (parseAndIngestStudentList already pushes to backend).
        this.hideStatus(win);
        this.injectLeftMenu(win, account);
        this.handleStudentUpdateOptions(win, account);
      } else if (currentURL.toLowerCase().includes('skt02006')) {
        // Normal user visit to skt02006 (student list) — passive list scrape
        this.hideStatus(win);
        this.injectLeftMenu(win, account);
        this.parseAndIngestStudentList(win, account);
      } else if (currentURL.toLowerCase().includes('skt04002')) {
        // skt04002 hosts a ddlPersonel dropdown — passive personnel scrape.
        this.hideStatus(win);
        this.injectLeftMenu(win, account);
        this.parseAndIngestPersonnelList(win, account);
      } else if (currentURL.toLowerCase().includes('main.aspx') && this.pendingPersonnelUpdate.has(account.id)) {
        // Modül Çıkış landed us on the portal — chain to OOK home. The next
        // ook00001 page-load reaches the branch below which navigates onward.
        console.log(`[PersonnelUpdate][${account.label}] Main portal loaded after Modül Çıkış, navigating to OOK`);
        this.injectLeftMenu(win, account);
        win.loadURL('https://mebbis.meb.gov.tr/Ookgm/ook00001.aspx').catch((e) => {
          console.error(`[PersonnelUpdate][${account.label}] ook00001 from main failed:`, e);
          this.pendingPersonnelUpdate.delete(account.id);
        });
      } else if (currentURL.toLowerCase().includes('ook00001') && this.pendingPersonnelUpdate.has(account.id)) {
        // Güncelle landed us on OOK home — session is now established.
        // Chain-navigate to ook12001 (Personel Arama) to trigger the scrape.
        console.log(`[PersonnelUpdate][${account.label}] OOK home loaded, navigating to ook12001`);
        // A fresh Güncelle cycle: clear the per-account flags so the parser
        // re-fires its auto-Ara click and the detail batch is re-run.
        this.personnelAutoSearched.delete(account.id);
        this.pendingPersonnelBatchDetail = null;
        this.personnelBatchDetailDone.delete(account.id);
        this.injectLeftMenu(win, account);
        win.loadURL('https://mebbis.meb.gov.tr/Ookgm/ook12001.aspx').catch((e) => {
          console.error(`[PersonnelUpdate][${account.label}] loadURL ook12001 failed:`, e);
          this.pendingPersonnelUpdate.delete(account.id);
        });
      } else if (currentURL.toLowerCase().includes('ook12001')) {
        // ook12001 (Personel Arama) is the canonical personnel inventory in
        // the OOK module. Two paths:
        //   - mid-batch: the previous "Aç" postback bounced back here, so
        //     re-trigger the next row's postback.
        //   - first visit: parse the grid (auto-clicking Ara if empty).
        this.pendingPersonnelUpdate.delete(account.id);
        this.hideStatus(win);
        this.injectLeftMenu(win, account);
        if (this.pendingPersonnelBatchDetail?.accountId === account.id) {
          this.triggerPersonnelAcPostback(win, account, this.pendingPersonnelBatchDetail.currentIndex);
        } else {
          this.parseAndIngestPersonnelListOok(win, account);
        }
      } else if (currentURL.toLowerCase().includes('ook12002')) {
        // Per-personel detail page reached via "Aç" postback from ook12001.
        // Only act when we have an in-flight batch for this account.
        this.hideStatus(win);
        this.injectLeftMenu(win, account);
        if (this.pendingPersonnelBatchDetail?.accountId === account.id) {
          this.scrapePersonnelDetail(win, account);
        }
      } else if (currentURL.toLowerCase().includes('skt02009')) {
        // Handle skt02009 page loads for direksiyon takip download
        if (this.pendingDownload && this.pendingDownloadPhase === 'navigate') {
          // First load: page loaded after menu click, fill TC and search
          this.pendingDownloadPhase = 'search';
          this.injectLeftMenu(win, account);
          this.handleSkt02009Loaded(win, account);
        } else if (this.pendingDownload && this.pendingDownloadPhase === 'search') {
          // Second load: results after form submission
          this.pendingDownloadPhase = null;
          this.injectLeftMenu(win, account);
          this.parseAndLogStudentPage(win, account);
          this.handleSkt02009Results(win, account);
        } else if (this.pendingSimulatorReport && this.pendingDownloadPhase === 'navigate-simulator') {
          // Simulator: page loaded, fill TC and search
          this.pendingDownloadPhase = 'search-simulator';
          this.injectLeftMenu(win, account);
          this.handleSkt02009SimulatorLoaded(win, account);
        } else if (this.pendingSimulatorReport && this.pendingDownloadPhase === 'search-simulator') {
          // Simulator: results loaded, extract simulator sessions and generate PDF
          this.pendingDownloadPhase = null;
          this.injectLeftMenu(win, account);
          this.parseAndLogStudentPage(win, account);
          this.handleSkt02009SimulatorResults(win, account);
        } else if (this.pendingBatchDownload && this.pendingDownloadPhase === 'batch-skt02009-navigate') {
          // Batch: skt02009 loaded for current student, fill TC and search
          console.log(`[${account.label}] Batch: skt02009 loaded, filling TC for student ${this.pendingBatchDownload.currentStudentIndex + 1}/${this.pendingBatchDownload.students.length}...`);
          this.pendingDownloadPhase = 'batch-skt02009-results';
          this.injectLeftMenu(win, account);
          this.reinjectBatchStatus(win);
          this.handleBatchStudentNavigate(win, account);
        } else if (this.pendingBatchDownload && this.pendingDownloadPhase === 'batch-skt02009-results') {
          // Batch: skt02009 results loaded, scrape data and generate PDF
          console.log(`[${account.label}] Batch: skt02009 results loaded, processing student...`);
          this.injectLeftMenu(win, account);
          this.reinjectBatchStatus(win);
          this.parseAndLogStudentPage(win, account);
          this.handleBatchStudentResults(win, account);
        } else {
          // Normal visit to skt02009 (not triggered by download)
          this.hideStatus(win);
          this.injectLeftMenu(win, account);
          this.parseAndLogStudentPage(win, account);
        }
      } else if (this.isPreAuthPage(currentURL)) {
        // Verification redirect (e.g. Redirect.aspx). User must complete 2FA
        // before we inject anything — leave the page untouched.
        console.log(`[${account.label}] Pre-auth verification page, awaiting user`);
      } else {
        // Successfully past login - reset attempts counter
        this.loginAttempts.set(account.id, 0);
        console.log(`[${account.label}] Success! Hiding status`);
        this.hideStatus(win);
        this.injectLeftMenu(win, account);
      }
    });

    win.webContents.on('dom-ready', () => {
      const currentURL = win.webContents.getURL();
      console.log(`[${account.label}] DOM READY: ${currentURL}`);
      if (!this.isPreAuthPage(currentURL)) {
        this.injectLeftMenu(win, account);
      }
      if (this.isLoginPage(currentURL)) {
        const attempts = this.loginAttempts.get(account.id) || 0;
        if (attempts < 1) {
          console.log(`[${account.label}] Login page (dom-ready), auto-filling...`);
          this.showStatus(win, 'TRYING LOGIN...', '#FF6B6B');
          this.autoFillLogin(win, account);
        }
      }
    });

    console.log(`========== STARTED: ${account.label} ==========\n`);
  }

  private async autoFillLogin(win: BrowserWindow, account: Account) {
    if (win.isDestroyed()) return;
    console.log(`[${account.label}] Injecting auto-fill script...`);

    // Hardcoded fallback used when the remote script is not yet cached.
    // Placeholders __USERNAME__ / __PASSWORD__ are substituted by runScriptOrFallback.
    const fallback = `
      (function() {
        console.log('[MEBBIS] Auto-fill script loaded (fallback)');
        function tryFill() {
          const usernameField = document.getElementById('txtKullaniciAd');
          const passwordField = document.getElementById('txtSifre');
          if (usernameField && passwordField) {
            usernameField.value = __USERNAME__;
            passwordField.value = __PASSWORD__;
            usernameField.dispatchEvent(new Event('input', { bubbles: true }));
            usernameField.dispatchEvent(new Event('change', { bubbles: true }));
            passwordField.dispatchEvent(new Event('input', { bubbles: true }));
            passwordField.dispatchEvent(new Event('change', { bubbles: true }));
            setTimeout(() => {
              const submitBtn =
                document.getElementById('btnGiris') ||
                document.getElementById('dogrula') ||
                document.querySelector('button[id*="Giris"]') ||
                document.querySelector('button[id*="giris"]') ||
                document.querySelector('input[type="submit"]') ||
                Array.from(document.querySelectorAll('button')).find(b =>
                  b.textContent.includes('Giriş') || b.textContent.includes('giriş')
                );
              if (submitBtn) { submitBtn.click(); }
              else { const f = usernameField.closest('form'); if (f) f.submit(); }
            }, 300);
            return true;
          }
          return false;
        }
        tryFill();
      })();
    `;

    await getCodeLoader().runScriptOrFallback(win, 'scripts/auto-fill-login.js', fallback, {
      USERNAME: account.username,
      PASSWORD: account.password,
    });
    console.log(`[${account.label}] Auto-fill script executed`);
  }

  private showStatus(win: BrowserWindow, message: string, color: string) {
    const fallback = `
      (function() {
        const message = __MESSAGE__;
        const color = __COLOR__;
        let statusBar = document.getElementById('mebbis-status-bar');
        if (!statusBar) {
          statusBar = document.createElement('div');
          statusBar.id = 'mebbis-status-bar';
          statusBar.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; z-index: 999999; background: ' + color + '; color: white; padding: 12px 20px; font-size: 14px; font-weight: bold; box-shadow: 0 2px 10px rgba(0,0,0,0.3); text-align: center; font-family: Arial, sans-serif;';
          document.body.appendChild(statusBar);
        }
        statusBar.textContent = message;
        statusBar.style.background = color;
      })();
    `;

    void getCodeLoader().runScriptOrFallback(win, 'scripts/show-status.js', fallback, {
      MESSAGE: message,
      COLOR: color,
    });
  }

  private hideStatus(win: BrowserWindow) {
    const fallback = `
      (function() {
        const statusBar = document.getElementById('mebbis-status-bar');
        if (statusBar) statusBar.style.display = 'none';
      })();
    `;

    void getCodeLoader().runScriptOrFallback(win, 'scripts/hide-status.js', fallback);
  }

  /** skt02009 detail scrape — captures full student record. */
  private parseAndLogStudentPage(win: BrowserWindow, account: Account): void {
    if (win.isDestroyed()) return;
    console.log(`[StudentParser][${account.label}] Running detail DOM scrape on skt02009`);
    win.webContents.executeJavaScript(`
      (function() {
        function txt(el) { return (el && el.textContent || '').trim().replace(/\\s+/g, ' '); }
        function num(s) { const n = parseInt(String(s||'').replace(/[^0-9-]/g,''), 10); return isNaN(n) ? undefined : n; }

        const tc = (document.querySelector('#txtTcKimlikNo')?.value || '').trim();

        // dgDonemBilgileri header order:
        // 0:TC | 1:Ad Soyad | 2:Kurum | 3:Dönemi | 4:Grubu | 5:Şubesi | 6:Mevcut Sürücü Belgesi
        // 7:İstenen Sertifika | 8:Kurum Onay | 9:İlçe Onay | 10:Uygulama | 11:Durumu
        // 12:Teorik Hak | 13:Uygulama Hak | 14:E-Sınav Hak | 15:Kayıt Ücreti
        const headerRow = document.querySelector('#dgDonemBilgileri tr:not(.frmListBaslik)');
        let donem = {}, adSoyad = '';
        if (headerRow) {
          const cells = Array.from(headerRow.querySelectorAll('td')).map(txt);
          adSoyad = cells[1] || '';
          donem = {
            kurum: cells[2], donemi: cells[3], grubu: cells[4], subesi: cells[5],
            mevcutBelge: cells[6], istenenSertifika: cells[7],
            kurumOnay: cells[8], ilceOnay: cells[9],
            uygulama: cells[10], durumu: cells[11],
            teorikHak: num(cells[12]), uygulamaHak: num(cells[13]),
            eSinavHak: num(cells[14]), kayitUcreti: num(cells[15]),
          };
        }

        // dgUygulamaNot header order:
        // 0:TC | 1:Dönemi | 2:Ad Soyad | 3:Sınav Kodu | 4:Sınav Tarihi | 5:Araç Plaka
        // 6:Usta Öğretici | 7:Onay Durumu | 8:Sınav Durumu | 9:Sınav Sonucu
        const exams = Array.from(document.querySelectorAll('#dgUygulamaNot tr:not(.frmListBaslik)'))
          .map(tr => Array.from(tr.querySelectorAll('td')).map(txt))
          .filter(c => c.length >= 10)
          .map(c => ({
            donemi: c[1], sinavKodu: c[3], sinavTarihi: c[4], plaka: c[5],
            ustaOgretici: c[6], onayDurumu: c[7], sinavDurumu: c[8], sonuc: c[9],
          }));

        // dgDersProgrami header order:
        // 0:Dönemi | 1:Grup Adı | 2:Grup Başlama Tarihi | 3:Şubesi | 4:Araç Plakası
        // 5:Ders Yeri | 6:Ders Tarihi | 7:Ders Saati | 8:Dersi Veren Personel | 9:Eğitim Türü
        const lessons = Array.from(document.querySelectorAll('#dgDersProgrami tr:not(.frmListBaslik)'))
          .map(tr => Array.from(tr.querySelectorAll('td')).map(txt))
          .filter(c => c.length >= 10)
          .map(c => ({
            donemi: c[0], grupAdi: c[1], grupBaslama: c[2], subesi: c[3],
            plaka: (c[4] || '').replace(/\\s*\\(.*?\\)/g, '').trim(),
            dersYeri: c[5], dersTarihi: c[6], dersSaati: c[7],
            personel: c[8], egitimTuru: c[9],
          }));

        return { tc, adSoyad, donem, exams, lessons };
      })();
    `).then((result: any) => {
      if (!result) {
        console.log(`[StudentParser][${account.label}] No result returned from detail scrape`);
        return;
      }
      const { tc, adSoyad, donem, exams, lessons } = result;
      if (!tc || !adSoyad) {
        console.log(`[StudentParser][${account.label}] skt02009 loaded but no student data (blank form)`);
        // K Belgesi auto-fetch: a blank form means MEBBIS could not find
        // the TC the user typed. Surface a toast and clear the pending flag.
        const expectedTcBlank = this.pendingKbFetch.get(account.id);
        if (expectedTcBlank) {
          this.pendingKbFetch.delete(account.id);
          if (!win.isDestroyed()) {
            const safeTc = expectedTcBlank.replace(/[^0-9]/g, '');
            win.webContents.executeJavaScript(`
              (function() {
                var ov = document.createElement('div');
                ov.style.cssText = 'position:fixed;top:80px;right:20px;z-index:10003;background:#7a1a1a;color:white;padding:12px 20px;border-radius:6px;font-family:Arial,sans-serif;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,0.4);max-width:320px;';
                ov.textContent = "MEBBIS'te bulunamadı: ${safeTc}";
                document.body.appendChild(ov);
                setTimeout(function() { ov.remove(); }, 4500);
              })();
            `).catch(() => {});
          }
        }
        return;
      }
      console.log(`[StudentParser][${account.label}] Detail scraped: tc=${tc}, adSoyad=${adSoyad}, exams=${exams.length}, lessons=${lessons.length}`);
      const db = getStudentDb();
      const r = db.ingestDetail(account.id, {
        tc, adSoyad,
        kurum: donem.kurum, donemi: donem.donemi, grubu: donem.grubu, subesi: donem.subesi,
        mevcutBelge: donem.mevcutBelge, istenenSertifika: donem.istenenSertifika,
        kurumOnay: donem.kurumOnay, ilceOnay: donem.ilceOnay,
        uygulama: donem.uygulama, durumu: donem.durumu,
        teorikHak: donem.teorikHak, uygulamaHak: donem.uygulamaHak,
        eSinavHak: donem.eSinavHak, kayitUcreti: donem.kayitUcreti,
        exams: exams || [], lessons: lessons || [],
      });
      console.log(`[Store][${account.label}] Detail ingested tc=${tc} ${r.studentIsNew ? '(NEW)' : '(UPDATE)'}. New plates for student=${r.newPlatesForStudent.length}, account=${r.newPlatesForAccount.length}. Total students=${db.countStudents(account.id)} (${db.countDetailed(account.id)} with detail)`);
      this.pushStoreToSidebar(win, account);

      // K Belgesi auto-fetch: if this detail load resolves a pending fetch,
      // re-open the K Belgesi form prefilled with the now-cached student.
      const expectedKbTc = this.pendingKbFetch.get(account.id);
      if (expectedKbTc && expectedKbTc === tc) {
        this.pendingKbFetch.delete(account.id);
        setTimeout(() => {
          if (!win.isDestroyed()) {
            const safeTc = tc.replace(/[^0-9]/g, '');
            win.webContents.executeJavaScript(
              `window.__openKBelgesi && window.__openKBelgesi('${safeTc}');`
            ).catch(() => {});
          }
        }, 500);
      }

      // Push to backend (write-through, fire-and-forget)
      pushDetail(account.id, {
        tc, adSoyad,
        kurum: donem.kurum, donem: donem.donemi, grup: donem.grubu, sube: donem.subesi,
        mevcutBelge: donem.mevcutBelge, istenenSertifika: donem.istenenSertifika,
        kurumOnay: donem.kurumOnay, ilceOnay: donem.ilceOnay,
        uygulama: donem.uygulama, durum: donem.durumu,
        teorikHak: donem.teorikHak, uygulamaHak: donem.uygulamaHak,
        esinavHak: donem.eSinavHak, kayitUcreti: donem.kayitUcreti,
        exams: (exams || []).map((e: any) => ({
          donem: e.donemi, sinavKodu: e.sinavKodu, sinavTarihi: e.sinavTarihi,
          plaka: e.plaka, ustaOgretici: e.ustaOgretici,
          onayDurumu: e.onayDurumu, sinavDurumu: e.sinavDurumu, sonuc: e.sonuc,
        })),
        lessons: (lessons || []).map((l: any) => ({
          donem: l.donemi, grupAdi: l.grupAdi, grupBaslama: l.grupBaslama, sube: l.subesi,
          plaka: l.plaka, dersYeri: l.dersYeri, dersTarihi: l.dersTarihi, dersSaati: l.dersSaati,
          personel: l.personel, egitimTuru: l.egitimTuru,
        })),
      });
    }).catch((e: any) => {
      console.error(`[StudentParser][${account.label}] Detail scrape failed:`, e);
    });
  }

  /** skt02006 list scrape — bulk-ingests basic records for many students. */
  private parseAndIngestStudentList(win: BrowserWindow, account: Account): void {
    if (win.isDestroyed()) return;
    console.log(`[ListParser][${account.label}] Running list DOM scrape on skt02006`);
    win.webContents.executeJavaScript(`
      (function() {
        function txt(el) { return (el && el.textContent || '').trim().replace(/\\s+/g, ' '); }
        const table = document.querySelector('table.frmList');
        if (!table) return { rows: [], reason: 'no frmList table' };
        const out = [];
        const rows = table.querySelectorAll('tr');
        for (const tr of rows) {
          if (tr.classList.contains('frmListBaslik')) continue;
          const cells = Array.from(tr.querySelectorAll('td')).map(txt);
          if (cells.length < 4) continue;
          // skt02006 column layout:
          //   0:S.No | 1:Sil(button) | 2:TC | 3:Adı Soyadı | 4:Dönemi
          //   5:Mevcut Belge | 6:İstenen Sertifika | ... | last:Onayla
          const tc = cells[2] || '';
          const adSoyad = cells[3] || '';
          if (!/^[0-9]{11}$/.test(tc)) continue;
          out.push({
            tc, adSoyad,
            donemi: cells[4] || '',
            durumu: cells[cells.length - 1] || '',
            listRowRaw: cells,
          });
        }
        return { rows: out };
      })();
    `).then((result: any) => {
      if (!result || !Array.isArray(result.rows)) {
        console.log(`[ListParser][${account.label}] No rows; reason=${result?.reason || 'unknown'}`);
        return;
      }
      const rows = result.rows as any[];
      if (!rows.length) {
        console.log(`[ListParser][${account.label}] Empty list (filter form likely not yet submitted)`);
        return;
      }
      const db = getStudentDb();
      const r = db.ingestList(account.id, rows);
      console.log(`[ListParser][${account.label}] Ingested ${rows.length} rows: created=${r.created}, updated=${r.updated}. Total students=${db.countStudents(account.id)} (${db.countDetailed(account.id)} with detail)`);
      this.pushStoreToSidebar(win, account);

      // Push to backend
      pushList(account.id, rows.map((row) => ({
        tc: row.tc,
        adSoyad: row.adSoyad,
        donem: row.donemi,
        grup: row.grubu,
        sube: row.subesi,
        durum: row.durumu,
      })));
    }).catch((e: any) => {
      console.error(`[ListParser][${account.label}] List scrape failed:`, e);
    });
  }

  /** skt04002 ddlPersonel scrape — extracts personnel/staff into the local DB. */
  private parseAndIngestPersonnelList(win: BrowserWindow, account: Account): void {
    if (win.isDestroyed()) return;
    console.log(`[PersonnelParser][${account.label}] Scanning ddlPersonel on skt04002`);
    win.webContents.executeJavaScript(`
      (function() {
        const sel = document.getElementById('ddlPersonel');
        if (!sel) return { rows: [], reason: 'no ddlPersonel select' };
        const rows = [];
        const opts = sel.querySelectorAll('option');
        // Each option looks like:
        //   <option value="52897079232">İzin No:6635604  AHMET ERKAN(Aktif)</option>
        // Placeholder option has value "-1" and label "Personel Seçiniz".
        const re = /^\\s*İzin\\s*No\\s*:\\s*(\\S+)\\s+(.+?)\\s*\\(([^)]+)\\)\\s*$/i;
        for (const opt of opts) {
          const tc = (opt.getAttribute('value') || '').trim();
          if (!/^[0-9]{11}$/.test(tc)) continue;
          const label = (opt.textContent || '').replace(/\\s+/g, ' ').trim();
          const m = label.match(re);
          if (m) {
            rows.push({ tc, izinNo: m[1], adSoyad: m[2].trim(), durum: m[3].trim() });
          } else {
            // Fallback: keep raw label as the name so we still capture something.
            rows.push({ tc, adSoyad: label });
          }
        }
        return { rows };
      })();
    `).then((result: any) => {
      if (!result || !Array.isArray(result.rows)) {
        console.log(`[PersonnelParser][${account.label}] No rows; reason=${result?.reason || 'unknown'}`);
        return;
      }
      const rows = result.rows as any[];
      if (!rows.length) {
        console.log(`[PersonnelParser][${account.label}] Empty personnel list`);
        return;
      }
      const db = getPersonnelDb();
      const r = db.ingestList(account.id, rows);
      console.log(`[PersonnelParser][${account.label}] Ingested ${rows.length} personnel: created=${r.created}, updated=${r.updated}. Total=${db.countPersonnel(account.id)}`);
      this.pushStoreToSidebar(win, account);
    }).catch((e: any) => {
      console.error(`[PersonnelParser][${account.label}] Scrape failed:`, e);
    });
  }

  /**
   * ook12001 (Personel Arama) list scrape — canonical personnel inventory in
   * the OOK module. When the grid is initially empty, this method auto-sets
   * the "Durumu = Görevde" filter and clicks Ara so MEBBIS returns one row
   * per ACTIVE personel (otherwise the same TC appears multiple times — one
   * row per past çalışma izni record). After the list is scraped, kicks off
   * a sequential detail-scrape batch over each "Aç" button to fill in
   * ook12002 detail fields.
   */
  private parseAndIngestPersonnelListOok(win: BrowserWindow, account: Account): void {
    if (win.isDestroyed()) return;
    const alreadySearched = this.personnelAutoSearched.has(account.id);
    console.log(`[PersonnelParserOok][${account.label}] Scanning ook12001 personnel list (alreadySearched=${alreadySearched})`);

    win.webContents.executeJavaScript(`
      (function() {
        function txt(el) { return (el && el.textContent || '').trim().replace(/\\s+/g, ' '); }
        const grid = document.getElementById('dgPersonelArama');
        if (!grid) {
          // Grid not rendered yet — pre-select "Görevde" (cmbPersonelDurum=1)
          // so MEBBIS returns one row per ACTIVE teacher, then click Ara.
          // We only auto-search once per cycle to avoid an infinite reload.
          if (!${alreadySearched}) {
            const durumSel = document.getElementById('cmbPersonelDurum');
            if (durumSel) {
              durumSel.value = '1';
              durumSel.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const araBtn = document.getElementById('btnAra');
            if (araBtn) {
              araBtn.click();
              return { rows: [], autoSearchTriggered: true };
            }
          }
          return { rows: [], reason: 'dgPersonelArama not found' };
        }
        const out = [];
        const trs = grid.querySelectorAll('tr');
        for (const tr of trs) {
          if (tr.classList.contains('frmListBaslik')) continue;
          const tds = Array.from(tr.querySelectorAll('td'));
          if (tds.length < 19) continue;
          const cells = tds.map(txt);
          // OOK12001 columns:
          //   0:Aç | 1:İzin No | 2:TC | 3:Adı | 4:Soyadı | 5:Statüsü |
          //   6:Görevi | 7:Branşı | 8:İl | 9:İlçe | 10:Kurum Kodu |
          //   11:Kurum Adı | 12:Görev Başlama Kurum Adı |
          //   13:İzin Baş | 14:İzin Bit | 15:Görevden Ayrılma |
          //   16:Maaş KDS | 17:Ücret KDS | 18:Durumu | 19:Fotoğraf
          const tc = cells[2] || '';
          if (!/^[0-9]{11}$/.test(tc)) continue;
          out.push({
            tc,
            izinNo:            cells[1] || '',
            ad:                cells[3] || '',
            soyad:             cells[4] || '',
            statusu:           cells[5] || '',
            gorevi:            cells[6] || '',
            bransi:            cells[7] || '',
            il:                cells[8] || '',
            ilce:              cells[9] || '',
            kurumKodu:         cells[10] || '',
            kurumAdi:          cells[11] || '',
            kurumAdiBaslangic: cells[12] || '',
            calismaIzniBas:    cells[13] || '',
            calismaIzniBit:    cells[14] || '',
            ayrilmaTarihi:     cells[15] || '',
            maasKds:           cells[16] || '',
            ucretKds:          cells[17] || '',
            durumu:            cells[18] || '',
          });
        }
        return { rows: out };
      })();
    `).then((result: any) => {
      if (result?.autoSearchTriggered) {
        console.log(`[PersonnelParserOok][${account.label}] Auto-clicked btnAra — waiting for results page`);
        this.personnelAutoSearched.add(account.id);
        return;
      }
      if (!result || !Array.isArray(result.rows)) {
        console.log(`[PersonnelParserOok][${account.label}] No rows; reason=${result?.reason || 'unknown'}`);
        return;
      }
      const rows = result.rows as any[];
      this.personnelAutoSearched.delete(account.id);
      if (!rows.length) {
        console.log(`[PersonnelParserOok][${account.label}] Empty personnel list`);
        return;
      }
      const db = getPersonnelDb();
      const r = db.ingestList(account.id, rows);
      console.log(`[PersonnelParserOok][${account.label}] Ingested ${rows.length} OOK personnel: created=${r.created}, updated=${r.updated}. Total=${db.countPersonnel(account.id)}`);
      this.pushStoreToSidebar(win, account);
      pushPersonnelList(account.id, rows);

      if (this.personnelBatchDetailDone.has(account.id) || this.pendingPersonnelBatchDetail) return;

      // Kick off the detail batch: capture the ook12001 form's hidden fields
      // (VIEWSTATE et al.) so subsequent rows can re-POST back to ook12001.
      win.webContents.executeJavaScript(`
        (function() {
          var f = document.getElementById('ook12001') || document.forms['ook12001'];
          if (!f) return null;
          var fields = {};
          for (var i = 0; i < f.elements.length; i++) {
            var el = f.elements[i];
            if (el.type === 'hidden') fields[el.name] = el.value;
          }
          return fields;
        })()
      `).then((formState: Record<string, string> | null) => {
        if (!formState || typeof formState !== 'object') {
          console.log(`[PersonnelBatch][${account.label}] Could not capture form state — skipping detail batch`);
          return;
        }
        const totalRows = rows.length;
        console.log(`[PersonnelBatch][${account.label}] Starting detail scrape batch for ${totalRows} records`);
        this.pendingPersonnelBatchDetail = {
          accountId: account.id,
          totalRows,
          currentIndex: 0,
          formState,
        };
        this.triggerPersonnelAcPostback(win, account, 0);
      }).catch((e: any) => {
        console.error(`[PersonnelBatch][${account.label}] Form state capture failed:`, e);
      });
    }).catch((e: any) => {
      console.error(`[PersonnelParserOok][${account.label}] Scrape failed:`, e);
    });
  }

  /**
   * Trigger the ASP.NET postback for the Nth row of the dgPersonelArama grid.
   * Row 0 fires `__doPostBack` directly because we are still on the ook12001
   * results page. Subsequent rows have already navigated to ook12002, so we
   * synthesise a form POST back to ook12001 using the VIEWSTATE captured from
   * the original results page (`pendingPersonnelBatchDetail.formState`).
   */
  private triggerPersonnelAcPostback(win: BrowserWindow, account: Account, index: number): void {
    if (win.isDestroyed()) return;
    const batch = this.pendingPersonnelBatchDetail;
    if (!batch || batch.accountId !== account.id) return;

    console.log(`[PersonnelBatch][${account.label}] Triggering Aç postback row ${index + 1}/${batch.totalRows}`);

    if (index === 0) {
      win.webContents.executeJavaScript(`
        (function() {
          try {
            if (typeof __doPostBack === 'function') {
              __doPostBack('dgPersonelArama', 'Select$0');
              return true;
            }
            var f = document.getElementById('ook12001') || document.forms['ook12001'];
            if (f && f.elements['__EVENTTARGET'] && f.elements['__EVENTARGUMENT']) {
              f.elements['__EVENTTARGET'].value = 'dgPersonelArama';
              f.elements['__EVENTARGUMENT'].value = 'Select$0';
              f.submit();
              return true;
            }
            return false;
          } catch (e) {
            console.log('[MEBBIS] PersonnelBatch postback 0 error: ' + e);
            return false;
          }
        })()
      `).then((ok: boolean) => {
        if (!ok) {
          console.log(`[PersonnelBatch][${account.label}] Postback row 0 failed — aborting batch`);
          this.pendingPersonnelBatchDetail = null;
        }
      }).catch((e: any) => {
        console.error(`[PersonnelBatch][${account.label}] Postback row 0 JS error:`, e);
        this.pendingPersonnelBatchDetail = null;
      });
      return;
    }

    const formStateJson = JSON.stringify(batch.formState).replace(/<\/script/gi, '<\\/script');
    win.webContents.executeJavaScript(`
      (function() {
        try {
          var fields = ${formStateJson};
          fields['__EVENTTARGET'] = 'dgPersonelArama';
          fields['__EVENTARGUMENT'] = 'Select$${index}';
          var f = document.createElement('form');
          f.method = 'post';
          f.action = 'https://mebbis.meb.gov.tr/Ookgm/ook12001.aspx';
          for (var k in fields) {
            if (!Object.prototype.hasOwnProperty.call(fields, k)) continue;
            var inp = document.createElement('input');
            inp.type = 'hidden';
            inp.name = k;
            inp.value = fields[k];
            f.appendChild(inp);
          }
          document.body.appendChild(f);
          f.submit();
          return true;
        } catch (e) {
          console.log('[MEBBIS] PersonnelBatch postback error: ' + e);
          return false;
        }
      })()
    `).then((ok: boolean) => {
      if (!ok) {
        console.log(`[PersonnelBatch][${account.label}] Postback row ${index} failed — aborting batch`);
        this.pendingPersonnelBatchDetail = null;
      }
    }).catch((e: any) => {
      console.error(`[PersonnelBatch][${account.label}] Postback row ${index} JS error:`, e);
      this.pendingPersonnelBatchDetail = null;
    });
  }

  /**
   * Scrape detail fields from a loaded ook12002 page (one personel), persist
   * via PersonnelDb.ingestDetail, push the detail to the backend, then advance
   * the batch index. When the batch finishes, mark the account as done so a
   * re-visit to ook12001 in this session does not re-trigger the scrape.
   */
  private scrapePersonnelDetail(win: BrowserWindow, account: Account): void {
    if (win.isDestroyed()) return;
    const batch = this.pendingPersonnelBatchDetail;
    if (!batch || batch.accountId !== account.id) return;

    win.webContents.executeJavaScript(`
      (function() {
        function txt(id) {
          var el = document.getElementById(id);
          return el ? (el.innerText || el.textContent || '').trim() : '';
        }
        function val(id) {
          var el = document.getElementById(id);
          return el ? (el.value || '').trim() : '';
        }
        var progs = [];
        var pRows = document.querySelectorAll('#dgDerseGirecegiProgram tr');
        for (var i = 0; i < pRows.length; i++) {
          if (pRows[i].classList.contains('frmListBaslik')) continue;
          var cells = pRows[i].querySelectorAll('td');
          if (cells.length >= 2) {
            progs.push({
              program: (cells[0].innerText || cells[0].textContent || '').trim(),
              tip:     (cells[1].innerText || cells[1].textContent || '').trim()
            });
          }
        }
        return {
          tc:                            txt('lblTcKimlikNo'),
          ad:                            txt('lblAd'),
          soyad:                         txt('lblSoyad'),
          dogumTarihi:                   txt('lblDogumTarihi'),
          ogrenimBilgisi:                txt('lblOgrenimBilgisi'),
          mezuniyetBelgeCinsi:           txt('lblMezuniyetBelgeCinsi'),
          mezuniyetTarihi:               txt('lblMezuniyetTarihi'),
          mezuniyetBelgeTarihi:          txt('lblMezuniyetBelgeTarihi'),
          mezuniyetBelgeSayisi:          txt('lblMezuniyetBelgeSayisi'),
          mezuniyetAciklama:             txt('lblMezuniyetAciklama'),
          gorevi:                        txt('lblGorevi'),
          statusu:                       txt('lblStatusu'),
          bransi:                        txt('lblBransi'),
          dersUcret:                     txt('lblDersUcret'),
          netBrutUcret:                  txt('lblNetUcretBrutUcret'),
          calismaIzniBas:                txt('lblCalismaIzniBaslamaTarihi'),
          calismaIzniBit:                txt('lblCalismaIzniBitisTarihi'),
          maasKarsiligiDersSayisi:       txt('lblMaasKarsiligiDersSayisi'),
          dersUcretiKarsiligiDersSayisi: txt('lblDersUcretiKarsiligiDersSayisi'),
          durumu:                        txt('lblDurumu'),
          ayrilmaAciklama:               txt('lblAyrilmaAciklama'),
          ePosta:                        val('txtePosta'),
          tel:                           val('txtTel'),
          derseProgramlar:               progs
        };
      })()
    `).then((detail: PersonnelDetailData & { tc?: string }) => {
      if (detail && detail.tc) {
        getPersonnelDb().ingestDetail(account.id, detail.tc, detail);
        console.log(`[PersonnelBatch][${account.label}] Detail scraped: TC=${detail.tc} (${batch.currentIndex + 1}/${batch.totalRows})`);
        pushPersonnelDetail(account.id, { tc: detail.tc, ...detail });
      } else {
        console.log(`[PersonnelBatch][${account.label}] ook12002 at index ${batch.currentIndex}: no TC found, skipping`);
      }
      batch.currentIndex++;
      if (batch.currentIndex < batch.totalRows) {
        this.triggerPersonnelAcPostback(win, account, batch.currentIndex);
      } else {
        console.log(`[PersonnelBatch][${account.label}] Personnel detail batch complete — ${batch.totalRows} records scraped`);
        this.personnelBatchDetailDone.add(account.id);
        this.pendingPersonnelBatchDetail = null;
        this.pushStoreToSidebar(win, account);
      }
    }).catch((e: any) => {
      console.error(`[PersonnelBatch][${account.label}] scrapePersonnelDetail failed at index ${batch.currentIndex}:`, e);
      this.pendingPersonnelBatchDetail = null;
    });
  }

  private serializeStore(account: Account) {
    const students = getStudentDb().serialize(account.id);
    const personnel = getPersonnelDb().serialize(account.id);
    const kurumInfo = this.kurumInfoCache.get(account.id) || null;
    const cars = this.carsCache.get(account.id) || null;
    return { ...students, personnel: personnel.personnel, kurumInfo, cars };
  }

  private pushStoreToSidebar(win: BrowserWindow, account: Account): void {
    if (win.isDestroyed()) return;
    const payload = this.serializeStore(account);
    console.log(`[Sidebar][${account.label}] Pushing store: ${payload.students.length} students, ${payload.plates.length} plates, ${payload.personnel.length} personnel, kurumInfo=${payload.kurumInfo ? 'yes' : 'no'}`);
    const json = JSON.stringify(payload).replace(/<\/script/gi, '<\\/script');
    win.webContents.executeJavaScript(`
      (function() {
        try {
          window.__mebbisStore = ${json};
          if (typeof window.__mebbisRenderStore === 'function') {
            window.__mebbisRenderStore();
            console.log('[MEBBIS_SIDEBAR] Store re-rendered: ' + window.__mebbisStore.students.length + ' students, ' + window.__mebbisStore.plates.length + ' plates, ' + (window.__mebbisStore.personnel || []).length + ' personnel');
          } else {
            console.log('[MEBBIS_SIDEBAR] Store stashed but no renderer yet');
          }
        } catch (e) {
          console.log('[MEBBIS_SIDEBAR] Push failed: ' + e);
        }
      })();
    `).catch((e) => console.error(`[Sidebar][${account.label}] Push failed:`, e));

    // Lazy fire-and-forget kurum info fetch on the first push for this account.
    if (!this.kurumInfoCache.has(account.id) && !this.kurumInfoFetching.has(account.id)) {
      this.kurumInfoFetching.add(account.id);
      fetchKurumInfo()
        .then((info) => {
          this.kurumInfoFetching.delete(account.id);
          if (!info) return;
          this.kurumInfoCache.set(account.id, info);
          if (!win.isDestroyed()) this.pushStoreToSidebar(win, account);
        })
        .catch(() => { this.kurumInfoFetching.delete(account.id); });
    }

    // Lazy fire-and-forget cars fetch on the first push for this account.
    if (!this.carsCache.has(account.id) && !this.carsFetching.has(account.id)) {
      this.carsFetching.add(account.id);
      fetchCars()
        .then((cars) => {
          this.carsFetching.delete(account.id);
          if (!cars) return;
          this.carsCache.set(account.id, cars);
          if (!win.isDestroyed()) this.pushStoreToSidebar(win, account);
        })
        .catch(() => { this.carsFetching.delete(account.id); });
    }
  }

  private openStudent(win: BrowserWindow, account: Account, tc: string): void {
    if (win.isDestroyed()) {
      console.log(`[OpenStudent][${account.label}] Window destroyed, aborting tc=${tc}`);
      return;
    }
    if (!tc || !/^\d{11}$/.test(tc)) {
      console.log(`[OpenStudent][${account.label}] Invalid TC '${tc}', aborting`);
      return;
    }
    if (this.pendingDownload || this.pendingBatchDownload || this.pendingSimulatorReport) {
      console.log(`[OpenStudent][${account.label}] A download/batch is in progress, ignoring open-student tc=${tc}`);
      return;
    }
    console.log(`[OpenStudent][${account.label}] Navigating to skt00001 to open tc=${tc}`);
    this.pendingOpenStudent.set(account.id, { tc, phase: 'skt-module' });
    win.loadURL('https://mebbis.meb.gov.tr/SKT/skt00001.aspx').catch((e) => {
      console.error(`[OpenStudent][${account.label}] loadURL failed:`, e);
      this.pendingOpenStudent.delete(account.id);
    });
  }

  private fillTcAndSubmit(win: BrowserWindow, tc: string): void {
    if (win.isDestroyed()) return;
    win.webContents.executeJavaScript(`
      (function() {
        const tcInput = document.getElementById('txtTcKimlikNo');
        if (!tcInput) {
          console.log('[MEBBIS] fillTcAndSubmit: txtTcKimlikNo not found');
          return;
        }
        tcInput.value = '${tc}';
        tcInput.dispatchEvent(new Event('change', { bubbles: true }));
        tcInput.dispatchEvent(new Event('input', { bubbles: true }));
        setTimeout(() => {
          const btn = document.getElementById('ImageButton1') ||
                      document.querySelector('input[id*="ImageButton"]') ||
                      document.querySelector('input[type="image"]');
          if (btn) {
            console.log('[MEBBIS] fillTcAndSubmit: clicking search button');
            btn.click();
          } else {
            const form = tcInput.closest('form');
            if (form) { console.log('[MEBBIS] fillTcAndSubmit: submitting form'); form.submit(); }
            else { console.log('[MEBBIS] fillTcAndSubmit: no submit target found'); }
          }
        }, 300);
      })();
    `).catch((e) => console.error(`[OpenStudent] fillTcAndSubmit failed:`, e));
  }

  private async injectLeftMenu(win: BrowserWindow, account: Account) {
    if (win.isDestroyed()) return;

    // ─── Hardcoded fallback (used only when remote bundle has not been cached yet) ───
    const fallback = `
      (function() {
        if (document.getElementById('mebbis-left-menu')) return;

        const sidebar = document.createElement('div');
        sidebar.id = 'mebbis-left-menu';
        sidebar.style.cssText = 'position: fixed; left: 0; top: 0; bottom: 0; width: 200px; z-index: 10000; background: #1a1a2e; border-right: 1px solid #2a2a4a; display: flex; flex-direction: column; color: white; font-family: Arial, sans-serif; overflow-y: auto;';

        const title = document.createElement('div');
        title.style.cssText = 'padding: 15px; border-bottom: 1px solid #2a2a4a; font-weight: bold; color: #4361ee;';
        title.textContent = 'Menu';
        sidebar.appendChild(title);

        const items = [
          { label: 'Direksiyon Takip İndir', action: 'direksiyon' },
          { label: 'Çoklu Direksiyon Takip', action: 'coklu-direksiyon' },
          { label: 'Simulasyon Raporu Oluştur', action: 'simulasyon' },
          { label: 'Çoklu Simulasyon Raporu', action: 'coklu-simulasyon' },
        ];

        items.forEach(item => {
          const btn = document.createElement('button');
          btn.style.cssText = 'background: none; border: none; width: 100%; padding: 12px 15px; text-align: left; color: #ccc; cursor: pointer; border-bottom: 1px solid #2a2a4a; font-size: 14px; transition: all 0.2s;';
          btn.textContent = item.label;
          btn.onmouseover = () => {
            btn.style.background = '#2a2a4a';
            btn.style.color = '#4361ee';
          };
          btn.onmouseout = () => {
            btn.style.background = 'none';
            btn.style.color = '#ccc';
          };
          btn.onclick = () => {
            if (item.action === 'simulasyon') {
              // Show simulator report modal with simulator type selection
              let overlay = document.getElementById('mebbis-modal-overlay');
              if (overlay) { overlay.remove(); }

              overlay = document.createElement('div');
              overlay.id = 'mebbis-modal-overlay';
              overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 99999; display: flex; align-items: center; justify-content: center;';

              const modal = document.createElement('div');
              modal.style.cssText = 'background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 8px; padding: 24px; width: 380px; font-family: Arial, sans-serif; color: white;';

              const modalTitle = document.createElement('h3');
              modalTitle.style.cssText = 'margin: 0 0 16px 0; color: #4361ee; font-size: 16px;';
              modalTitle.textContent = 'Simulasyon Raporu İndir';
              modal.appendChild(modalTitle);

              const tcLabel = document.createElement('label');
              tcLabel.style.cssText = 'display: block; margin-bottom: 8px; font-size: 14px; color: #ccc;';
              tcLabel.textContent = 'TC Kimlik No';
              modal.appendChild(tcLabel);

              const tcInput = document.createElement('input');
              tcInput.type = 'text';
              tcInput.maxLength = 11;
              tcInput.placeholder = 'TC Kimlik No';
              tcInput.style.cssText = 'width: 100%; padding: 10px; border: 1px solid #2a2a4a; border-radius: 4px; background: #16213e; color: white; font-size: 14px; box-sizing: border-box; outline: none; margin-bottom: 16px;';
              tcInput.onfocus = () => { tcInput.style.borderColor = '#4361ee'; };
              tcInput.onblur = () => { tcInput.style.borderColor = '#2a2a4a'; };
              modal.appendChild(tcInput);

              const simTypeLabel = document.createElement('label');
              simTypeLabel.style.cssText = 'display: block; margin-bottom: 12px; font-size: 14px; color: #ccc;';
              simTypeLabel.textContent = 'Simülasyon Makinesi';
              modal.appendChild(simTypeLabel);

              const radioContainer = document.createElement('div');
              radioContainer.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;';

              const sesimRadio = document.createElement('label');
              sesimRadio.style.cssText = 'display: flex; align-items: center; cursor: pointer; font-size: 14px; color: #ccc;';
              sesimRadio.innerHTML = '<input type="radio" name="simType" value="sesim" style="margin-right: 8px;"> Sesim (1 rapor)';
              radioContainer.appendChild(sesimRadio);

              const anagrupRadio = document.createElement('label');
              anagrupRadio.style.cssText = 'display: flex; align-items: center; cursor: pointer; font-size: 14px; color: #ccc;';
              anagrupRadio.innerHTML = '<input type="radio" name="simType" value="ana_grup" style="margin-right: 8px;"> Ana Grup (11 rapor)';
              radioContainer.appendChild(anagrupRadio);

              const bothRadio = document.createElement('label');
              bothRadio.style.cssText = 'display: flex; align-items: center; cursor: pointer; font-size: 14px; color: #ccc;';
              bothRadio.innerHTML = '<input type="radio" name="simType" value="both" checked style="margin-right: 8px;"> Her İkisi (12 rapor)';
              radioContainer.appendChild(bothRadio);

              modal.appendChild(radioContainer);

              const btnRow = document.createElement('div');
              btnRow.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;';

              const cancelBtn = document.createElement('button');
              cancelBtn.textContent = 'İptal';
              cancelBtn.style.cssText = 'padding: 8px 16px; border: 1px solid #2a2a4a; border-radius: 4px; background: none; color: #ccc; cursor: pointer; font-size: 14px;';
              cancelBtn.onclick = () => { overlay.remove(); };
              btnRow.appendChild(cancelBtn);

              const submitBtn = document.createElement('button');
              submitBtn.textContent = 'İndir';
              submitBtn.style.cssText = 'padding: 8px 16px; border: none; border-radius: 4px; background: #4361ee; color: white; cursor: pointer; font-size: 14px;';
              submitBtn.onclick = () => {
                const tc = tcInput.value.trim();
                if (tc.length !== 11 || !/^[0-9]+$/.test(tc)) {
                  tcInput.style.borderColor = '#ff4444';
                  return;
                }
                const simType = document.querySelector('input[name="simType"]:checked')?.value || 'sesim';
                console.log('MEBBIS_SIMULATION_REPORT:' + tc + '|||' + simType);
                submitBtn.disabled = true;
                submitBtn.textContent = 'Yükleniyor...';
                submitBtn.style.opacity = '0.6';
              };
              btnRow.appendChild(submitBtn);

              modal.appendChild(btnRow);
              overlay.appendChild(modal);
              overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
              document.body.appendChild(overlay);
              tcInput.focus();
              return;
            }

            if (item.action === 'coklu-direksiyon') {
              console.log('MEBBIS_BATCH_DIREKSIYON');
              return;
            }

            if (item.action === 'coklu-simulasyon') {
              console.log('MEBBIS_BATCH_SIMULATOR');
              return;
            }

            // Show TC modal for Direksiyon Takip
            let overlay = document.getElementById('mebbis-modal-overlay');
            if (overlay) { overlay.remove(); }

            overlay = document.createElement('div');
            overlay.id = 'mebbis-modal-overlay';
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 99999; display: flex; align-items: center; justify-content: center;';

            const modal = document.createElement('div');
            modal.style.cssText = 'background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 8px; padding: 24px; width: 350px; font-family: Arial, sans-serif; color: white;';

            const modalTitle = document.createElement('h3');
            modalTitle.style.cssText = 'margin: 0 0 16px 0; color: #4361ee; font-size: 16px;';
            modalTitle.textContent = 'Direksiyon Takip İndir';
            modal.appendChild(modalTitle);

            const label = document.createElement('label');
            label.style.cssText = 'display: block; margin-bottom: 8px; font-size: 14px; color: #ccc;';
            label.textContent = 'TC Giriniz';
            modal.appendChild(label);

            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 11;
            input.placeholder = 'TC Kimlik No';
            input.style.cssText = 'width: 100%; padding: 10px; border: 1px solid #2a2a4a; border-radius: 4px; background: #16213e; color: white; font-size: 14px; box-sizing: border-box; outline: none;';
            input.onfocus = () => { input.style.borderColor = '#4361ee'; };
            input.onblur = () => { input.style.borderColor = '#2a2a4a'; };
            modal.appendChild(input);

            const sinifLabel = document.createElement('label');
            sinifLabel.style.cssText = 'display: block; margin-top: 12px; margin-bottom: 8px; font-size: 14px; color: #ccc;';
            sinifLabel.textContent = 'Sınıf Seçiniz';
            modal.appendChild(sinifLabel);

            const sinifSelect = document.createElement('select');
            sinifSelect.style.cssText = 'width: 100%; padding: 10px; border: 1px solid #2a2a4a; border-radius: 4px; background: #16213e; color: white; font-size: 14px; box-sizing: border-box; outline: none; cursor: pointer;';
            sinifSelect.onfocus = () => { sinifSelect.style.borderColor = '#4361ee'; };
            sinifSelect.onblur = () => { sinifSelect.style.borderColor = '#2a2a4a'; };
            const sinifOptions = [
              { label: 'Otomatik (ders sayısına göre)', value: '' },
              { label: 'Yeni B (16 ders)', value: '0,B|16' },
              { label: 'Yeni A (14 ders)', value: '0,A|14' },
              { label: 'Yeni A1 (14 ders)', value: '0,A1|14' },
              { label: 'Yeni A2 (14 ders)', value: '0,A2|14' },
              { label: 'Yeni M (14 ders)', value: '0,M|14' },
              { label: 'Yeni B1 (14 ders)', value: '0,B1|14' },
              { label: 'Yeni F (14 ders)', value: '0,F|14' },
              // --- Motosiklet S\u0131n\u0131f\u0131 Ge\u00e7i\u015fleri ---
              { label: 'A1 \u2192 A2 (8 ders)', value: 'A1,A2|8' },
              { label: 'A1-A2 \u2192 A (8 ders)', value: 'A1-A2,A|8' },
              { label: 'M \u2192 A (14 ders)', value: 'M,A|14' },
              { label: 'M-B1 \u2192 A1 (14 ders)', value: 'M-B1,A1|14' },
              { label: 'M-B1 \u2192 A2 (14 ders)', value: 'M-B1,A2|14' },
              { label: 'B-C-D-F-G \u2192 A1 (14 ders)', value: 'B-C-D-F-G,A1|14' },
              { label: 'B-C-D-F-G \u2192 A2 (14 ders)', value: 'B-C-D-F-G,A2|14' },
              { label: 'B-C-D-F-G \u2192 A (14 ders)', value: 'B-C-D-F-G,A|14' },
              { label: 'B1 \u2192 A1-A2-A (14 ders)', value: 'B1,A1-A2-A|14' },
              { label: 'E (17.04.2015 \u00d6ncesi) \u2192 A1 (14 ders)', value: 'E(17.04.2015 \u00d6ncesi),A1|14' },
              { label: 'E (17.04.2015 \u00d6ncesi) \u2192 A2 (14 ders)', value: 'E(17.04.2015 \u00d6ncesi),A2|14' },
              { label: 'E (17.04.2015 \u00d6ncesi) \u2192 A (14 ders)', value: 'E(17.04.2015 \u00d6ncesi),A|14' },

              // --- B / B1 Ge\u00e7i\u015fleri ---
              { label: 'A1-A2-A \u2192 B (16 ders)', value: 'A1-A2-A,B|16' },
              { label: 'A1-A2-A \u2192 B1 (8 ders)', value: 'A1-A2-A,B1|8' },
              { label: 'A1-A2-A (17.04.2015 \u00d6ncesi) \u2192 B1 (8 ders)', value: 'A1-A2-A(17.04.2015 \u00d6ncesi),B1|8' },
              { label: 'F \u2192 B (16 ders)', value: 'F,B|16' },
              { label: 'G \u2192 B (16 ders)', value: 'G,B|16' },
              { label: 'M \u2192 B (16 ders)', value: 'M,B|16' },
              { label: 'M \u2192 B1 (14 ders)', value: 'M,B1|14' },
              { label: 'B1 \u2192 B (14 ders)', value: 'B1,B|14' },
              { label: 'G \u2192 F (14 ders)', value: 'G,F|14' },

              // --- A\u011f\u0131r Vas\u0131ta (C / C1 / D / D1) ---
              { label: 'B \u2192 C (22 ders)', value: 'B,C|22' },
              { label: 'B (17.04.2015 \u00d6ncesi) \u2192 C (16 ders)', value: 'B(17.04.2015 \u00d6ncesi),C|16' },
              { label: 'B \u2192 D (16 ders)', value: 'B,D|16' },
              { label: 'B (17.04.2015 \u00d6ncesi) \u2192 D (9 ders)', value: 'B(17.04.2015 \u00d6ncesi),D|9' },
              { label: 'B \u2192 D1 (9 ders)', value: 'B,D1|9' },
              { label: 'B \u2192 C1 (12 ders)', value: 'B,C1|12' },
              { label: 'B (17.04.2015 \u00d6ncesi) \u2192 C1 (7 ders)', value: 'B(17.04.2015 \u00d6ncesi),C1|7' },
              { label: 'C1 \u2192 C-D (12 ders)', value: 'C1,C-D|12' },
              { label: 'C1-C \u2192 D1 (6 ders)', value: 'C1-C,D1|6' },
              { label: 'C \u2192 D (9 ders)', value: 'C,D|9' },
              { label: 'D \u2192 C (12 ders)', value: 'D,C|12' },
              { label: 'D1 \u2192 C (16 ders)', value: 'D1,C|16' },
              { label: 'D1 \u2192 D (9 ders)', value: 'D1,D|9' },
              { label: 'D1-D \u2192 C1 (7 ders)', value: 'D1-D,C1|7' },

              // --- Otomatik \u2192 Manuel ---
              { label: 'A Otomatik \u2192 A Manuel (9 ders)', value: 'A Otomatik,A Manuel|9' },
              { label: 'B Otomatik \u2192 B Manuel (10 ders)', value: 'B Otomatik,B Manuel|10' },
              { label: 'C Otomatik \u2192 C Manuel (12 ders)', value: 'C Otomatik,C Manuel|12' },
              { label: 'D Otomatik \u2192 D Manuel (9 ders)', value: 'D Otomatik,D Manuel|9' },

              // --- R\u00f6mork (E S\u0131n\u0131flar\u0131) ---
              { label: 'B \u2192 BE (8 ders)', value: 'B,BE|8' },
              { label: 'C \u2192 CE (8 ders)', value: 'C,CE|8' },
              { label: 'D \u2192 DE (8 ders)', value: 'D,DE|8' },
              { label: 'C1 \u2192 C1E (8 ders)', value: 'C1,C1E|8' },
              { label: 'D1 \u2192 D1E (8 ders)', value: 'D1,D1E|8' },
            ];
            sinifOptions.forEach(opt => {
              const option = document.createElement('option');
              option.value = opt.value;
              option.textContent = opt.label;
              option.style.cssText = 'color: white; background-color: #16213e;';
              sinifSelect.appendChild(option);
            });
            modal.appendChild(sinifSelect);

            const btnRow = document.createElement('div');
            btnRow.style.cssText = 'display: flex; gap: 10px; margin-top: 16px; justify-content: flex-end;';

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'İptal';
            cancelBtn.style.cssText = 'padding: 8px 16px; border: 1px solid #2a2a4a; border-radius: 4px; background: none; color: #ccc; cursor: pointer; font-size: 14px;';
            cancelBtn.onclick = () => { overlay.remove(); };
            btnRow.appendChild(cancelBtn);

            const submitBtn = document.createElement('button');
            submitBtn.textContent = 'İndir';
            submitBtn.style.cssText = 'padding: 8px 16px; border: none; border-radius: 4px; background: #4361ee; color: white; cursor: pointer; font-size: 14px;';
            submitBtn.onclick = () => {
              const tc = input.value.trim();
              if (tc.length !== 11 || !/^[0-9]+$/.test(tc)) {
                input.style.borderColor = '#ff4444';
                return;
              }
              console.log('MEBBIS_DOWNLOAD_TC:' + tc + '|||' + sinifSelect.value);
              submitBtn.disabled = true;
              submitBtn.textContent = 'Yükleniyor...';
              submitBtn.style.opacity = '0.6';
            };
            btnRow.appendChild(submitBtn);

            modal.appendChild(btnRow);
            overlay.appendChild(modal);
            overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
            document.body.appendChild(overlay);
            input.focus();
          };
          sidebar.appendChild(btn);
        });

        ${!app.isPackaged ? `
        // Developer menu section
        const devTitle = document.createElement('div');
        devTitle.id = 'mebbis-dev-section-title';
        devTitle.style.cssText = 'padding: 10px 15px; border-top: 2px solid #ff6b35; border-bottom: 1px solid #2a2a4a; font-weight: bold; color: #ff6b35; font-size: 12px; margin-top: auto;';
        devTitle.textContent = '⚙ Developer';
        sidebar.appendChild(devTitle);

        const refreshBtn = document.createElement('button');
        refreshBtn.id = 'dev-auto-refresh-btn';
        refreshBtn.style.cssText = 'background: none; border: none; width: 100%; padding: 12px 15px; text-align: left; color: #ccc; cursor: pointer; border-bottom: 1px solid #2a2a4a; font-size: 13px; transition: all 0.2s;';
        refreshBtn.textContent = '⟳ Auto Refresh (30s)';
        refreshBtn.onmouseover = () => { refreshBtn.style.background = '#2a2a4a'; refreshBtn.style.color = '#ff6b35'; };
        refreshBtn.onmouseout = () => { if (!refreshBtn.dataset.active) { refreshBtn.style.background = 'none'; refreshBtn.style.color = '#ccc'; } };
        refreshBtn.onclick = () => {
          const isActive = refreshBtn.dataset.active === '1';
          if (isActive) {
            refreshBtn.dataset.active = '';
            refreshBtn.textContent = '⟳ Auto Refresh (30s)';
            refreshBtn.style.background = 'none';
            refreshBtn.style.color = '#ccc';
          } else {
            refreshBtn.dataset.active = '1';
            refreshBtn.textContent = '⟳ Auto Refresh (ON)';
            refreshBtn.style.background = '#3a1a0a';
            refreshBtn.style.color = '#ff6b35';
          }
          console.log('MEBBIS_DEV_AUTO_REFRESH');
        };
        sidebar.appendChild(refreshBtn);
        ` : ''}

        if (document.body) {
          document.body.appendChild(sidebar);
          const style = document.createElement('style');
          style.textContent = 'body { margin-left: 200px !important; } main { margin-left: 0 !important; }';
          document.head.appendChild(style);
          console.log('[MEBBIS] Left menu injected');
        }
      })();
    `;

    await getCodeLoader().runScriptOrFallback(win, 'scripts/left-menu.js', fallback);

    // After main menu is injected, attach Öğrenciler & Araçlar sections + renderer.
    await this.injectStoreSidebarSections(win, account);
    // And immediately push current store state.
    this.pushStoreToSidebar(win, account);
  }

  private async injectStoreSidebarSections(win: BrowserWindow, account: Account): Promise<void> {
    if (win.isDestroyed()) return;
    console.log(`[Sidebar][${account.label}] Injecting Öğrenciler & Araçlar sections + renderer`);
    const script = `
      (function() {
        const sidebar = document.getElementById('mebbis-left-menu');
        if (!sidebar) {
          console.log('[MEBBIS_SIDEBAR] No #mebbis-left-menu found, skipping store sections');
          return;
        }
        if (document.getElementById('mebbis-store-container')) {
          console.log('[MEBBIS_SIDEBAR] Store sections already present, skipping');
          return;
        }

        const container = document.createElement('div');
        container.id = 'mebbis-store-container';
        container.style.cssText = 'border-top: 1px solid #2a2a4a; margin-top: 8px;';

        function makeSectionBtn(id, label) {
          const b = document.createElement('button');
          b.id = id;
          b.dataset.label = label;
          b.style.cssText = 'background: none; border: none; color: #4361ee; font-size: 13px; font-weight: bold; padding: 12px 15px; text-align: left; cursor: pointer; width: 100%; border-bottom: 1px solid #2a2a4a; letter-spacing: 0.3px; transition: background 0.15s;';
          b.textContent = label + ' (0)';
          b.onmouseover = () => { b.style.background = '#2a2a4a'; };
          b.onmouseout = () => { b.style.background = 'none'; };
          return b;
        }

        const studentsBtn  = makeSectionBtn('mebbis-students-btn',  'Öğrenciler');
        const carsBtn      = makeSectionBtn('mebbis-cars-btn',      'Araçlar');
        const personnelBtn = makeSectionBtn('mebbis-personnel-btn', 'Personeller');
        // "Kurum" shows kurum bilgileri + programs + vehicles. Renders "Kurum (—)"
        // until the lazy fetch resolves; "(✓)" once cached.
        const kurumBtn = (function() {
          const b = document.createElement('button');
          b.id = 'mebbis-kurum-btn';
          b.dataset.label = 'Kurum';
          b.style.cssText = 'background: none; border: none; color: #4361ee; font-size: 13px; font-weight: bold; padding: 12px 15px; text-align: left; cursor: pointer; width: 100%; border-bottom: 1px solid #2a2a4a; letter-spacing: 0.3px; transition: background 0.15s;';
          b.textContent = 'Kurum (—)';
          b.onmouseover = () => { b.style.background = '#2a2a4a'; };
          b.onmouseout  = () => { b.style.background = 'none'; };
          return b;
        })();
        container.appendChild(kurumBtn);
        container.appendChild(studentsBtn);
        container.appendChild(carsBtn);
        container.appendChild(personnelBtn);
        // Insert above the dev section if present; otherwise append at the end.
        const devAnchor = document.getElementById('mebbis-dev-section-title');
        if (devAnchor) {
          sidebar.insertBefore(container, devAnchor);
        } else {
          sidebar.appendChild(container);
        }
        console.log('[MEBBIS_SIDEBAR] Store section buttons injected');

        let activeModalKeyHandler = null;
        function closeStoreModal() {
          const m = document.getElementById('mebbis-store-modal');
          if (m) m.remove();
          if (activeModalKeyHandler) {
            document.removeEventListener('keydown', activeModalKeyHandler);
            activeModalKeyHandler = null;
          }
        }

        // ─── Table modal with optional live search + header actions ───
        // opts: { kind, title, columns, rows, onRowAction?, headerActions?,
        //         searchKeys?: string[], searchPlaceholder?: string }
        function openTableModal(opts) {
          closeStoreModal();
          const overlay = document.createElement('div');
          overlay.id = 'mebbis-store-modal';
          if (opts.kind) overlay.dataset.kind = opts.kind;
          overlay.style.cssText = 'position: fixed; left: 200px; top: 0; right: 0; bottom: 0; z-index: 10001; background: #16213e; color: white; font-family: Arial, sans-serif; display: flex; flex-direction: column;';

          const modal = document.createElement('div');
          modal.style.cssText = 'flex: 1; display: flex; flex-direction: column; padding: 20px; min-height: 0;';

          const header = document.createElement('div');
          header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #2a2a4a; flex-shrink: 0; gap: 12px;';
          const titleEl = document.createElement('h3');
          titleEl.style.cssText = 'margin: 0; color: #4361ee; font-size: 18px; flex: 1; min-width: 0;';
          titleEl.textContent = opts.title;
          const rightSide = document.createElement('div');
          rightSide.style.cssText = 'display: flex; align-items: center; gap: 8px;';
          if (Array.isArray(opts.headerActions)) {
            opts.headerActions.forEach(action => {
              const ab = document.createElement('button');
              ab.style.cssText = 'background: #4361ee; border: none; color: white; cursor: pointer; padding: 6px 14px; font-size: 13px; border-radius: 4px; font-weight: 500;';
              ab.textContent = action.label;
              ab.onclick = () => action.onClick(ab);
              rightSide.appendChild(ab);
            });
          }
          const closeBtn = document.createElement('button');
          closeBtn.textContent = '✕';
          closeBtn.style.cssText = 'background: none; border: none; color: #ccc; cursor: pointer; font-size: 18px; padding: 0 8px; line-height: 1;';
          closeBtn.onclick = closeStoreModal;
          rightSide.appendChild(closeBtn);
          header.appendChild(titleEl);
          header.appendChild(rightSide);
          modal.appendChild(header);

          // Optional live search bar — present when opts.searchKeys is a non-empty array.
          let searchInput = null;
          if (Array.isArray(opts.searchKeys) && opts.searchKeys.length) {
            const searchWrap = document.createElement('div');
            searchWrap.style.cssText = 'margin-bottom: 10px; flex-shrink: 0;';
            searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = opts.searchPlaceholder || 'Ara...';
            searchInput.style.cssText = 'width: 100%; padding: 9px 12px; border: 1px solid #2a2a4a; border-radius: 4px; background: #1a1a2e; color: white; font-size: 14px; box-sizing: border-box; outline: none;';
            searchInput.onfocus = () => { searchInput.style.borderColor = '#4361ee'; };
            searchInput.onblur = () => { searchInput.style.borderColor = '#2a2a4a'; };
            searchWrap.appendChild(searchInput);
            modal.appendChild(searchWrap);
          }

          const tableWrap = document.createElement('div');
          tableWrap.style.cssText = 'overflow: auto; flex: 1;';
          const table = document.createElement('table');
          table.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 13px;';
          const thead = document.createElement('thead');
          const trh = document.createElement('tr');
          opts.columns.forEach(col => {
            const th = document.createElement('th');
            th.style.cssText = 'text-align: left; padding: 8px 12px; border-bottom: 2px solid #2a2a4a; color: #4361ee; font-weight: 600; position: sticky; top: 0; background: #16213e;';
            th.textContent = col.label;
            trh.appendChild(th);
          });
          thead.appendChild(trh);
          table.appendChild(thead);
          const tbody = document.createElement('tbody');

          // Render the given rows into tbody. Used both for the initial draw
          // and to re-render after a search filter applies.
          function renderRows(rows) {
            tbody.innerHTML = '';
            if (!rows.length) {
              const tr = document.createElement('tr');
              const td = document.createElement('td');
              td.colSpan = opts.columns.length;
              td.style.cssText = 'padding: 20px; text-align: center; color: #888; font-style: italic;';
              td.textContent = '— eşleşme yok —';
              tr.appendChild(td);
              tbody.appendChild(tr);
              return;
            }
            rows.forEach(row => {
              const tr = document.createElement('tr');
              tr.style.cssText = 'border-bottom: 1px solid #20203a;';
              opts.columns.forEach(col => {
                const td = document.createElement('td');
                td.style.cssText = 'padding: 8px 12px; color: #ddd;';
                if (col.action && opts.onRowAction) {
                  const btn = document.createElement('button');
                  btn.style.cssText = 'background: #2a2a4a; border: none; color: #4361ee; cursor: pointer; padding: 4px 12px; font-size: 12px; border-radius: 3px;';
                  btn.textContent = col.action;
                  btn.onclick = () => opts.onRowAction(row);
                  td.appendChild(btn);
                } else {
                  td.textContent = row[col.key] != null ? String(row[col.key]) : '';
                }
                tr.appendChild(td);
              });
              tbody.appendChild(tr);
            });
          }

          if (!opts.rows.length) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = opts.columns.length;
            td.style.cssText = 'padding: 20px; text-align: center; color: #888; font-style: italic;';
            td.textContent = '— henüz yok —';
            tr.appendChild(td);
            tbody.appendChild(tr);
          } else {
            renderRows(opts.rows);
          }

          if (searchInput) {
            searchInput.oninput = () => {
              const q = searchInput.value.toLocaleLowerCase('tr-TR').trim();
              if (!q) { renderRows(opts.rows); return; }
              const filtered = opts.rows.filter(row => {
                for (let i = 0; i < opts.searchKeys.length; i++) {
                  const v = row[opts.searchKeys[i]];
                  if (v != null && String(v).toLocaleLowerCase('tr-TR').indexOf(q) !== -1) return true;
                }
                return false;
              });
              renderRows(filtered);
            };
          }

          table.appendChild(tbody);
          tableWrap.appendChild(table);
          modal.appendChild(tableWrap);

          overlay.appendChild(modal);
          overlay.onclick = (e) => { if (e.target === overlay) closeStoreModal(); };
          document.body.appendChild(overlay);

          activeModalKeyHandler = (e) => { if (e.key === 'Escape') closeStoreModal(); };
          document.addEventListener('keydown', activeModalKeyHandler);
        }

        function personnelGuncelle(btn) {
          if (btn) { btn.disabled = true; btn.textContent = 'Yükleniyor...'; btn.style.opacity = '0.6'; }
          // Main process handles MTSK→OOK module switch (Modül Çıkış) and
          // ook00001 → ook12001 chain navigation, then runs the detail batch.
          console.log('MEBBIS_REQUEST_PERSONNEL_UPDATE');
        }

        function studentGuncelle(btn) {
          if (btn) { btn.disabled = true; btn.textContent = 'Yükleniyor...'; btn.style.opacity = '0.6'; }
          // Main process navigates to skt02006 (or clicks into it from /skt/)
          // then shows the filter dialog; submit re-POSTs and the list page
          // falls into parseAndIngestStudentList (already pushes to backend).
          console.log('MEBBIS_REQUEST_STUDENT_UPDATE');
        }

        // ─── Personel Detay modal ───
        // Section-by-section overlay. Sections collapse/expand on header click;
        // the first non-empty section is open by default. Empty sections (every
        // field '' or '-') hide entirely so the user only sees data MEBBIS
        // actually returned.
        function showPersonnelDetail(row) {
          var ov = document.createElement('div');
          ov.style.cssText = 'position: fixed; inset: 0; z-index: 10002; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif;';
          var box = document.createElement('div');
          box.style.cssText = 'background: #1a1a2e; border: 1px solid #4361ee; border-radius: 8px; width: 560px; max-width: 90vw; max-height: 85vh; display: flex; flex-direction: column; color: white;';
          var head = document.createElement('div');
          head.style.cssText = 'padding: 16px 20px; border-bottom: 1px solid #2a2a4a; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-shrink: 0;';
          var titleWrap = document.createElement('div');
          titleWrap.style.cssText = 'flex: 1; min-width: 0;';
          var t = document.createElement('div');
          t.style.cssText = 'color: #4361ee; font-size: 16px; font-weight: bold;';
          t.textContent = row.adSoyad || ((row.ad || '') + ' ' + (row.soyad || '')).trim() || 'Personel';
          var sub = document.createElement('div');
          sub.style.cssText = 'color: #888; font-size: 12px; margin-top: 2px;';
          sub.textContent = 'TC ' + (row.tc || '-') + (row.durumu ? ' • ' + row.durumu : '');
          titleWrap.appendChild(t);
          titleWrap.appendChild(sub);
          var closeBtn = document.createElement('button');
          closeBtn.textContent = '✕';
          closeBtn.style.cssText = 'background: none; border: none; color: #ccc; cursor: pointer; font-size: 18px; padding: 0 6px; line-height: 1;';
          closeBtn.onclick = function() { ov.remove(); };
          head.appendChild(titleWrap);
          head.appendChild(closeBtn);
          box.appendChild(head);

          var body = document.createElement('div');
          body.style.cssText = 'padding: 8px 20px 20px; overflow-y: auto; flex: 1;';

          var sections = [
            { title: 'Kimlik',          fields: [
              ['TC Kimlik No', row.tc], ['Ad', row.ad], ['Soyad', row.soyad],
              ['Doğum Tarihi', row.dogumTarihi],
            ]},
            { title: 'Görev',           fields: [
              ['Görevi', row.gorevi], ['Statüsü', row.statusu], ['Branşı', row.bransi],
              ['Ek Branş 1', row.brans2], ['Ek Branş 2', row.brans3], ['Ek Branş 3', row.brans4],
            ]},
            { title: 'Çalışma İzni',    fields: [
              ['İzin No', row.izinNo],
              ['Başlama Tarihi', row.calismaIzniBas], ['Bitiş Tarihi', row.calismaIzniBit],
              ['Durumu', row.durumu], ['Ayrılma Tarihi', row.ayrilmaTarihi],
              ['Ayrılma Açıklama', row.ayrilmaAciklama],
            ]},
            { title: 'Ücret',           fields: [
              ['Ders Ücreti', row.dersUcret], ['Net / Brüt Ücret', row.netBrutUcret],
              ['Maaş KDS', row.maasKds], ['Ücret KDS', row.ucretKds],
              ['Maaş Karşılığı Ders Sayısı', row.maasKarsiligiDersSayisi],
              ['Ders Ücreti Karşılığı Ders Sayısı', row.dersUcretiKarsiligiDersSayisi],
            ]},
            { title: 'Öğrenim',         fields: [
              ['Öğrenim Bilgisi', row.ogrenimBilgisi],
              ['Mezuniyet Belge Cinsi', row.mezuniyetBelgeCinsi],
              ['Mezuniyet Tarihi', row.mezuniyetTarihi],
              ['Mezuniyet Belge Tarihi', row.mezuniyetBelgeTarihi],
              ['Mezuniyet Belge Sayısı', row.mezuniyetBelgeSayisi],
              ['Mezuniyet Açıklama', row.mezuniyetAciklama],
            ]},
            { title: 'Kurum',           fields: [
              ['Kurum Kodu', row.kurumKodu], ['Kurum Adı', row.kurumAdi],
              ['Görev Başlama Kurum Adı', row.kurumAdiBaslangic],
              ['İl', row.il], ['İlçe', row.ilce],
            ]},
            { title: 'İletişim',        fields: [
              ['e-Posta', row.ePosta], ['Telefon', row.tel],
            ]},
          ];

          function hasValue(v) {
            return v !== null && v !== undefined &&
              String(v).trim() !== '' && String(v).trim() !== '-' && String(v).trim() !== '&nbsp;';
          }

          var sectionRendered = 0;
          sections.forEach(function(sec) {
            var visibleFields = sec.fields.filter(function(f) { return hasValue(f[1]); });
            if (!visibleFields.length) return;
            var openByDefault = (sectionRendered === 0);
            sectionRendered++;
            var secEl = document.createElement('div');
            secEl.style.cssText = 'margin-top: 12px; border: 1px solid #2a2a4a; border-radius: 6px; overflow: hidden;';
            var hdr = document.createElement('button');
            hdr.type = 'button';
            hdr.style.cssText = 'width: 100%; text-align: left; background: #20203a; border: none; color: #4361ee; cursor: pointer; padding: 10px 14px; font-size: 13px; font-weight: 600; display: flex; justify-content: space-between; align-items: center;';
            var caret = document.createElement('span');
            caret.style.cssText = 'color: #888; font-size: 12px; transition: transform 0.15s;';
            caret.textContent = '▾';
            var hLbl = document.createElement('span');
            hLbl.textContent = sec.title + '  (' + visibleFields.length + ')';
            hdr.appendChild(hLbl);
            hdr.appendChild(caret);
            var content = document.createElement('div');
            content.style.cssText = 'padding: 10px 14px; background: #16162a; display: ' + (openByDefault ? 'block' : 'none') + ';';
            caret.style.transform = openByDefault ? 'rotate(0deg)' : 'rotate(-90deg)';
            visibleFields.forEach(function(f) {
              var rowEl = document.createElement('div');
              rowEl.style.cssText = 'display: flex; padding: 4px 0; font-size: 13px; line-height: 1.4; gap: 8px;';
              var k = document.createElement('div');
              k.style.cssText = 'color: #888; flex: 0 0 180px;';
              k.textContent = f[0];
              var v = document.createElement('div');
              v.style.cssText = 'color: #ddd; flex: 1; word-break: break-word;';
              v.textContent = String(f[1]).replace(/\\u00a0/g, ' ').trim();
              rowEl.appendChild(k);
              rowEl.appendChild(v);
              content.appendChild(rowEl);
            });
            hdr.onclick = function() {
              var open = content.style.display !== 'none';
              content.style.display = open ? 'none' : 'block';
              caret.style.transform = open ? 'rotate(-90deg)' : 'rotate(0deg)';
            };
            secEl.appendChild(hdr);
            secEl.appendChild(content);
            body.appendChild(secEl);
          });

          // Programs section: table-shaped, rendered separately from the
          // key/value sections above.
          if (Array.isArray(row.derseProgramlar) && row.derseProgramlar.length) {
            var pSec = document.createElement('div');
            pSec.style.cssText = 'margin-top: 12px; border: 1px solid #2a2a4a; border-radius: 6px; overflow: hidden;';
            var pHdr = document.createElement('button');
            pHdr.type = 'button';
            pHdr.style.cssText = 'width: 100%; text-align: left; background: #20203a; border: none; color: #4361ee; cursor: pointer; padding: 10px 14px; font-size: 13px; font-weight: 600; display: flex; justify-content: space-between; align-items: center;';
            var pCaret = document.createElement('span');
            pCaret.style.cssText = 'color: #888; font-size: 12px;';
            pCaret.textContent = '▾';
            var pLbl = document.createElement('span');
            pLbl.textContent = 'Derse Gireceği Programlar  (' + row.derseProgramlar.length + ')';
            pHdr.appendChild(pLbl);
            pHdr.appendChild(pCaret);
            var pContent = document.createElement('div');
            pContent.style.cssText = 'padding: 10px 14px; background: #16162a;';
            row.derseProgramlar.forEach(function(p) {
              var r = document.createElement('div');
              r.style.cssText = 'display: flex; padding: 4px 0; font-size: 13px; gap: 8px;';
              var n = document.createElement('div');
              n.style.cssText = 'color: #ddd; flex: 1;';
              n.textContent = p.program;
              var ty = document.createElement('div');
              ty.style.cssText = 'color: #888; flex: 0 0 100px; text-align: right;';
              ty.textContent = p.tip || '';
              r.appendChild(n); r.appendChild(ty);
              pContent.appendChild(r);
            });
            pHdr.onclick = function() {
              var open = pContent.style.display !== 'none';
              pContent.style.display = open ? 'none' : 'block';
              pCaret.style.transform = open ? 'rotate(-90deg)' : 'rotate(0deg)';
            };
            pSec.appendChild(pHdr);
            pSec.appendChild(pContent);
            body.appendChild(pSec);
          }

          if (!sectionRendered && !(Array.isArray(row.derseProgramlar) && row.derseProgramlar.length)) {
            var empty = document.createElement('div');
            empty.style.cssText = 'padding: 24px; color: #888; font-style: italic; text-align: center;';
            empty.textContent = 'Detay henüz çekilmedi — Güncelle butonu ile yeniden deneyin.';
            body.appendChild(empty);
          }

          box.appendChild(body);
          ov.appendChild(box);
          ov.onclick = function(e) { if (e.target === ov) ov.remove(); };
          document.body.appendChild(ov);
          var keyH = function(e) {
            if (e.key === 'Escape') { ov.remove(); document.removeEventListener('keydown', keyH); }
          };
          document.addEventListener('keydown', keyH);
        }

        function fmtTimestamp(ms) {
          if (!ms || typeof ms !== 'number') return '';
          var d = new Date(ms);
          var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
          return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() +
            ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        }

        // ─── Öğrenci Detay modal ───
        // Cached detail overlay with a Güncelle/Detay Çek button. The button
        // emits MEBBIS_OPEN_STUDENT which navigates skt02009 to (re-)scrape.
        // After parseAndLogStudentPage ingests + pushStoreToSidebar refreshes
        // window.__mebbisStore, the next open of this modal sees fresh data.
        function showStudentDetail(row) {
          var ov = document.createElement('div');
          ov.style.cssText = 'position: fixed; inset: 0; z-index: 10002; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif;';
          var box = document.createElement('div');
          box.style.cssText = 'background: #1a1a2e; border: 1px solid #4361ee; border-radius: 8px; width: 640px; max-width: 92vw; max-height: 88vh; display: flex; flex-direction: column; color: white;';
          var head = document.createElement('div');
          head.style.cssText = 'padding: 14px 18px; border-bottom: 1px solid #2a2a4a; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-shrink: 0;';
          var titleWrap = document.createElement('div');
          titleWrap.style.cssText = 'flex: 1; min-width: 0;';
          var t = document.createElement('div');
          t.style.cssText = 'color: #4361ee; font-size: 16px; font-weight: bold;';
          t.textContent = row.adSoyad || 'Öğrenci';
          var sub = document.createElement('div');
          sub.style.cssText = 'color: #888; font-size: 12px; margin-top: 2px;';
          var subParts = ['TC ' + (row.tc || '-')];
          if (row.donemi) subParts.push(row.donemi);
          if (row.grubu)  subParts.push(row.grubu);
          if (row.durumu) subParts.push(row.durumu);
          sub.textContent = subParts.join(' • ');
          titleWrap.appendChild(t);
          titleWrap.appendChild(sub);

          var rightWrap = document.createElement('div');
          rightWrap.style.cssText = 'display: flex; align-items: center; gap: 10px; flex-shrink: 0;';

          var updateBtn = document.createElement('button');
          updateBtn.type = 'button';
          updateBtn.textContent = row.hasDetail ? 'Güncelle' : 'Detay Çek';
          updateBtn.style.cssText = 'background: #4361ee; border: none; color: white; cursor: pointer; padding: 7px 14px; font-size: 13px; border-radius: 4px; font-weight: 500;';
          updateBtn.onclick = function() {
            updateBtn.disabled = true;
            updateBtn.textContent = 'Yükleniyor...';
            updateBtn.style.opacity = '0.6';
            console.log('[MEBBIS_SIDEBAR] Detay update for tc=' + row.tc);
            console.log('MEBBIS_OPEN_STUDENT:' + row.tc);
            // Close both this overlay and the table modal so the user can
            // see the MEBBIS browser doing the navigation.
            ov.remove();
            closeStoreModal();
          };
          rightWrap.appendChild(updateBtn);

          var sCloseBtn = document.createElement('button');
          sCloseBtn.textContent = '✕';
          sCloseBtn.style.cssText = 'background: none; border: none; color: #ccc; cursor: pointer; font-size: 18px; padding: 0 6px; line-height: 1;';
          sCloseBtn.onclick = function() { ov.remove(); };
          rightWrap.appendChild(sCloseBtn);

          head.appendChild(titleWrap);
          head.appendChild(rightWrap);
          box.appendChild(head);

          // Meta strip: last scrape timestamp (or call-to-action when missing).
          var meta = document.createElement('div');
          meta.style.cssText = 'padding: 8px 18px; background: #16162a; border-bottom: 1px solid #20203a; font-size: 12px; color: #888; flex-shrink: 0;';
          var stamp = fmtTimestamp(row.lastDetailSeenAt);
          meta.textContent = row.hasDetail
            ? ('Son detay güncellemesi: ' + (stamp || '-'))
            : 'Detay henüz çekilmedi — yukarıdaki "Detay Çek" ile başlatın.';
          box.appendChild(meta);

          var body = document.createElement('div');
          body.style.cssText = 'padding: 8px 18px 18px; overflow-y: auto; flex: 1;';

          function makeSection(titleText, openByDefault, badge) {
            var secEl = document.createElement('div');
            secEl.style.cssText = 'margin-top: 12px; border: 1px solid #2a2a4a; border-radius: 6px; overflow: hidden;';
            var hdr = document.createElement('button');
            hdr.type = 'button';
            hdr.style.cssText = 'width: 100%; text-align: left; background: #20203a; border: none; color: #4361ee; cursor: pointer; padding: 10px 14px; font-size: 13px; font-weight: 600; display: flex; justify-content: space-between; align-items: center;';
            var caret = document.createElement('span');
            caret.style.cssText = 'color: #888; font-size: 12px; transition: transform 0.15s;';
            caret.textContent = '▾';
            var hLbl = document.createElement('span');
            hLbl.textContent = titleText + (badge != null ? '  (' + badge + ')' : '');
            hdr.appendChild(hLbl);
            hdr.appendChild(caret);
            var content = document.createElement('div');
            content.style.cssText = 'padding: 10px 14px; background: #16162a; display: ' + (openByDefault ? 'block' : 'none') + ';';
            caret.style.transform = openByDefault ? 'rotate(0deg)' : 'rotate(-90deg)';
            hdr.onclick = function() {
              var open = content.style.display !== 'none';
              content.style.display = open ? 'none' : 'block';
              caret.style.transform = open ? 'rotate(-90deg)' : 'rotate(0deg)';
            };
            secEl.appendChild(hdr);
            secEl.appendChild(content);
            return { el: secEl, body: content };
          }

          function addKV(parent, key, val) {
            var r = document.createElement('div');
            r.style.cssText = 'display: flex; padding: 4px 0; font-size: 13px; line-height: 1.4; gap: 8px;';
            var k = document.createElement('div');
            k.style.cssText = 'color: #888; flex: 0 0 200px;';
            k.textContent = key;
            var v = document.createElement('div');
            v.style.cssText = 'color: #ddd; flex: 1; word-break: break-word;';
            v.textContent = val == null || val === '' ? '-' : String(val);
            r.appendChild(k);
            r.appendChild(v);
            parent.appendChild(r);
          }

          var anyRendered = false;

          // Section: Kayıt Bilgileri (key/value)
          var kayitFields = [
            ['Kurum', row.kurum], ['Dönemi', row.donemi], ['Grubu', row.grubu], ['Şubesi', row.subesi],
            ['Mevcut Sürücü Belgesi', row.mevcutBelge], ['İstenen Sertifika', row.istenenSertifika],
            ['Kurum Onayı', row.kurumOnay], ['İlçe Onayı', row.ilceOnay],
            ['Uygulama', row.uygulama], ['Durumu', row.durumu],
            ['Teorik Hak', row.teorikHak], ['Uygulama Hak', row.uygulamaHak],
            ['E-Sınav Hak', row.eSinavHak], ['Kayıt Ücreti', row.kayitUcreti],
          ].filter(function(f) {
            return f[1] !== null && f[1] !== undefined && String(f[1]).trim() !== '' && String(f[1]).trim() !== '-';
          });
          if (kayitFields.length) {
            var kayit = makeSection('Kayıt Bilgileri', true, kayitFields.length);
            kayitFields.forEach(function(f) { addKV(kayit.body, f[0], f[1]); });
            body.appendChild(kayit.el);
            anyRendered = true;
          }

          // Section: Sınavlar (table)
          var exams = Array.isArray(row.exams) ? row.exams : [];
          if (exams.length) {
            var sinav = makeSection('Sınavlar', false, exams.length);
            var tbl = document.createElement('table');
            tbl.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 12px;';
            var sThead = document.createElement('thead');
            var sTrh = document.createElement('tr');
            ['Dönem','Kod','Tarih','Plaka','Usta Öğretici','Onay','Durum','Sonuç'].forEach(function(h) {
              var th = document.createElement('th');
              th.style.cssText = 'text-align: left; padding: 6px 8px; border-bottom: 1px solid #2a2a4a; color: #4361ee; font-weight: 600;';
              th.textContent = h;
              sTrh.appendChild(th);
            });
            sThead.appendChild(sTrh);
            tbl.appendChild(sThead);
            var sTb = document.createElement('tbody');
            exams.forEach(function(e) {
              var tr = document.createElement('tr');
              tr.style.cssText = 'border-bottom: 1px solid #20203a;';
              [e.donemi, e.sinavKodu, e.sinavTarihi, e.plaka, e.ustaOgretici, e.onayDurumu, e.sinavDurumu, e.sonuc].forEach(function(c) {
                var td = document.createElement('td');
                td.style.cssText = 'padding: 6px 8px; color: #ddd;';
                td.textContent = c == null ? '' : String(c);
                tr.appendChild(td);
              });
              sTb.appendChild(tr);
            });
            tbl.appendChild(sTb);
            sinav.body.appendChild(tbl);
            body.appendChild(sinav.el);
            anyRendered = true;
          }

          // Section: Dersler (table)
          var lessons = Array.isArray(row.lessons) ? row.lessons : [];
          if (lessons.length) {
            var ders = makeSection('Dersler', false, lessons.length);
            var lTbl = document.createElement('table');
            lTbl.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 12px;';
            var lThead = document.createElement('thead');
            var lTrh = document.createElement('tr');
            ['Dönem','Grup','Şube','Plaka','Yer','Tarih','Saat','Personel','Tür'].forEach(function(h) {
              var th = document.createElement('th');
              th.style.cssText = 'text-align: left; padding: 6px 8px; border-bottom: 1px solid #2a2a4a; color: #4361ee; font-weight: 600;';
              th.textContent = h;
              lTrh.appendChild(th);
            });
            lThead.appendChild(lTrh);
            lTbl.appendChild(lThead);
            var lTb = document.createElement('tbody');
            lessons.forEach(function(l) {
              var tr = document.createElement('tr');
              tr.style.cssText = 'border-bottom: 1px solid #20203a;';
              [l.donemi, l.grupAdi, l.subesi, l.plaka, l.dersYeri, l.dersTarihi, l.dersSaati, l.personel, l.egitimTuru].forEach(function(c) {
                var td = document.createElement('td');
                td.style.cssText = 'padding: 6px 8px; color: #ddd;';
                td.textContent = c == null ? '' : String(c);
                tr.appendChild(td);
              });
              lTb.appendChild(tr);
            });
            lTbl.appendChild(lTb);
            ders.body.appendChild(lTbl);
            body.appendChild(ders.el);
            anyRendered = true;
          }

          // Section: Plakalar (chips)
          var plates = Array.isArray(row.plates) ? row.plates : [];
          if (plates.length) {
            var plkSec = makeSection('Plakalar', false, plates.length);
            var chips = document.createElement('div');
            chips.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px;';
            plates.forEach(function(p) {
              var chip = document.createElement('span');
              chip.style.cssText = 'background: #20203a; color: #ddd; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-family: monospace;';
              chip.textContent = p;
              chips.appendChild(chip);
            });
            plkSec.body.appendChild(chips);
            body.appendChild(plkSec.el);
            anyRendered = true;
          }

          if (!anyRendered) {
            var sEmpty = document.createElement('div');
            sEmpty.style.cssText = 'padding: 24px; color: #888; font-style: italic; text-align: center;';
            sEmpty.textContent = row.hasDetail
              ? 'Detay var ama doldurulacak alan bulunamadı.'
              : 'Detay henüz çekilmedi. "Detay Çek" ile başlatın.';
            body.appendChild(sEmpty);
          }

          box.appendChild(body);
          ov.appendChild(box);
          ov.onclick = function(e) { if (e.target === ov) ov.remove(); };
          document.body.appendChild(ov);
          var keyH = function(e) {
            if (e.key === 'Escape') { ov.remove(); document.removeEventListener('keydown', keyH); }
          };
          document.addEventListener('keydown', keyH);
        }

        // ─── Kurum panel ───
        // Renders in the content pane (to the right of the 200px sidebar),
        // matching openTableModal's layout. Reuses #mebbis-store-modal so
        // opening Öğrenciler/Personeller/Araçlar/Kurum swaps content cleanly
        // and closeStoreModal works the same way (✕ button or Escape).
        function showKurumDetail() {
          closeStoreModal();
          var info = (window.__mebbisStore && window.__mebbisStore.kurumInfo) || null;

          var overlay = document.createElement('div');
          overlay.id = 'mebbis-store-modal';
          overlay.dataset.kind = 'kurum';
          overlay.style.cssText = 'position: fixed; left: 200px; top: 0; right: 0; bottom: 0; z-index: 10001; background: #16213e; color: white; font-family: Arial, sans-serif; display: flex; flex-direction: column;';

          var pane = document.createElement('div');
          pane.style.cssText = 'flex: 1; display: flex; flex-direction: column; padding: 20px; min-height: 0;';

          var header = document.createElement('div');
          header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #2a2a4a; flex-shrink: 0; gap: 12px;';
          var titleWrap = document.createElement('div');
          titleWrap.style.cssText = 'flex: 1; min-width: 0;';
          var t = document.createElement('h3');
          t.style.cssText = 'margin: 0; color: #4361ee; font-size: 18px;';
          t.textContent = (info && info.kurum_adi) || 'Kurum Bilgileri';
          var sub = document.createElement('div');
          sub.style.cssText = 'color: #888; font-size: 12px; margin-top: 2px;';
          var subParts = [];
          if (info && info.kurum_kodu)    subParts.push('Kod ' + info.kurum_kodu);
          if (info && info.kurum_telefon) subParts.push(info.kurum_telefon);
          sub.textContent = subParts.join(' • ');
          titleWrap.appendChild(t);
          titleWrap.appendChild(sub);

          var kCloseBtn = document.createElement('button');
          kCloseBtn.textContent = '✕';
          kCloseBtn.style.cssText = 'background: none; border: none; color: #ccc; cursor: pointer; font-size: 18px; padding: 0 8px; line-height: 1;';
          kCloseBtn.onclick = closeStoreModal;
          header.appendChild(titleWrap);
          header.appendChild(kCloseBtn);
          pane.appendChild(header);

          // Meta strip — mirrors the Öğrenci Detay style
          var meta = document.createElement('div');
          meta.style.cssText = 'padding: 8px 0; font-size: 12px; color: #888; flex-shrink: 0;';
          if (info && info.last_scraped_at) {
            meta.textContent = 'Son güncelleme: ' + fmtTimestamp(info.last_scraped_at);
          } else {
            meta.textContent = 'Kurum bilgisi henüz çekilmedi.';
          }
          pane.appendChild(meta);

          var body = document.createElement('div');
          body.style.cssText = 'overflow-y: auto; flex: 1; padding-bottom: 4px;';

          if (!info) {
            var empty = document.createElement('div');
            empty.style.cssText = 'padding: 24px; color: #888; font-style: italic; text-align: center;';
            empty.textContent = 'Henüz kurum bilgisi bulunamadı. MEBBIS\\'te skt01001 sayfasına bir kez girince kayıtlar gelir.';
            body.appendChild(empty);
            pane.appendChild(body);
            overlay.appendChild(pane);
            overlay.onclick = function(e) { if (e.target === overlay) closeStoreModal(); };
            document.body.appendChild(overlay);
            activeModalKeyHandler = function(e) { if (e.key === 'Escape') closeStoreModal(); };
            document.addEventListener('keydown', activeModalKeyHandler);
            return;
          }

          function makeSectionLocal(titleText, openByDefault, badge) {
            var secEl = document.createElement('div');
            secEl.style.cssText = 'margin-top: 12px; border: 1px solid #2a2a4a; border-radius: 6px; overflow: hidden;';
            var hdr = document.createElement('button');
            hdr.type = 'button';
            hdr.style.cssText = 'width: 100%; text-align: left; background: #20203a; border: none; color: #4361ee; cursor: pointer; padding: 10px 14px; font-size: 13px; font-weight: 600; display: flex; justify-content: space-between; align-items: center;';
            var caret = document.createElement('span');
            caret.style.cssText = 'color: #888; font-size: 12px; transition: transform 0.15s;';
            caret.textContent = '▾';
            var hLbl = document.createElement('span');
            hLbl.textContent = titleText + (badge != null ? '  (' + badge + ')' : '');
            hdr.appendChild(hLbl);
            hdr.appendChild(caret);
            var content = document.createElement('div');
            content.style.cssText = 'padding: 10px 14px; background: #16162a; display: ' + (openByDefault ? 'block' : 'none') + ';';
            caret.style.transform = openByDefault ? 'rotate(0deg)' : 'rotate(-90deg)';
            hdr.onclick = function() {
              var open = content.style.display !== 'none';
              content.style.display = open ? 'none' : 'block';
              caret.style.transform = open ? 'rotate(-90deg)' : 'rotate(0deg)';
            };
            secEl.appendChild(hdr);
            secEl.appendChild(content);
            return { el: secEl, body: content };
          }

          function addKVLocal(parent, key, val) {
            var r = document.createElement('div');
            r.style.cssText = 'display: flex; padding: 4px 0; font-size: 13px; line-height: 1.4; gap: 8px;';
            var k = document.createElement('div');
            k.style.cssText = 'color: #888; flex: 0 0 200px;';
            k.textContent = key;
            var v = document.createElement('div');
            v.style.cssText = 'color: #ddd; flex: 1; word-break: break-word;';
            v.textContent = val == null || val === '' ? '-' : String(val);
            r.appendChild(k);
            r.appendChild(v);
            parent.appendChild(r);
          }

          // Section: Bilgiler
          var bilgiler = [
            ['Kurum Adı',      info.kurum_adi],
            ['Kurum Kodu',     info.kurum_kodu],
            ['Telefon',        info.kurum_telefon],
            ['Adres',          info.kurum_adres],
            ['Bina Kontenjan', info.bina_kontenjan],
            ['Açılma Tarihi',  info.acilma_tarihi],
          ].filter(function(f) {
            return f[1] !== null && f[1] !== undefined && String(f[1]).trim() !== '';
          });
          if (bilgiler.length) {
            var bsec = makeSectionLocal('Kurum Bilgileri', true, bilgiler.length);
            bilgiler.forEach(function(f) { addKVLocal(bsec.body, f[0], f[1]); });
            body.appendChild(bsec.el);
          }

          // Section: Programlar (table)
          var progs = Array.isArray(info.programs) ? info.programs : [];
          if (progs.length) {
            var psec = makeSectionLocal('Programlar', false, progs.length);
            var pTbl = document.createElement('table');
            pTbl.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 12px;';
            var pThead = document.createElement('thead');
            var pTrh = document.createElement('tr');
            ['Ehliyet Sınıfı','Ruhsat Tarihi','Kapanma Tarihi','Durum'].forEach(function(h) {
              var th = document.createElement('th');
              th.style.cssText = 'text-align: left; padding: 6px 8px; border-bottom: 1px solid #2a2a4a; color: #4361ee; font-weight: 600;';
              th.textContent = h;
              pTrh.appendChild(th);
            });
            pThead.appendChild(pTrh);
            pTbl.appendChild(pThead);
            var pTb = document.createElement('tbody');
            progs.forEach(function(p) {
              var tr = document.createElement('tr');
              tr.style.cssText = 'border-bottom: 1px solid #20203a;';
              [p.ehliyet_sinifi, p.ruhsat_tarihi, p.kapanma_tarihi, p.durum].forEach(function(c) {
                var td = document.createElement('td');
                td.style.cssText = 'padding: 6px 8px; color: #ddd;';
                td.textContent = c == null ? '' : String(c);
                tr.appendChild(td);
              });
              pTb.appendChild(tr);
            });
            pTbl.appendChild(pTb);
            psec.body.appendChild(pTbl);
            body.appendChild(psec.el);
          }

          // Section: Araçlar (table)
          var vehs = Array.isArray(info.vehicles) ? info.vehicles : [];
          if (vehs.length) {
            var vsec = makeSectionLocal('Araçlar', false, vehs.length);
            var vTbl = document.createElement('table');
            vTbl.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 12px;';
            var vThead = document.createElement('thead');
            var vTrh = document.createElement('tr');
            ['Plaka','Sınıf','Marka','Model','Yıl','Tescil','Giriş','Çıkış','Durum','Onay'].forEach(function(h) {
              var th = document.createElement('th');
              th.style.cssText = 'text-align: left; padding: 6px 8px; border-bottom: 1px solid #2a2a4a; color: #4361ee; font-weight: 600;';
              th.textContent = h;
              vTrh.appendChild(th);
            });
            vThead.appendChild(vTrh);
            vTbl.appendChild(vThead);
            var vTb = document.createElement('tbody');
            vehs.forEach(function(v) {
              var tr = document.createElement('tr');
              tr.style.cssText = 'border-bottom: 1px solid #20203a;';
              [v.plaka, v.ehliyet_sinifi, v.marka, v.model, v.model_yili, v.tescil_tarihi, v.hizmete_giris, v.hizmetten_cikis, v.durum, v.mem_onay].forEach(function(c) {
                var td = document.createElement('td');
                td.style.cssText = 'padding: 6px 8px; color: #ddd;';
                td.textContent = c == null ? '' : String(c);
                tr.appendChild(td);
              });
              vTb.appendChild(tr);
            });
            vTbl.appendChild(vTb);
            vsec.body.appendChild(vTbl);
            body.appendChild(vsec.el);
          }

          pane.appendChild(body);
          overlay.appendChild(pane);
          document.body.appendChild(overlay);
          activeModalKeyHandler = function(e) { if (e.key === 'Escape') closeStoreModal(); };
          document.addEventListener('keydown', activeModalKeyHandler);
        }

        studentsBtn.onclick = () => {
          const store = window.__mebbisStore || { students: [], plates: [] };
          openTableModal({
            kind: 'students',
            title: 'Öğrenciler (' + store.students.length + ')',
            columns: [
              { key: 'tc',      label: 'TC Kimlik' },
              { key: 'adSoyad', label: 'Ad Soyad' },
              { key: 'detay',   label: '', action: 'Detay' },
            ],
            rows: store.students,
            searchKeys: ['tc', 'adSoyad'],
            searchPlaceholder: 'TC veya Ad Soyad ile ara...',
            onRowAction: (row) => { showStudentDetail(row); },
            headerActions: [
              { label: 'Güncelle', onClick: studentGuncelle },
            ],
          });
        };

        carsBtn.onclick = () => {
          const store = window.__mebbisStore || { students: [], plates: [], personnel: [] };
          openTableModal({
            kind: 'cars',
            title: 'Araçlar (' + store.plates.length + ')',
            columns: [{ key: 'plate', label: 'Plaka' }],
            rows: store.plates.map(p => ({ plate: p })),
          });
        };

        kurumBtn.onclick = () => { showKurumDetail(); };

        personnelBtn.onclick = () => {
          const store = window.__mebbisStore || { students: [], plates: [], personnel: [] };
          const rows = (store.personnel || []);
          openTableModal({
            kind: 'personnel',
            title: 'Personeller (' + rows.length + ')',
            columns: [
              { key: 'adSoyad',        label: 'Ad Soyad' },
              { key: 'tc',             label: 'TC' },
              { key: 'gorevi',         label: 'Görevi' },
              { key: 'statusu',        label: 'Statüsü' },
              { key: 'bransi',         label: 'Branş' },
              { key: 'calismaIzniBit', label: 'İzin Bitiş' },
              { key: 'detay',          label: '', action: 'Detay' },
            ],
            rows: rows,
            searchKeys: ['adSoyad', 'tc', 'gorevi', 'bransi'],
            searchPlaceholder: 'Ad Soyad, TC, görev veya branş ile ara...',
            onRowAction: showPersonnelDetail,
            headerActions: [
              { label: 'Güncelle', onClick: personnelGuncelle },
            ],
          });
        };

        window.__mebbisRenderStore = function() {
          const store = window.__mebbisStore || { students: [], plates: [], personnel: [] };
          const sBtn = document.getElementById('mebbis-students-btn');
          const cBtn = document.getElementById('mebbis-cars-btn');
          const pBtn = document.getElementById('mebbis-personnel-btn');
          const kBtn = document.getElementById('mebbis-kurum-btn');
          if (sBtn) sBtn.textContent = 'Öğrenciler (' + store.students.length + ')';
          if (cBtn) cBtn.textContent = 'Araçlar (' + store.plates.length + ')';
          if (pBtn) pBtn.textContent = 'Personeller (' + (store.personnel || []).length + ')';
          if (kBtn) kBtn.textContent = 'Kurum (' + (store.kurumInfo ? '✓' : '—') + ')';
          // Refresh the open modal in place so the new rows appear without flicker.
          const open = document.getElementById('mebbis-store-modal');
          if (open) {
            const kind = open.dataset.kind;
            if      (kind === 'students'  && sBtn) sBtn.click();
            else if (kind === 'cars'      && cBtn) cBtn.click();
            else if (kind === 'personnel' && pBtn) pBtn.click();
          }
          console.log('[MEBBIS_SIDEBAR] Counts updated: ' + store.students.length + ' students, ' + store.plates.length + ' plates, ' + (store.personnel || []).length + ' personnel');
        };

        if (window.__mebbisStore) {
          window.__mebbisRenderStore();
        }
      })();
    `;
    await win.webContents.executeJavaScript(script).catch((e) => {
      console.error(`[Sidebar][${account.label}] Section injection failed:`, e);
    });
  }

  stop(accountId: string) {
    const entry = this.running.get(accountId);
    if (entry && !entry.window.isDestroyed()) {
      const partition = `persist:mebbis-${accountId}`;
      const ses = session.fromPartition(partition);
      ses.cookies.flushStore().then(() => {
        console.log(`[${entry.account.label}] Cookies flushed to disk`);
      }).catch(e => console.error('Flush error:', e));
      entry.window.close();
    }
    this.running.delete(accountId);
    // Reset login attempt counter so a restart after wrong-password doesn't stay locked.
    this.loginAttempts.delete(accountId);
    // Persisted student/plate data is intentionally kept on stop; clear via a separate action if ever needed.
    this.pendingOpenStudent.delete(accountId);
    this.demoSessionUsage.delete(accountId);
  }

  focus(accountId: string) {
    const entry = this.running.get(accountId);
    if (entry && !entry.window.isDestroyed()) {
      entry.window.focus();
    }
  }

  isRunning(accountId: string): boolean {
    const entry = this.running.get(accountId);
    return !!entry && !entry.window.isDestroyed();
  }

  /**
   * Local test mode: opens a window WITHOUT logging into MEBBIS.
   * Shows a static "Local Test Mode" overlay so the operator can exercise
   * PDF generation against cached local data without hitting MEBBIS at all.
   */
  startLocalTest(account: Account, parentWindow: BrowserWindow) {
    console.log(`\n========== STARTING LOCAL TEST: ${account.label} ==========`);

    const existing = this.running.get(account.id);
    if (existing && !existing.window.isDestroyed()) {
      existing.window.focus();
      return;
    }

    const partition = `persist:mebbis-localtest-${account.id}`;
    const win = new BrowserWindow({
      width: 1280,
      height: 900,
      title: `Local Test - ${account.label}`,
      webPreferences: {
        partition,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        devTools: true,
      },
      show: false,
    });
    win.removeMenu();

    this.running.set(account.id, { account, window: win });

    win.on('closed', () => {
      this.running.delete(account.id);
      if (parentWindow && !parentWindow.isDestroyed()) {
        parentWindow.webContents.send('account:stopped', account.id);
      }
    });

    win.once('ready-to-show', () => win.show());

    win.webContents.once('did-finish-load', () => {
      this.injectLeftMenu(win, account).catch((e) => {
        console.error(`[LocalTest][${account.label}] injectLeftMenu failed:`, e);
      });
    });

    const labelSafe = account.label.replace(/[<>&"]/g, '');
    const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Local Test - ${labelSafe}</title>
<style>
  html,body{margin:0;height:100%;background:#0f0f1e;color:#e6e6f0;font-family:Arial,sans-serif;}
  .wrap{height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;text-align:center;padding:0 24px;}
  .badge{background:#4361ee;color:#fff;padding:6px 14px;border-radius:999px;font-size:12px;letter-spacing:2px;font-weight:700;}
  h1{margin:0;font-size:26px;}
  .sub{color:#9aa0bf;font-size:14px;max-width:520px;line-height:1.6;}
  .school{color:#fff;font-weight:600;}
</style></head>
<body>
  <div class="wrap">
    <div class="badge">LOCAL TEST</div>
    <h1>MEBBIS oturumu açılmadı</h1>
    <div class="sub">
      <div class="school">${labelSafe}</div>
      Bu pencere yerel önbellek verisi üzerinde PDF üretimini test etmek içindir.
      MEBBIS'e bağlanılmamıştır; "Güncelle" işlemleri devre dışıdır.
    </div>
  </div>
</body></html>`;
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  }

  private isLoginPage(url: string): boolean {
    const lower = url.toLowerCase();
    // default.aspx is always a login page (with any query params: ?tkn, ?lg1, ?NoSession, etc.)
    if (lower.includes('default.aspx')) return true;
    return false;
  }

  /**
   * True for any pre-authenticated MEBBIS screen where the left menu must NOT
   * be injected:
   *   - default.aspx              → username/password form
   *   - redirect.aspx             → 2FA verification (MEB Ajanda code / e-Devlet bridge)
   * After the user passes the verification screen, MEBBIS lands on an SKT
   * module page and the menu is injected as usual.
   */
  private isPreAuthPage(url: string): boolean {
    const lower = url.toLowerCase();
    return lower.includes('default.aspx') || lower.includes('redirect.aspx');
  }

  private async saveResponse(win: BrowserWindow, account: Account, url: string) {
    try {
      if (win.isDestroyed()) return;
      const html = await win.webContents.executeJavaScript('document.documentElement.outerHTML');
      // Logger writes three artifacts (journal entry + req.json + res.html)
      // and pairs the response with the most recent main-frame request
      // captured via the session's webRequest hook.
      await getRequestLogger().recordResponse(win.webContents, account.label, url, html);
    } catch (e) {
      console.error(`[${account.label}] Failed to save response:`, e);
    }
  }

  private async downloadDireksiyonTakip(tc: string, _partition: string, account: Account, parentWin: BrowserWindow, sinif?: string) {
    console.log(`[${account.label}] Starting direksiyon takip download for TC: ${tc}, sinif: ${sinif}`);

    // Show loading status in modal
    parentWin.webContents.executeJavaScript(`
      (function() {
        let status = document.getElementById('mebbis-modal-status');
        if (!status) {
          const modal = document.querySelector('#mebbis-modal-overlay > div');
          if (modal) {
            status = document.createElement('div');
            status.id = 'mebbis-modal-status';
            status.style.cssText = 'margin-top: 12px; padding: 8px; border-radius: 4px; background: #16213e; color: #4361ee; font-size: 13px; text-align: center;';
            modal.appendChild(status);
          }
        }
        if (status) status.textContent = 'Sayfaya yönlendiriliyor...';
      })();
    `).catch(() => {});

    // Store the TC and sinif so we can use it after navigation.
    // Empty sinif → "Otomatik" mode: generatePdfFromTemplate falls back to
    // the scraped lesson count from skt02009 (same as çoklu/batch flow).
    this.pendingDownload = { tc, sinif: sinif || '', account, parentWin };

    const currentURL = parentWin.webContents.getURL().toLowerCase();

    if (currentURL.includes('skt00001') || currentURL.includes('/skt/')) {
      // Already on an SKT page, can click directly to skt02009
      this.pendingDownloadPhase = 'navigate';
      this.clickMenuItemForSkt02009(parentWin, account);
    } else {
      // On main.aspx or other non-SKT page, first navigate to SKT module
      this.pendingDownloadPhase = 'skt-module';
      const clicked = await parentWin.webContents.executeJavaScript(`
        (function() {
          // Find the "Özel MTSK Modülü" menu item that navigates to /SKT/skt00001.aspx
          const allTds = document.querySelectorAll('td');
          for (const td of allTds) {
            const onclick = td.getAttribute('onclick') || '';
            if (onclick.includes('skt00001')) {
              console.log('[MEBBIS] Found SKT module menu item, clicking...');
              td.click();
              return true;
            }
          }
          // Also try finding tr with onclick
          const allTrs = document.querySelectorAll('tr');
          for (const tr of allTrs) {
            const onclick = tr.getAttribute('onclick') || '';
            if (onclick.includes('skt00001')) {
              console.log('[MEBBIS] Found SKT module menu row, clicking...');
              tr.click();
              return true;
            }
          }
          console.log('[MEBBIS] SKT module menu not found');
          return false;
        })();
      `).catch(() => false);

      if (!clicked) {
        this.pendingDownload = null;
        this.pendingDownloadPhase = null;
        parentWin.webContents.executeJavaScript(`
          (function() {
            const status = document.getElementById('mebbis-modal-status');
            if (status) { status.textContent = 'Hata: SKT menüsü bulunamadı'; status.style.color = '#ff4444'; }
            const submitBtn = document.querySelector('#mebbis-modal-overlay button:last-child');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'İndir'; submitBtn.style.opacity = '1'; }
          })();
        `).catch(() => {});
      }
    }
    // The rest continues in did-finish-load state machine
  }

  private async clickMenuItemForSkt02009(win: BrowserWindow, account: Account) {
    const clicked = await win.webContents.executeJavaScript(`
      (function() {
        // MEBBIS menu items are td elements with onclick containing window.location.href
        const allTds = document.querySelectorAll('td');
        for (const td of allTds) {
          const onclick = td.getAttribute('onclick') || '';
          if (onclick.includes('skt02009')) {
            console.log('[MEBBIS] Found skt02009 menu item, clicking...');
            td.click();
            return true;
          }
        }
        console.log('[MEBBIS] skt02009 menu item not found on this page');
        return false;
      })();
    `).catch(() => false);

    if (!clicked) {
      console.log(`[${account.label}] skt02009 menu not found, aborting`);
      this.pendingDownload = null;
      this.pendingSimulatorReport = null;
      this.pendingDownloadPhase = null;
      win.webContents.executeJavaScript(`
        (function() {
          const status = document.getElementById('mebbis-modal-status');
          if (status) { status.textContent = 'Hata: Aday Durum menüsü bulunamadı'; status.style.color = '#ff4444'; }
          const submitBtn = document.querySelector('#mebbis-modal-overlay button:last-child');
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'İndir'; submitBtn.style.opacity = '1'; }
        })();
      `).catch(() => {});
    }
  }

  private async handleSktModuleLoaded(win: BrowserWindow, account: Account) {
    // SKT module page loaded, now click the skt02009 menu item
    this.clickMenuItemForSkt02009(win, account);
  }

  private pendingDownload: { tc: string; sinif: string; account: Account; parentWin: BrowserWindow } | null = null;
  private pendingDownloadPhase:
    'skt-module' | 'navigate' | 'search' | 'navigate-simulator' | 'search-simulator' |
    'batch-skt-module' | 'batch-navigate-skt02006' | 'batch-skt02006-options' |
    'batch-skt02006-results' | 'batch-skt02009-navigate' | 'batch-skt02009-results' | null = null;

  private pendingBatchDownload: {
    batchType: 'direksiyon' | 'simulator';
    options: { donemi: string; ogrenciDurumu: string; onayDurumu: string; grubu: string; subesi: string; simType?: string };
    donemList: { value: string; label: string }[];
    currentDonemIndex: number;
    statusList: { value: string; label: string }[];
    currentStatusIndex: number;
    students: { tc: string; name: string }[];
    processedTcs: Set<string>;
    currentStudentIndex: number;
    outputDir: string;
    account: Account;
    parentWin: BrowserWindow;
    completed: number;
    failed: number;
    statusMessage: string;
    errors: Map<string, { message: string; samples: string[] }>;
    notFound: number;
  } | null = null;

  private async handleSkt02009Loaded(win: BrowserWindow, account: Account) {
    if (!this.pendingDownload || this.pendingDownload.parentWin !== win) return;
    const { tc, parentWin } = this.pendingDownload;
    console.log(`[${account.label}] skt02009 loaded, filling TC: ${tc}`);

    // Update modal status
    parentWin.webContents.executeJavaScript(`
      (function() {
        const status = document.getElementById('mebbis-modal-status');
        if (status) status.textContent = 'TC giriliyor ve sorgulanıyor...';
      })();
    `).catch(() => {});

    try {
      // Fill TC and click search button
      await win.webContents.executeJavaScript(`
        (function() {
          const tcInput = document.getElementById('txtTcKimlikNo');
          if (tcInput) {
            tcInput.value = '${tc}';
            tcInput.dispatchEvent(new Event('change', { bubbles: true }));
            tcInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            setTimeout(() => {
              const searchBtn = document.getElementById('ImageButton1') || 
                               document.querySelector('input[id*="ImageButton"]') ||
                               document.querySelector('input[type="image"]');
              if (searchBtn) {
                console.log('[MEBBIS] Clicking search button...');
                searchBtn.click();
              } else {
                const form = tcInput.closest('form');
                if (form) form.submit();
              }
            }, 300);
          }
        })();
      `);
      // Results will come in the next did-finish-load → handleSkt02009Results
    } catch (e) {
      console.error(`[${account.label}] TC fill error:`, e);
      this.pendingDownload = null;
      this.pendingDownloadPhase = null;
    }
  }

  private async handleSkt02009Results(win: BrowserWindow, account: Account) {
    if (!this.pendingDownload || this.pendingDownload.parentWin !== win) return;
    const { tc, sinif, parentWin } = this.pendingDownload;
    this.pendingDownload = null;
    console.log(`[${account.label}] skt02009 results loaded, scraping data... sinif: ${sinif}`);

    try {
      // Update modal
      parentWin.webContents.executeJavaScript(`
        (function() {
          const status = document.getElementById('mebbis-modal-status');
          if (status) status.textContent = 'Veriler okunuyor...';
        })();
      `).catch(() => {});

      // Scrape the lesson data from the current page
      const lessonData = await win.webContents.executeJavaScript(`
        (function() {
          // Student info is in dgDonemBilgileri table (not separate labels)
          // Columns: 0=TC, 1=Ad Soyad, 2=Kurum, 3=Dönemi, 4=Grubu, 5=Şubesi, 6=Mevcut, 7=İstenen Sertifika, ...
          const donemTable = document.getElementById('dgDonemBilgileri');
          const studentInfo = {
            'ad-soyad': '',
            'tc-kimlik-no': '${tc}',
            'istenen-sertifika': ''
          };
          
          if (donemTable) {
            const dataRows = donemTable.querySelectorAll('tr:not(.frmListBaslik)');
            if (dataRows.length > 0) {
              // Use LAST row (most recent period), matching PHP: end($adaybilgiler)
              const lastRow = dataRows[dataRows.length - 1];
              const cells = lastRow.querySelectorAll('td');
              if (cells.length >= 8) {
                studentInfo['tc-kimlik-no'] = cells[0].textContent.trim() || '${tc}';
                studentInfo['ad-soyad'] = cells[1].textContent.trim();
                studentInfo['istenen-sertifika'] = cells[7].textContent.trim();
              }
            }
          }
          
          // Lesson data is in dgDersProgrami table
          // Columns: 0=Dönemi, 1=Grup, 2=Başlama, 3=Şubesi, 4=Araç Plakası, 5=Ders Yeri, 6=Ders Tarihi, 7=Ders Saati, 8=Personel, 9=Eğitim Türü
          ${PERIOD_HELPERS_JS}
          const lessonTable = document.getElementById('dgDersProgrami');

          if (!lessonTable) {
            if (!studentInfo['ad-soyad']) {
              return { error: 'Veri bulunamadı - Direksiyon ders programı tablosu yok' };
            }
            return { error: 'Direksiyon ders programı bulunamadı' };
          }

          const lessons = [];
          const rows = lessonTable.querySelectorAll('tr');
          for (const row of rows) {
            if (row.classList.contains('frmListBaslik')) continue;
            const cells = row.querySelectorAll('td');
            if (cells.length < 6) continue;
            const cellTexts = Array.from(cells).map(c => c.textContent.trim());
            // Exclude "Başarısız Aday Eğitimi" rows
            const rowText = cellTexts.join(' ');
            if (rowText.includes('Başarısız Aday')) continue;
            lessons.push(cellTexts);
          }

          // Pick the chronologically newest period (column 0 = Dönemi).
          // MEBBIS row order is unreliable — parse "YYYY - <month>" instead.
          const filteredLessons = _filterByNewest(lessons);

          return { studentInfo, lessons: filteredLessons };
        })();
      `);

      if (lessonData.error) {
        throw new Error(lessonData.error);
      }

      console.log(`[${account.label}] Lesson data received:`, JSON.stringify(lessonData.studentInfo), `${lessonData.lessons.length} lessons`);

      // Update modal status
      parentWin.webContents.executeJavaScript(`
        (function() {
          const status = document.getElementById('mebbis-modal-status');
          if (status) status.textContent = 'PDF oluşturuluyor...';
        })();
      `).catch(() => {});

      // Generate PDF from template
      const pdfBuffer = await this.generatePdfFromTemplate(lessonData.studentInfo, lessonData.lessons, sinif);

      // Show save dialog
      const studentName = (lessonData.studentInfo['ad-soyad'] || 'unknown').replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9]/g, '_');
      const defaultFilename = `direksiyon_${tc}_${studentName}.pdf`;

      const result = await dialog.showSaveDialog(parentWin, {
        title: 'Direksiyon Takip PDF Kaydet',
        defaultPath: defaultFilename,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });

      if (!result.canceled && result.filePath) {
        fs.writeFileSync(result.filePath, pdfBuffer);
        console.log(`[${account.label}] PDF saved to: ${result.filePath}`);
        shell.showItemInFolder(result.filePath);
        this.logPdf(account, 'direksiyon_takip', 1);
      }

      // Close modal
      parentWin.webContents.executeJavaScript(`
        (function() {
          const overlay = document.getElementById('mebbis-modal-overlay');
          if (overlay) overlay.remove();
        })();
      `).catch(() => {});

    } catch (error: any) {
      console.error(`[${account.label}] Download error:`, error);
      const errMsg = error?.message || 'PDF oluşturulamadı';

      // Show alert dialog with error
      dialog.showMessageBox(parentWin, {
        type: 'error',
        title: 'Direksiyon Takip Hatası',
        message: errMsg,
        buttons: ['Tamam'],
        noLink: true,
      }).catch(() => {});

      // Update modal status
      const escapedMsg = errMsg.replace(/'/g, "\\'").replace(/\n/g, ' ');
      parentWin.webContents.executeJavaScript(`
        (function() {
          const status = document.getElementById('mebbis-modal-status');
          if (status) {
            status.textContent = 'Hata: ${escapedMsg}';
            status.style.color = '#ff4444';
          }
          const submitBtn = document.querySelector('#mebbis-modal-overlay button:last-child');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'İndir';
            submitBtn.style.opacity = '1';
          }
        })();
      `).catch(() => {});
    }
  }

  private async handleSkt02009SimulatorLoaded(win: BrowserWindow, account: Account) {
    if (!this.pendingSimulatorReport) return;
    const { tc } = this.pendingSimulatorReport;
    console.log(`[${account.label}] skt02009 loaded for simulator, filling TC: ${tc}`);

    // Update modal status
    const parentWin = this.running.get(account.id)?.window;
    if (parentWin && !parentWin.isDestroyed()) {
      parentWin.webContents.executeJavaScript(`
        (function() {
          const overlay = document.getElementById('mebbis-modal-overlay');
          if (overlay) {
            const submitBtn = overlay.querySelector('button:last-of-type');
            if (submitBtn) submitBtn.textContent = 'TC sorgulanıyor...';
          }
        })();
      `).catch(() => {});
    }

    try {
      await win.webContents.executeJavaScript(`
        (function() {
          const tcInput = document.getElementById('txtTcKimlikNo');
          if (tcInput) {
            tcInput.value = '${tc}';
            tcInput.dispatchEvent(new Event('change', { bubbles: true }));
            tcInput.dispatchEvent(new Event('input', { bubbles: true }));
            setTimeout(() => {
              const searchBtn = document.getElementById('ImageButton1') ||
                               document.querySelector('input[id*="ImageButton"]') ||
                               document.querySelector('input[type="image"]');
              if (searchBtn) {
                searchBtn.click();
              } else {
                const form = tcInput.closest('form');
                if (form) form.submit();
              }
            }, 300);
          }
        })();
      `);
    } catch (e) {
      console.error(`[${account.label}] Simulator TC fill error:`, e);
      this.pendingSimulatorReport = null;
      this.pendingDownloadPhase = null;
    }
  }

  private async handleSkt02009SimulatorResults(win: BrowserWindow, account: Account) {
    if (!this.pendingSimulatorReport) return;
    const { tc, simulationType } = this.pendingSimulatorReport;
    this.pendingSimulatorReport = null;
    console.log(`[${account.label}] skt02009 simulator results loaded, scraping for ${simulationType}...`);

    const parentWin = this.running.get(account.id)?.window;

    try {
      if (parentWin && !parentWin.isDestroyed()) {
        parentWin.webContents.executeJavaScript(`
          (function() {
            const overlay = document.getElementById('mebbis-modal-overlay');
            if (overlay) {
              const submitBtn = overlay.querySelector('button:last-of-type');
              if (submitBtn) submitBtn.textContent = 'Veriler okunuyor...';
            }
          })();
        `).catch(() => {});
      }

      // Scrape student info and lessons (same as direksiyon takip)
      const lessonData = await win.webContents.executeJavaScript(`
        (function() {
          const donemTable = document.getElementById('dgDonemBilgileri');
          const studentInfo = { 'ad-soyad': '', 'tc-kimlik-no': '${tc}', 'istenen-sertifika': '' };
          if (donemTable) {
            const dataRows = donemTable.querySelectorAll('tr:not(.frmListBaslik)');
            if (dataRows.length > 0) {
              // Use LAST row (most recent period), matching PHP: end($adaybilgiler)
              const lastRow = dataRows[dataRows.length - 1];
              const cells = lastRow.querySelectorAll('td');
              if (cells.length >= 8) {
                studentInfo['tc-kimlik-no'] = cells[0].textContent.trim() || '${tc}';
                studentInfo['ad-soyad'] = cells[1].textContent.trim();
                studentInfo['istenen-sertifika'] = cells[7].textContent.trim();
              }
            }
          }
          ${PERIOD_HELPERS_JS}
          const lessonTable = document.getElementById('dgDersProgrami');
          if (!lessonTable) {
            return { error: 'Direksiyon ders programı tablosu bulunamadı' };
          }
          const lessons = [];
          const rows = lessonTable.querySelectorAll('tr');
          for (const row of rows) {
            if (row.classList.contains('frmListBaslik')) continue;
            const cells = row.querySelectorAll('td');
            if (cells.length < 6) continue;
            const cellTexts = Array.from(cells).map(c => c.textContent.trim());
            lessons.push(cellTexts);
          }
          // Pick the chronologically newest period (column 0 = Dönemi).
          const filteredLessons = _filterByNewest(lessons);
          return { studentInfo, lessons: filteredLessons };
        })();
      `);

      if (lessonData.error) {
        throw new Error(lessonData.error);
      }

      // Filter for simulator sessions only
      let simulatorSessions = this.extractSimulatorSessions(lessonData.lessons);
      console.log(`[${account.label}] Found ${simulatorSessions.length} simulator sessions out of ${lessonData.lessons.length} total lessons`);

      if (simulatorSessions.length === 0) {
        throw new Error('Simulatör dersi bulunamadı');
      }

      // Sort by date+time descending and take top 2 (matching PHP: usort + array_slice)
      simulatorSessions.sort((a, b) => {
        // col[6] = date (dd/mm/yyyy), col[7] = time (HH:MM - HH:MM)
        const dateA = (a[6] || '').split('/').reverse().join('-');
        const dateB = (b[6] || '').split('/').reverse().join('-');
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        const timeA = (a[7] || '').split('-')[0].trim();
        const timeB = (b[7] || '').split('-')[0].trim();
        return timeB.localeCompare(timeA);
      });
      simulatorSessions = simulatorSessions.slice(0, 2);

      if (parentWin && !parentWin.isDestroyed()) {
        parentWin.webContents.executeJavaScript(`
          (function() {
            const overlay = document.getElementById('mebbis-modal-overlay');
            if (overlay) {
              const submitBtn = overlay.querySelector('button:last-of-type');
              if (submitBtn) submitBtn.textContent = 'PDF oluşturuluyor...';
            }
          })();
        `).catch(() => {});
      }

      // Generate PDFs (simulator + ek4) into a folder
      const savedDir = await this.generateSimulatorReportPdf(
        lessonData.studentInfo,
        simulatorSessions,
        simulationType,
        account,
        parentWin || win
      );

      console.log(`[${account.label}] Simulator + EK4 PDFs saved to: ${savedDir}`);
      shell.openPath(savedDir);

      // Close modal
      if (parentWin && !parentWin.isDestroyed()) {
        parentWin.webContents.executeJavaScript(`
          (function() {
            const overlay = document.getElementById('mebbis-modal-overlay');
            if (overlay) overlay.remove();
          })();
        `).catch(() => {});
      }

    } catch (error: any) {
      console.error(`[${account.label}] Simulator report error:`, error);
      const errMsg = error?.message || 'Simulatör raporu oluşturulamadı';

      if (parentWin && !parentWin.isDestroyed()) {
        dialog.showMessageBox(parentWin, {
          type: 'error',
          title: 'Simulatör Raporu Hatası',
          message: errMsg,
          buttons: ['Tamam'],
          noLink: true,
        }).catch(() => {});

        const escapedMsg = errMsg.replace(/'/g, "\\'").replace(/\n/g, ' ');
        parentWin.webContents.executeJavaScript(`
          (function() {
            const overlay = document.getElementById('mebbis-modal-overlay');
            if (overlay) {
              const submitBtn = overlay.querySelector('button:last-of-type');
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Oluştur';
                submitBtn.style.opacity = '1';
              }
            }
          })();
        `).catch(() => {});
      }
    }
  }

  private fetchSimulatorTemplate(templateName: string): Promise<string> {
    // EK4 lives under ek4/, everything else under simulator/.
    // The encrypted-templates endpoint validates the path itself.
    const relPath = templateName.startsWith('ek4/')
      ? templateName
      : `simulator/${templateName}`;
    return fetchEncryptedTemplate(relPath);
  }

  private async generatePdfFromHtml(html: string): Promise<Buffer> {
    const pdfWin = new BrowserWindow({
      width: 794,
      height: 1123,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    const pdfBuffer = await pdfWin.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    pdfWin.close();
    return Buffer.from(pdfBuffer);
  }

  async generatePdfFromTemplate(
    studentInfo: { 'ad-soyad': string; 'tc-kimlik-no': string; 'istenen-sertifika': string },
    lessons: string[][],
    sinif?: string
  ): Promise<Buffer> {
    // Parse sinif selection: format is "FROM,TO|COUNT" e.g. "0,B|16"
    let selectedCount: number | null = null;
    let selectedClass: string | null = null;
    if (sinif) {
      const parts = sinif.split('|');
      if (parts.length === 2) {
        selectedCount = parseInt(parts[1], 10);
        const classParts = parts[0].split(',');
        selectedClass = classParts[1] || classParts[0];
      }
    }

    // Use selected count from dropdown, fallback to lesson count
    const lessonCount = selectedCount || lessons.length;
    const hasSimulator = lessons.some(l => {
      const text = l.join(' ');
      return text.includes('Simulatör') || text.includes('Direksiyon Eğitim Alanı');
    });

    // When using simulator-less template, remove simulator rows
    let filteredLessons = [...lessons];

    const supportedCounts = [4, 6, 7, 8, 9, 10, 12, 14, 16, 20, 22];
    let closestCount = 4;
    for (const count of supportedCounts) {
      if (lessonCount <= count) {
        closestCount = count;
        break;
      }
    }
    if (lessonCount > 22) closestCount = 22;

    // Determine template filename
    let templateName = `${closestCount}n.html`;
    if (hasSimulator && [12, 14, 16].includes(closestCount)) {
      templateName = `${closestCount}nsimli.html`;
    } else {
      // Non-simulator template: remove simulator/DEA rows from data
      filteredLessons = filteredLessons.filter(l => {
        const text = l.join(' ');
        return !text.includes('Simulatör') && !text.includes('Direksiyon Eğitim Alanı');
      });
    }

    // Take the LAST N lessons (most recent), not the first N
    if (filteredLessons.length > closestCount) {
      filteredLessons = filteredLessons.slice(-closestCount);
    }

    console.log(`[PDF] Fetching template: ${templateName} for ${lessonCount} lessons`);

    // Fetch template HTML from remote server
    let html: string;
    try {
      html = await this.fetchTemplate(templateName);
    } catch (err: any) {
      throw new Error(`Template indirilemedi: ${templateName} - ${err.message}`);
    }

    // Templates already have Chromium-compatible CSS baked in.
    // No runtime CSS injection needed — update templates on the server instead.

    // Use a hidden BrowserWindow to render and fill the template
    const pdfWin = new BrowserWindow({
      width: 794,
      height: 1123,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // Load the HTML template
    await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // Use selected class from dropdown, fallback to certificate string
    const vClass = selectedClass || (studentInfo['istenen-sertifika'] || 'B').split(' ')[0] || 'B';

    // Fill student info and lesson data via DOM manipulation
    await pdfWin.webContents.executeJavaScript(`
      (function() {
        // Fill student info
        const nameEl = document.querySelector('.name');
        if (nameEl) nameEl.textContent = ${JSON.stringify(studentInfo['ad-soyad'] || '')};

        const tcEl = document.querySelector('.tc');
        if (tcEl) tcEl.textContent = ${JSON.stringify(studentInfo['tc-kimlik-no'] || '')};

        const classEl = document.querySelector('.vClass');
        if (classEl) classEl.textContent = '${vClass}';

        // Fill lesson records
        const dates = document.querySelectorAll('.date');
        const plates = document.querySelectorAll('.plate');
        const trainers = document.querySelectorAll('.mTrainer');
        const lessons = ${JSON.stringify(filteredLessons)};

        dates.forEach((el, idx) => {
          if (lessons[idx]) {
            // Lesson date is typically at index 6, time at index 7
            const date = lessons[idx][6] || lessons[idx][0] || '';
            const time = lessons[idx][7] || lessons[idx][1] || '';
            el.innerHTML = '<span style="font-size:9px">' + date + '</span>';
            if (time) el.innerHTML += '<br><span style="font-size:7px">' + time + '</span>';
          }
        });

        plates.forEach((el, idx) => {
          if (lessons[idx]) {
            let plate = lessons[idx][4] || lessons[idx][2] || '';
            plate = plate.replace('(Manuel)', '').replace('(Otomatik)', '').trim();
            el.textContent = plate;
          }
        });

        trainers.forEach((el, idx) => {
          if (lessons[idx]) {
            el.textContent = lessons[idx][8] || lessons[idx][3] || '';
          }
        });
      })();
    `);

    // Distribute remaining vertical space as cell padding, but reserve 20mm for stamp area
    await pdfWin.webContents.executeJavaScript(`
      (function() {
        const bodyHeight = document.body.scrollHeight;
        const pageHeightPx = 297 * 96 / 25.4; // A4=297mm at 96dpi ~1123px
        const stampReservePx = 26 * 96 / 25.4; // 26mm reserved for stamp ~99px
        const remaining = pageHeightPx - bodyHeight - stampReservePx;
        if (remaining > 10) {
          const cells = document.querySelectorAll('table td, table th');
          if (cells.length > 0) {
            const rows = document.querySelectorAll('table tr');
            const extraPerRow = remaining / rows.length / 2; // top + bottom
            cells.forEach(function(cell) {
              const current = parseFloat(getComputedStyle(cell).paddingTop) || 1;
              cell.style.paddingTop = (current + extraPerRow) + 'px';
              cell.style.paddingBottom = (current + extraPerRow) + 'px';
            });
          }
        }
      })();
    `);

    // Print to PDF with zero margins for full-page output
    const pdfBuffer = await pdfWin.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
    });

    pdfWin.close();
    return Buffer.from(pdfBuffer);
  }

  private async handleSimulationReport(tc: string, simulationType: string, account: Account, parentWin: BrowserWindow) {
    console.log(`[${account.label}] Simulator report for TC: ${tc}, simulationType: ${simulationType}`);

    this.pendingSimulatorReport = { tc, simulationType, account };

    try {
      await parentWin.webContents.executeJavaScript(`
        (function() {
          const overlay = document.getElementById('mebbis-modal-overlay');
          if (overlay) {
            const submitBtn = overlay.querySelector('button:last-of-type');
            if (submitBtn) {
              submitBtn.textContent = 'Veriler getiriliyor...';
              submitBtn.disabled = true;
              submitBtn.style.opacity = '0.6';
            }
          }
        })();
      `);
    } catch {}

    // Use the same navigation pattern as direksiyon takip — navigate via menu clicks in the same window
    const currentURL = parentWin.webContents.getURL().toLowerCase();

    if (currentURL.includes('skt00001') || currentURL.includes('/skt/')) {
      // Already on an SKT page, can click directly to skt02009
      this.pendingDownloadPhase = 'navigate-simulator';
      this.clickMenuItemForSkt02009(parentWin, account);
    } else {
      // On main.aspx or other non-SKT page, first navigate to SKT module
      this.pendingDownloadPhase = 'skt-module';
      const clicked = await parentWin.webContents.executeJavaScript(`
        (function() {
          const allTds = document.querySelectorAll('td');
          for (const td of allTds) {
            const onclick = td.getAttribute('onclick') || '';
            if (onclick.includes('skt00001')) {
              td.click();
              return true;
            }
          }
          const allTrs = document.querySelectorAll('tr');
          for (const tr of allTrs) {
            const onclick = tr.getAttribute('onclick') || '';
            if (onclick.includes('skt00001')) {
              tr.click();
              return true;
            }
          }
          return false;
        })();
      `).catch(() => false);

      if (!clicked) {
        this.pendingSimulatorReport = null;
        this.pendingDownloadPhase = null;
        parentWin.webContents.executeJavaScript(`
          (function() {
            const overlay = document.getElementById('mebbis-modal-overlay');
            if (overlay) {
              const submitBtn = overlay.querySelector('button:last-of-type');
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Oluştur';
                submitBtn.style.opacity = '1';
              }
            }
          })();
        `).catch(() => {});
      }
    }
  }

  /**
   * Extract simulator sessions from lesson records
   * Returns only lessons where ders_yeri contains "Simulatör" or "Direksiyon Eğitim Alanı"
   */
  private extractSimulatorSessions(lessons: string[][]): string[][] {
    return lessons.filter(lesson => {
      const dersYeri = lesson[5]?.trim() || '';
      return dersYeri.toLowerCase().includes('simulatör') || 
             dersYeri.toLowerCase().includes('direksiyon eğitim');
    });
  }

  /**
   * Generate Simulator Report PDF locally
   * Similar to PDF generation flow but uses sesim/anagrup templates
   */
  async generateSimulatorReportPdf(
    studentInfo: { 'ad-soyad': string; 'tc-kimlik-no': string; 'istenen-sertifika': string },
    simulatorSessions: string[][],
    simulationType: string,
    account: Account,
    parentWindow: BrowserWindow
  ): Promise<string> {
    console.log(`[${account.label}] Generating ${simulationType} simulator report PDF...`);
    console.log(`[${account.label}] Sessions to include: ${simulatorSessions.length}`);

    // Always ask for folder — all files (sesim/anagrup + ek4) go into a subfolder
    const result = await dialog.showOpenDialog(parentWindow, {
      title: 'Simulatör Raporları - Klasör Seçin',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || !result.filePaths[0]) {
      throw new Error('Klasör seçilmedi');
    }

    const tc = studentInfo['tc-kimlik-no'] || '';
    const studentName = (studentInfo['ad-soyad'] || 'unknown')
      .replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9\s]/g, '')
      .replace(/\s+/g, '_');
    const safeLabel = account.label.replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9\s]/g, '').replace(/\s+/g, '_');
    const studentDir = path.join(result.filePaths[0], `${tc}_${studentName}_${safeLabel}`);
    if (!fs.existsSync(studentDir)) fs.mkdirSync(studentDir, { recursive: true });

    const record = simulatorSessions[0];
    const recordo = simulatorSessions.length >= 2 ? simulatorSessions[1] : null;
    const instructorName = record?.[8] || 'Bilinmeyen';
    const date1 = record?.[6] || '';
    const time1 = record?.[7] || '';
    const donem = record?.[0] || '';
    const date2 = recordo?.[6] || '';
    const time2 = recordo?.[7] || '';
    const isDual = recordo !== null;

    if (simulationType === 'sesim' || simulationType === 'both') {
      const htmlContent = await this.generateSesimHtml(studentInfo, simulatorSessions, account.label);
      const pdfBuffer = await this.generatePdfFromHtml(htmlContent);
      fs.writeFileSync(path.join(studentDir, 'sesim.pdf'), pdfBuffer);
      console.log(`[${account.label}] Saved sesim.pdf`);
    }

    if (simulationType === 'ana_grup' || simulationType === 'both') {
      const scenarios = this.getAnagrupScenarios();
      const baseTemplate = await this.fetchSimulatorTemplate('anagrup/anagrup.html');

      for (let i = 0; i < scenarios.length; i++) {
        const scenario = scenarios[i];
        console.log(`[${account.label}] Generating anagrup PDF ${i + 1}/${scenarios.length}: ${scenario}`);

        const html = this.generateAnagrupHtml(baseTemplate, {
          studentName: studentInfo['ad-soyad'],
          instructorName,
          date1, time1, date2, time2, donem,
          scenario,
          accountLabel: account.label,
          isDual,
        });

        const scenarioPdf = await this.generatePdfFromHtml(html);
        const safeScenarioName = scenario.replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9 ]/g, '').trim();
        fs.writeFileSync(path.join(studentDir, `${i + 1}_${safeScenarioName}.pdf`), scenarioPdf);
      }
    }

    // Always generate EK4 alongside simulator reports
    const ek4Html = await this.generateEk4Html(
      studentInfo['ad-soyad'],
      record?.[4] || '',  // plaka (araç plakası col 4)
      instructorName,
      account.label,
      date1,               // tarih (ders tarihi)
    );
    const ek4Pdf = await this.generatePdfFromHtml(ek4Html);
    fs.writeFileSync(path.join(studentDir, 'ek4.pdf'), ek4Pdf);
    console.log(`[${account.label}] Saved ek4.pdf`);

    this.logPdf(account, 'simulator_raporu', 1);

    return studentDir;
  }

  /**
   * Generate Sesim HTML from template with session data
   * Matches PHP sesimkaydet() for single session, sesimkaydet2() for dual sessions
   * Generates 16 timing rows with 6-min intervals (8-min for rows 8 and 16)
   * +18min break gap at row 8 for single session, switches to session 2 for dual
   */
  private async generateSesimHtml(
    studentInfo: any,
    sessions: string[][],
    accountLabel: string
  ): Promise<string> {
    const templateContent = await this.fetchSimulatorTemplate('sesim/sesim.html');
    let html = templateContent;

    // sessions are already sorted desc and sliced to max 2
    // PHP: record=$tablobilgi[0] (newest), recordo=$tablobilgi[1] (older)
    // But PHP passes OLDER first to sesimkaydet2: rows 1-8 = older, rows 9-16 = newer
    const newestSession = sessions[0]; // most recent
    const olderSession = sessions.length >= 2 ? sessions[1] : null; // older
    if (!newestSession) throw new Error('No simulator sessions found');

    const studentName = studentInfo['ad-soyad'] || '';
    const instructorName = newestSession[8] || 'Bilinmeyen';
    const isDual = olderSession !== null;

    // Parse start times: col[7] = "HH:MM - HH:MM"
    const parseStartTime = (timeStr: string): Date => {
      const cleaned = timeStr.replace(/\s/g, '');
      const startPart = cleaned.split('-')[0]; // "HH:MM"
      const [h, m] = startPart.split(':').map(Number);
      const d = new Date(2000, 0, 1, h, m, 0);
      return d;
    };

    const formatTime = (d: Date): string => {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    };

    const addMinutes = (d: Date, mins: number): Date => {
      return new Date(d.getTime() + mins * 60000);
    };

    // PHP: rows 1-8 use OLDER session (recordo), rows 9-16 use NEWER (record)
    // For single session, just use the one session for everything
    const firstSession = isDual ? olderSession! : newestSession;
    const secondSession = isDual ? newestSession : newestSession;

    const date1 = firstSession[6] || '';
    const time1 = firstSession[7] || '';
    const saataralik1 = time1;
    let startTime1 = parseStartTime(time1);

    let egitimsuresi: string;

    if (isDual) {
      const date2 = secondSession[6] || '';
      const time2 = secondSession[7] || '';
      const saataralik2 = time2;
      // PHP: "$egitimtarih $saataralik /  $egitimtarih2 $saataralik2"
      // egitimtarih = older date, egitimtarih2 = newer date
      egitimsuresi = `${date1} ${saataralik1} /  ${date2} ${saataralik2}`;
    } else {
      // PHP: "$egitimtarih $saataralik / $saatss - $saatss2"
      const saatss = addMinutes(startTime1, 60);
      const saatss2 = addMinutes(startTime1, 110);
      const formatHM = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      egitimsuresi = `${date1} ${saataralik1} / ${formatHM(saatss)} - ${formatHM(saatss2)}`;
    }

    // Fill template header fields — only replace inner text, preserve original tag attributes/styles
    html = html.replace(/(<span[^>]*class="kursiyer"[^>]*>)[^<]*(<\/span>)/i, `$1${studentName}$2`);
    html = html.replace(/(<span[^>]*class="egitmen"[^>]*>)[^<]*(<\/span>)/i, `$1${instructorName}$2`);
    html = html.replace(/(<span[^>]*class="egitimsuresi"[^>]*>)[^<]*(<\/span>)/i, `$1${egitimsuresi}$2`);

    // Generate 16 timing rows (matching PHP sesimkaydet / sesimkaydet2)
    let chartHtml = '';
    let currentTime = new Date(startTime1.getTime()); // starts with first session (older for dual)

    // For dual: second session start time (newer session)
    let startTime2: Date | null = null;
    let date2ForChart = date1;
    if (isDual) {
      startTime2 = parseStartTime(secondSession[7] || '');
      date2ForChart = secondSession[6] || '';
    }

    let currentDate = date1;

    for (let i = 0; i < 16; i++) {
      let duration = '00:06';

      if (i === 8) {
        if (isDual && startTime2) {
          // Dual: switch to session 2's start time and date
          currentTime = new Date(startTime2.getTime());
          currentDate = date2ForChart;
        } else {
          // Single: +18 minute break gap
          currentTime = addMinutes(currentTime, 18);
        }
      }

      const rowStart = formatTime(currentTime);
      let rowEnd: string;

      if (i === 7 || i === 15) {
        // Rows 8 and 16 are 8 minutes
        rowEnd = formatTime(addMinutes(currentTime, 8));
        duration = '00:08';
      } else {
        rowEnd = formatTime(addMinutes(currentTime, 6));
      }

      const score = Math.floor(Math.random() * 21) + 80; // 80-100

      chartHtml += `
              <tr>
                <td>${i + 1}</td>
                <td>${currentDate}</td>
                <td>${rowStart}</td>
                <td>${rowEnd}</td>
                <td>${duration}</td>
                <td>${isDual ? (i + 1) : 1}</td>
                <td>${score}</td>
              </tr>`;

      // Advance time for next row (skip for row 7, the break handles it at i===8)
      if (i !== 7) {
        currentTime = addMinutes(currentTime, 6);
      }
    }

    html = html.replace(/<tbody class="cizelgetr">[\s\S]*?<\/tbody>/i, `<tbody class="cizelgetr">${chartHtml}</tbody>`);

    return html;
  }

  private generateAnagrupHtml(
    baseTemplate: string,
    data: {
      studentName: string; instructorName: string;
      date1: string; time1: string; date2: string; time2: string;
      donem: string; scenario: string; accountLabel: string; isDual: boolean;
    }
  ): string {
    let html = baseTemplate;

    // Fill fields — only replace inner text, preserve original tag attributes/styles
    html = html.replace(/(<span[^>]*class="kursiyer"[^>]*>)[^<]*(<\/span>)/i, `$1${data.studentName}$2`);
    html = html.replace(/(<span[^>]*class="egitmen"[^>]*>)[^<]*(<\/span>)/i, `$1${data.instructorName}$2`);
    html = html.replace(/(<span[^>]*class="baslik"[^>]*>)[^<]*(<\/span>)/i, `$1${data.scenario}$2`);
    html = html.replace(/(<span[^>]*class="tarih"[^>]*>)[^<]*(<\/span>)/i, `$1${data.date1}$2`);
    html = html.replace(/(<span[^>]*class="donem"[^>]*>)[^<]*(<\/span>)/i, `$1${data.donem}$2`);

    // Fill egitimsuresi: tekli vs ikili (matching PHP anagrup logic)
    let egitimsuresi: string;
    if (data.isDual) {
      egitimsuresi = `${data.date1} ${data.time1} <br> ${data.date2} ${data.time2}`;
    } else {
      egitimsuresi = `${data.date1} ${data.time1}`;
    }
    html = html.replace(/(<span[^>]*class="egitimsuresi"[^>]*>)[^<]*(<\/span>)/i, `$1${egitimsuresi}$2`);

    // Fill company name
    html = html.replace(/(<span[^>]*class="sirketismi"[^>]*>)[^<]*/i, `$1${data.accountLabel}`);

    // Fill .adet elements with random 0/1 and calculate score (matching PHP anagrup logic)
    // PHP: if rand(0,100) > 85 && puan > 80 → "1" and puan -= 4, else "0"
    let puan = 100;
    html = html.replace(/class="adet"[^>]*>[^<]*/gi, (match) => {
      const r = Math.floor(Math.random() * 101);
      if (r > 85 && puan > 80) {
        puan -= 4;
        return match.replace(/>[^<]*$/, '>1');
      }
      return match.replace(/>[^<]*$/, '>0');
    });

    // Fill score with calculated value
    html = html.replace(/(<span[^>]*class="puan"[^>]*>)[^<]*(<\/span>)/i, `$1${puan}$2`);

    // Fill havadurumu with random weather (matching PHP)
    const weatherOptions = ["Sisli Hava", "Yağmurlu Hava", "Güneşli Hava"];
    const weather = weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
    html = html.replace(/(<span[^>]*class="havadurumu"[^>]*>)[^<]*(<\/span>)/i, `$1${weather}$2`);

    return html;
  }

  /**
   * Get list of anagrup scenarios
   */
  private getAnagrupScenarios(): string[] {
    return [
      "ALGI VE REFLEKS SİMÜLASYONU",
      "DEĞİŞİK HAVA KOŞULLARI SİMÜLASYONU",
      "DİREKSİYON EĞİTİM ALANI SİMÜLASYONU",
      "GECE, GÜNDÜZ SİSLİ HAVA SİMÜLASYONU",
      "İNİŞ ÇIKIŞ EĞİMLİ YOL SİMÜLASYONU",
      "PARK EĞİTİMİ SİMÜLASYONU",
      "ŞEHİR İÇİ YOL SİMÜLASYONU",
      "ŞEHİRLER ARASI YOL SİMÜLASYONU",
      "TRAFİK İŞARETLERİ SİMÜLASYONU",
      "TRAFİK ORTAMI SİMÜLASYONU",
      "VİRAJLI YOLDA SÜRÜŞ SİMÜLASYONU",
    ];
  }

  private pendingSimulatorReport: { tc: string; simulationType: string; account: Account } | null = null;

  private fetchTemplate(templateName: string): Promise<string> {
    return fetchEncryptedTemplate(`direksiyon-takip/${templateName}`);
  }

  // ==================== BATCH DİREKSİYON TAKİP / SİMÜLATÖR ====================

  private trackBatchError(errorMessage: string, studentTc: string) {
    if (!this.pendingBatchDownload) return;
    const key = errorMessage;
    const existing = this.pendingBatchDownload.errors.get(key);
    if (existing) {
      if (!existing.samples.includes(studentTc)) {
        existing.samples.push(studentTc);
      }
    } else {
      this.pendingBatchDownload.errors.set(key, { message: errorMessage, samples: [studentTc] });
    }

    // Track "data not found" errors separately for final message.
    // Only student data missing counts as bulunamadı — server-side issues
    // like "Şablon bulunamadı" are real errors and stay in `hatalı`.
    const isDataNotFound =
      errorMessage.includes('Simülatör dersi bulunamadı') ||
      errorMessage.includes('Ders programı bulunamadı');
    if (isDataNotFound) {
      this.pendingBatchDownload.notFound++;
    }
  }

  private formatBatchErrorSummary(): string {
    if (!this.pendingBatchDownload || this.pendingBatchDownload.errors.size === 0) return '';

    const errorLines: string[] = [];
    for (const [message, data] of this.pendingBatchDownload.errors) {
      const sampleText = data.samples.length === 1
        ? `(TC: ${data.samples[0]})`
        : `(${data.samples.length} öğrenci, örnek: ${data.samples[0]})`;
      errorLines.push(`• ${message} ${sampleText}`);
    }
    return errorLines.join('\n');
  }

  private async handleBatchDireksiyon(account: Account, parentWin: BrowserWindow) {
    this.handleBatchGeneric('direksiyon', account, parentWin);
  }

  private async handleBatchGeneric(batchType: 'direksiyon' | 'simulator', account: Account, parentWin: BrowserWindow) {
    const labels: Record<string, string> = { direksiyon: 'Çoklu Direksiyon Takip', simulator: 'Çoklu Simülatör Raporu' };
    console.log(`[${account.label}] Starting batch ${batchType}...`);

    // Initialize batch state
    this.pendingBatchDownload = {
      batchType,
      options: { donemi: '', ogrenciDurumu: '0', onayDurumu: '4', grubu: '-1', subesi: '-1' },
      donemList: [],
      currentDonemIndex: 0,
      statusList: [],
      currentStatusIndex: 0,
      students: [],
      processedTcs: new Set<string>(),
      currentStudentIndex: 0,
      outputDir: '',
      account,
      parentWin,
      completed: 0,
      failed: 0,
      notFound: 0,
      statusMessage: 'Başlatılıyor...',
      errors: new Map(),
    };
    try { this.batchStateListener?.(true); } catch { /* ignore */ }

    const currentURL = parentWin.webContents.getURL().toLowerCase();

    if (currentURL.includes('skt02006')) {
      // Already on skt02006
      this.pendingDownloadPhase = 'batch-skt02006-options';
      this.handleSkt02006Options(parentWin, account);
    } else if (currentURL.includes('/skt/')) {
      // On an SKT page, navigate directly to skt02006
      this.pendingDownloadPhase = 'batch-skt02006-options';
      this.clickMenuItemForSkt02006(parentWin, account);
    } else {
      // On main page, first navigate to SKT module
      this.pendingDownloadPhase = 'batch-skt-module';
      const clicked = await parentWin.webContents.executeJavaScript(`
        (function() {
          const allTds = document.querySelectorAll('td');
          for (const td of allTds) {
            const onclick = td.getAttribute('onclick') || '';
            if (onclick.includes('skt00001')) {
              td.click();
              return true;
            }
          }
          const allTrs = document.querySelectorAll('tr');
          for (const tr of allTrs) {
            const onclick = tr.getAttribute('onclick') || '';
            if (onclick.includes('skt00001')) {
              tr.click();
              return true;
            }
          }
          return false;
        })();
      `).catch(() => false);

      if (!clicked) {
        console.log(`[${account.label}] Batch: SKT module not found`);
        this.clearPendingBatchDownload();
        this.pendingDownloadPhase = null;
      }
    }
  }

  private async clickMenuItemForSkt02006(win: BrowserWindow, account: Account) {
    const clicked = await win.webContents.executeJavaScript(`
      (function() {
        const allTds = document.querySelectorAll('td');
        for (const td of allTds) {
          const onclick = td.getAttribute('onclick') || '';
          if (onclick.includes('skt02006')) {
            console.log('[MEBBIS] Found skt02006 menu item, clicking...');
            td.click();
            return true;
          }
        }
        console.log('[MEBBIS] skt02006 menu item not found');
        return false;
      })();
    `).catch(() => false);

    if (!clicked) {
      console.log(`[${account.label}] Batch: skt02006 menu not found, trying direct navigation...`);
      // Fallback: navigate directly via URL (still browser navigation, not Node.js fetch)
      await win.webContents.executeJavaScript(`
        window.location.href = '/SKT/skt02006.aspx';
      `).catch(() => {});
    }
  }

  private async handleSkt02006Options(win: BrowserWindow, account: Account) {
    if (!this.pendingBatchDownload) return;
    const batchType = this.pendingBatchDownload.batchType;
    const modalTitles: Record<string, string> = { direksiyon: 'Çoklu Direksiyon Takip', simulator: 'Çoklu Simülatör Raporu' };
    const modalTitle = modalTitles[batchType] || 'Çoklu İndirme';

    try {
      // Scrape all dropdown options from the skt02006 form
      const formOptions = await win.webContents.executeJavaScript(`
        (function() {
          function getSelectOptions(id) {
            const select = document.getElementById(id);
            if (!select) return [];
            return Array.from(select.options).map(o => ({ value: o.value, label: o.textContent.trim() }));
          }
          return {
            donemi: getSelectOptions('cmbEgitimDonemi'),
            ogrenciDurumu: getSelectOptions('cmbOgrenciDurumu'),
            onayDurumu: getSelectOptions('cmbDurumu'),
            grubu: getSelectOptions('cmbGrubu'),
            subesi: getSelectOptions('cmbSubesi'),
          };
        })();
      `);

      console.log(`[${account.label}] Batch: form options scraped:`, JSON.stringify({
        donemi: formOptions.donemi?.length || 0,
        ogrenciDurumu: formOptions.ogrenciDurumu?.length || 0,
        onayDurumu: formOptions.onayDurumu?.length || 0,
        grubu: formOptions.grubu?.length || 0,
        subesi: formOptions.subesi?.length || 0,
      }));

      // Store dönem list for potential looping
      this.pendingBatchDownload.donemList = formOptions.donemi || [];

      // Inject options modal on the page
      await win.webContents.executeJavaScript(`
        (function() {
          let overlay = document.getElementById('mebbis-batch-overlay');
          if (overlay) overlay.remove();

          overlay = document.createElement('div');
          overlay.id = 'mebbis-batch-overlay';
          overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 99999; display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif;';

          const modal = document.createElement('div');
          modal.style.cssText = 'background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 8px; padding: 24px; width: 420px; max-height: 80vh; overflow-y: auto; color: white;';

          const title = document.createElement('h3');
          title.style.cssText = 'margin: 0 0 20px 0; color: #4361ee; font-size: 18px; text-align: center;';
          title.textContent = '${modalTitle}';
          modal.appendChild(title);

          function createSelect(labelText, id, options, defaultValue) {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'margin-bottom: 14px;';
            const label = document.createElement('label');
            label.style.cssText = 'display: block; margin-bottom: 6px; font-size: 13px; color: #aaa;';
            label.textContent = labelText;
            wrap.appendChild(label);
            const select = document.createElement('select');
            select.id = id;
            select.style.cssText = 'width: 100%; padding: 8px 10px; border: 1px solid #2a2a4a; border-radius: 4px; background: #16213e; color: white; font-size: 13px; box-sizing: border-box; outline: none; cursor: pointer;';
            select.onfocus = () => { select.style.borderColor = '#4361ee'; };
            select.onblur = () => { select.style.borderColor = '#2a2a4a'; };
            options.forEach(o => {
              const opt = document.createElement('option');
              opt.value = o.value;
              opt.textContent = o.label;
              opt.style.cssText = 'color: white; background-color: #16213e;';
              if (o.value === defaultValue) opt.selected = true;
              select.appendChild(opt);
            });
            wrap.appendChild(select);
            return wrap;
          }

          const donemOptions = ${JSON.stringify(formOptions.donemi || [])};
          const tumDonemOpt = donemOptions.find(o => o.label.toLowerCase().includes('tüm') || o.label.toLowerCase().includes('t\u00FCm'));
          modal.appendChild(createSelect('Eğitim Dönemi', 'batch-donemi', donemOptions, tumDonemOpt?.value || donemOptions[0]?.value || ''));

          const ogrenciOptions = ${JSON.stringify(formOptions.ogrenciDurumu || [])};
          const hepsiOption = { value: 'HEPSI', label: 'Hepsi (Uygulama + Sertifika + Hak Doldu)' };
          const ogrenciOptionsWithHepsi = [hepsiOption, ...ogrenciOptions];
          modal.appendChild(createSelect('Öğrenci Durumu', 'batch-ogrenciDurumu',
            ogrenciOptionsWithHepsi, 'HEPSI'));

          const onayDurumuOpts = ${JSON.stringify(formOptions.onayDurumu || [])};
          const tumAdaylarOpt = onayDurumuOpts.find(o => o.label.toLowerCase().includes('tüm') || o.label.toLowerCase().includes('t\u00FCm'));
          modal.appendChild(createSelect('Onay Durumu', 'batch-onayDurumu',
            onayDurumuOpts, tumAdaylarOpt?.value || '4'));

          modal.appendChild(createSelect('Grubu', 'batch-grubu',
            ${JSON.stringify(formOptions.grubu || [])}, '-1'));

          modal.appendChild(createSelect('Şubesi', 'batch-subesi',
            ${JSON.stringify(formOptions.subesi || [])}, '-1'));

          // Simulator type selector (only for simulator batch)
          if ('${batchType}' === 'simulator') {
            modal.appendChild(createSelect('Simülasyon Tipi', 'batch-simType', [
              { value: 'sesim', label: 'Sesim (1 rapor/öğrenci)' },
              { value: 'ana_grup', label: 'Ana Grup (11 rapor/öğrenci)' },
              { value: 'both', label: 'Her İkisi' },
            ], 'both'));
          }

          // Progress area (hidden initially)
          const progressArea = document.createElement('div');
          progressArea.id = 'batch-progress';
          progressArea.style.cssText = 'display: none; margin-top: 16px; padding: 10px; border-radius: 4px; background: #16213e; color: #4361ee; font-size: 13px; text-align: center;';
          modal.appendChild(progressArea);

          // Buttons
          const btnRow = document.createElement('div');
          btnRow.style.cssText = 'display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end;';

          const cancelBtn = document.createElement('button');
          cancelBtn.textContent = 'İptal';
          cancelBtn.style.cssText = 'padding: 10px 20px; border: 1px solid #2a2a4a; border-radius: 4px; background: none; color: #ccc; cursor: pointer; font-size: 14px;';
          cancelBtn.onclick = () => {
            overlay.remove();
            console.log('MEBBIS_BATCH_CANCEL');
          };
          btnRow.appendChild(cancelBtn);

          const startBtn = document.createElement('button');
          startBtn.id = 'batch-start-btn';
          startBtn.textContent = 'Başlat';
          startBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 4px; background: #4361ee; color: white; cursor: pointer; font-size: 14px; font-weight: bold;';
          startBtn.onclick = () => {
            const options = {
              donemi: document.getElementById('batch-donemi').value,
              ogrenciDurumu: document.getElementById('batch-ogrenciDurumu').value,
              onayDurumu: document.getElementById('batch-onayDurumu').value,
              grubu: document.getElementById('batch-grubu').value,
              subesi: document.getElementById('batch-subesi').value,
              simType: document.getElementById('batch-simType')?.value || '',
            };
            startBtn.disabled = true;
            startBtn.textContent = 'Yükleniyor...';
            startBtn.style.opacity = '0.6';
            cancelBtn.disabled = true;
            const progress = document.getElementById('batch-progress');
            if (progress) { progress.style.display = 'block'; progress.textContent = 'Öğrenci listesi alınıyor...'; }
            console.log('MEBBIS_BATCH_START:' + JSON.stringify(options));
          };
          btnRow.appendChild(startBtn);

          modal.appendChild(btnRow);
          overlay.appendChild(modal);
          overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); console.log('MEBBIS_BATCH_CANCEL'); } };
          document.body.appendChild(overlay);
        })();
      `);
    } catch (e) {
      console.error(`[${account.label}] Batch: options scrape error:`, e);
      this.clearPendingBatchDownload();
      this.pendingDownloadPhase = null;
    }
  }

  /**
   * Scrapes filter dropdown options from a freshly loaded skt02006 page and
   * shows a modal letting the user choose dönem / öğrenci durumu / onay
   * durumu / grup / şube. Clicking "Güncelle" emits MEBBIS_STUDENT_UPDATE_START
   * with the selected values; the main process then calls
   * submitStudentUpdateForm to re-POST the form. Closing the modal emits
   * MEBBIS_STUDENT_UPDATE_CANCEL.
   *
   * Only runs for accounts present in pendingStudentUpdate; the caller is
   * expected to add the account before navigating to skt02006.
   */
  private async handleStudentUpdateOptions(win: BrowserWindow, account: Account): Promise<void> {
    if (!this.pendingStudentUpdate.has(account.id)) return;
    try {
      const formOptions = await win.webContents.executeJavaScript(`
        (function() {
          function getSelectOptions(id) {
            const sel = document.getElementById(id);
            if (!sel) return [];
            return Array.from(sel.options).map(o => ({ value: o.value, label: o.textContent.trim() }));
          }
          return {
            donemi:        getSelectOptions('cmbEgitimDonemi'),
            ogrenciDurumu: getSelectOptions('cmbOgrenciDurumu'),
            onayDurumu:    getSelectOptions('cmbDurumu'),
            grubu:         getSelectOptions('cmbGrubu'),
            subesi:        getSelectOptions('cmbSubesi'),
          };
        })();
      `);

      const json = (v: any) => JSON.stringify(v ?? []);

      await win.webContents.executeJavaScript(`
        (function() {
          let overlay = document.getElementById('mebbis-student-update-overlay');
          if (overlay) overlay.remove();

          overlay = document.createElement('div');
          overlay.id = 'mebbis-student-update-overlay';
          overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 99999; display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif;';

          const modal = document.createElement('div');
          modal.style.cssText = 'background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 8px; padding: 24px; width: 420px; max-height: 80vh; overflow-y: auto; color: white;';

          const title = document.createElement('h3');
          title.style.cssText = 'margin: 0 0 6px 0; color: #4361ee; font-size: 18px; text-align: center;';
          title.textContent = 'Öğrencileri Güncelle';
          modal.appendChild(title);

          const sub = document.createElement('div');
          sub.style.cssText = 'text-align:center; color:#888; font-size:12px; margin-bottom:18px;';
          sub.textContent = 'Filtreyi seçin; öğrenci listesi yerel kayıt ve veritabanıyla güncellenecek.';
          modal.appendChild(sub);

          function createSelect(labelText, id, options, defaultValue) {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'margin-bottom: 14px;';
            const label = document.createElement('label');
            label.style.cssText = 'display: block; margin-bottom: 6px; font-size: 13px; color: #aaa;';
            label.textContent = labelText;
            wrap.appendChild(label);
            const select = document.createElement('select');
            select.id = id;
            select.style.cssText = 'width: 100%; padding: 8px 10px; border: 1px solid #2a2a4a; border-radius: 4px; background: #16213e; color: white; font-size: 13px; box-sizing: border-box; outline: none; cursor: pointer;';
            select.onfocus = () => { select.style.borderColor = '#4361ee'; };
            select.onblur  = () => { select.style.borderColor = '#2a2a4a'; };
            options.forEach(o => {
              const opt = document.createElement('option');
              opt.value = o.value;
              opt.textContent = o.label;
              opt.style.cssText = 'color: white; background-color: #16213e;';
              if (o.value === defaultValue) opt.selected = true;
              select.appendChild(opt);
            });
            wrap.appendChild(select);
            return wrap;
          }

          // Prefer "Tümü" entries when the field offers one; otherwise fall back to the first option.
          function pickTumOr(opts, fallback) {
            const tum = opts.find(o => (o.label || '').toLowerCase().includes('tüm'));
            return tum ? tum.value : (fallback ?? (opts[0] ? opts[0].value : ''));
          }

          const donemOpts   = ${json(formOptions.donemi)};
          const ogrenciOpts = ${json(formOptions.ogrenciDurumu)};
          const onayOpts    = ${json(formOptions.onayDurumu)};
          const grubuOpts   = ${json(formOptions.grubu)};
          const subesiOpts  = ${json(formOptions.subesi)};

          modal.appendChild(createSelect('Eğitim Dönemi',   'su-donemi',        donemOpts,   pickTumOr(donemOpts)));
          modal.appendChild(createSelect('Öğrenci Durumu',  'su-ogrenciDurumu', ogrenciOpts, pickTumOr(ogrenciOpts)));
          modal.appendChild(createSelect('Onay Durumu',     'su-onayDurumu',    onayOpts,    pickTumOr(onayOpts)));
          modal.appendChild(createSelect('Grubu',           'su-grubu',         grubuOpts,   '-1'));
          modal.appendChild(createSelect('Şubesi',          'su-subesi',        subesiOpts,  '-1'));

          const progress = document.createElement('div');
          progress.id = 'su-progress';
          progress.style.cssText = 'display: none; margin-top: 16px; padding: 10px; border-radius: 4px; background: #16213e; color: #4361ee; font-size: 13px; text-align: center;';
          modal.appendChild(progress);

          const btnRow = document.createElement('div');
          btnRow.style.cssText = 'display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end;';

          const cancelBtn = document.createElement('button');
          cancelBtn.textContent = 'İptal';
          cancelBtn.style.cssText = 'padding: 10px 20px; border: 1px solid #2a2a4a; border-radius: 4px; background: none; color: #ccc; cursor: pointer; font-size: 14px;';
          cancelBtn.onclick = () => { overlay.remove(); console.log('MEBBIS_STUDENT_UPDATE_CANCEL'); };
          btnRow.appendChild(cancelBtn);

          const startBtn = document.createElement('button');
          startBtn.id = 'su-start-btn';
          startBtn.textContent = 'Güncelle';
          startBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 4px; background: #4361ee; color: white; cursor: pointer; font-size: 14px; font-weight: bold;';
          startBtn.onclick = () => {
            const options = {
              donemi:        document.getElementById('su-donemi').value,
              ogrenciDurumu: document.getElementById('su-ogrenciDurumu').value,
              onayDurumu:    document.getElementById('su-onayDurumu').value,
              grubu:         document.getElementById('su-grubu').value,
              subesi:        document.getElementById('su-subesi').value,
            };
            startBtn.disabled = true;
            startBtn.textContent = 'Yükleniyor...';
            startBtn.style.opacity = '0.6';
            cancelBtn.disabled = true;
            const p = document.getElementById('su-progress');
            if (p) { p.style.display = 'block'; p.textContent = 'Öğrenci listesi alınıyor...'; }
            console.log('MEBBIS_STUDENT_UPDATE_START:' + JSON.stringify(options));
          };
          btnRow.appendChild(startBtn);

          modal.appendChild(btnRow);
          overlay.appendChild(modal);
          overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); console.log('MEBBIS_STUDENT_UPDATE_CANCEL'); } };
          document.body.appendChild(overlay);
        })();
      `);
    } catch (e: any) {
      console.error(`[StudentUpdate][${account.label}] options scrape error:`, e);
      this.pendingStudentUpdate.delete(account.id);
    }
  }

  /**
   * Submits the skt02006 filter form for the student-update flow. The
   * resulting page load is caught by the passive skt02006 branch in the
   * page-load handler, which runs parseAndIngestStudentList (already wired
   * to push to the backend). Clears the pending flag so subsequent visits
   * behave normally.
   */
  private async submitStudentUpdateForm(
    win: BrowserWindow,
    options: { donemi: string; ogrenciDurumu: string; onayDurumu: string; grubu: string; subesi: string },
  ): Promise<void> {
    const j = (s: string) => JSON.stringify(String(s ?? ''));
    try {
      await win.webContents.executeJavaScript(`
        (function() {
          function setSelectValue(id, value) {
            const sel = document.getElementById(id);
            if (sel) {
              sel.value = value;
              sel.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
          setSelectValue('cmbEgitimDonemi',  ${j(options.donemi)});
          setSelectValue('cmbOgrenciDurumu', ${j(options.ogrenciDurumu)});
          setSelectValue('cmbDurumu',        ${j(options.onayDurumu)});
          setSelectValue('cmbGrubu',         ${j(options.grubu)});
          setSelectValue('cmbSubesi',        ${j(options.subesi)});

          setTimeout(() => {
            const submitBtn = document.querySelector('[name="btnListeleGrid"]') ||
                              document.querySelector('input[value="Listele"]') ||
                              document.querySelector('input[type="submit"]');
            if (submitBtn) { submitBtn.click(); }
            else if (typeof __doPostBack === 'function') { __doPostBack('btnListeleGrid', ''); }
          }, 150);
        })();
      `);
    } catch (e: any) {
      console.error('[StudentUpdate] submit failed:', e);
    }
    this.pendingStudentUpdate.clear();
  }

  private async handleBatchStart(
    options: { donemi: string; ogrenciDurumu: string; onayDurumu: string; grubu: string; subesi: string; simType?: string },
    account: Account,
    win: BrowserWindow
  ) {
    if (!this.pendingBatchDownload) return;

    // Ask for output folder
    const folderResult = await dialog.showOpenDialog(win, {
      title: 'PDF Kayıt Klasörü Seçin',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (folderResult.canceled || !folderResult.filePaths[0]) {
      console.log(`[${account.label}] Batch: folder selection cancelled`);
      // Re-enable the start button
      win.webContents.executeJavaScript(`
        (function() {
          const btn = document.getElementById('batch-start-btn');
          if (btn) { btn.disabled = false; btn.textContent = 'Başlat'; btn.style.opacity = '1'; }
          const cancel = document.querySelector('#mebbis-batch-overlay button:first-child');
          if (cancel) cancel.disabled = false;
          const progress = document.getElementById('batch-progress');
          if (progress) progress.style.display = 'none';
        })();
      `).catch(() => {});
      return;
    }

    this.pendingBatchDownload.outputDir = folderResult.filePaths[0];
    this.pendingBatchDownload.options = options;
    this.pendingBatchDownload.students = [];
    this.pendingBatchDownload.processedTcs = new Set<string>();
    this.pendingBatchDownload.currentStudentIndex = 0;
    this.pendingBatchDownload.completed = 0;
    this.pendingBatchDownload.failed = 0;
    this.pendingBatchDownload.notFound = 0;
    this.pendingBatchDownload.errors = new Map();

    console.log(`[${account.label}] Batch: output dir=${folderResult.filePaths[0]}, options=`, options);

    // Check if "Hepsi" is selected for student status — loop through 3 relevant statuses
    const isHepsi = options.ogrenciDurumu === 'HEPSI';
    if (isHepsi) {
      this.pendingBatchDownload.statusList = [
        { value: '2', label: 'Uygulama Sınav Aşamasında' },
        { value: '5', label: 'Sertifika Almaya Hak Kazandı' },
        { value: '4', label: 'Uygulama Sınav Hakkı Doldu' },
      ];
      this.pendingBatchDownload.currentStatusIndex = 0;
      // Start with first status
      options.ogrenciDurumu = this.pendingBatchDownload.statusList[0].value;
      this.pendingBatchDownload.options.ogrenciDurumu = options.ogrenciDurumu;
      console.log(`[${account.label}] Batch: Hepsi selected, will loop through ${this.pendingBatchDownload.statusList.length} statuses`);
    } else {
      this.pendingBatchDownload.statusList = [];
      this.pendingBatchDownload.currentStatusIndex = 0;
    }

    // Check if the selected dönem is "Tüm Dönemler" by matching its label
    const selectedDonem = this.pendingBatchDownload.donemList.find(d => d.value === options.donemi);
    const isTumDonemler = selectedDonem?.label?.toLowerCase().includes('tüm') || false;

    if (isTumDonemler && this.pendingBatchDownload.donemList.length > 1) {
      // "Tüm Dönemler" selected — loop through each real period
      const realPeriods = this.pendingBatchDownload.donemList.filter(d => !d.label.toLowerCase().includes('tüm'));
      this.pendingBatchDownload.donemList = realPeriods;
      this.pendingBatchDownload.currentDonemIndex = 0;
      if (realPeriods.length === 0) {
        this.showBatchProgress(win, 'Hata: Dönem listesi boş!', '#ff4444');
        this.clearPendingBatchDownload();
        this.pendingDownloadPhase = null;
        return;
      }
      const firstDonem = realPeriods[0];
      this.showBatchProgress(win, `Dönem taranıyor: ${firstDonem.label} (1/${realPeriods.length})...`);
      this.pendingDownloadPhase = 'batch-skt02006-results';
      this.submitSkt02006Form(win, firstDonem.value, options);
    } else {
      // Single period selected
      this.pendingBatchDownload.donemList = []; // No looping
      this.showBatchProgress(win, 'Öğrenci listesi alınıyor...');
      this.pendingDownloadPhase = 'batch-skt02006-results';
      this.submitSkt02006Form(win, options.donemi, options);
    }
  }

  private async submitSkt02006Form(
    win: BrowserWindow,
    donemiValue: string,
    options: { ogrenciDurumu: string; onayDurumu: string; grubu: string; subesi: string }
  ) {
    try {
      await win.webContents.executeJavaScript(`
        (function() {
          function setSelectValue(id, value) {
            const sel = document.getElementById(id);
            if (sel) {
              sel.value = value;
              sel.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
          setSelectValue('cmbEgitimDonemi', '${donemiValue}');
          setSelectValue('cmbOgrenciDurumu', '${options.ogrenciDurumu}');
          setSelectValue('cmbDurumu', '${options.onayDurumu}');
          setSelectValue('cmbGrubu', '${options.grubu}');
          setSelectValue('cmbSubesi', '${options.subesi}');

          setTimeout(() => {
            const submitBtn = document.querySelector('[name="btnListeleGrid"]') ||
                             document.querySelector('input[value="Listele"]') ||
                             document.querySelector('input[type="submit"]');
            if (submitBtn) {
              console.log('[MEBBIS] Clicking Listele button...');
              submitBtn.click();
            } else {
              console.log('[MEBBIS] Listele button not found, trying __doPostBack...');
              if (typeof __doPostBack === 'function') {
                __doPostBack('btnListeleGrid', '');
              }
            }
          }, 500);
        })();
      `);
    } catch (e) {
      console.error(`[${this.pendingBatchDownload?.account.label}] Batch: form submit error:`, e);
      this.clearPendingBatchDownload();
      this.pendingDownloadPhase = null;
    }
  }

  private async handleSkt02006Results(win: BrowserWindow, account: Account) {
    if (!this.pendingBatchDownload) return;

    try {
      // Scrape the student list table
      const tableData = await win.webContents.executeJavaScript(`
        (function() {
          const table = document.querySelector('table.frmList');
          if (!table) return { students: [], error: 'Tablo bulunamadı' };
          const students = [];
          const rows = table.querySelectorAll('tr');
          for (const row of rows) {
            if (row.classList.contains('frmListBaslik')) continue;
            const cells = row.querySelectorAll('td');
            if (cells.length < 4) continue;
            const cellTexts = Array.from(cells).map(c => c.textContent.trim());
            // skt02006 columns: 0:S.No | 1:Sil | 2:TC | 3:Adı Soyadı
            const tc = cellTexts[2] || '';
            const name = cellTexts[3] || '';
            if (tc && /^[0-9]{11}$/.test(tc)) {
              students.push({ tc, name });
            }
          }
          return { students };
        })();
      `);

      if (tableData.error) {
        console.log(`[${account.label}] Batch: ${tableData.error}`);
      }

      const newStudents = (tableData.students || []) as { tc: string; name: string }[];
      console.log(`[${account.label}] Batch: found ${newStudents.length} students in this period`);

      // Add unique students (avoid duplicates across periods)
      for (const student of newStudents) {
        if (!this.pendingBatchDownload.processedTcs.has(student.tc)) {
          this.pendingBatchDownload.processedTcs.add(student.tc);
          this.pendingBatchDownload.students.push(student);
        }
      }

      // Check if we need to process more periods
      if (this.pendingBatchDownload.donemList.length > 0 &&
          this.pendingBatchDownload.currentDonemIndex < this.pendingBatchDownload.donemList.length - 1) {
        // Move to next period
        this.pendingBatchDownload.currentDonemIndex++;
        const nextDonem = this.pendingBatchDownload.donemList[this.pendingBatchDownload.currentDonemIndex];
        const total = this.pendingBatchDownload.donemList.length;
        this.showBatchProgress(win, `Dönem taranıyor: ${nextDonem.label} (${this.pendingBatchDownload.currentDonemIndex + 1}/${total})... Toplam: ${this.pendingBatchDownload.students.length} öğrenci`);
        this.pendingDownloadPhase = 'batch-skt02006-results';
        this.submitSkt02006Form(win, nextDonem.value, this.pendingBatchDownload.options);
        return;
      }

      // Check if we need to process more student statuses (Hepsi mode)
      if (this.pendingBatchDownload.statusList.length > 0 &&
          this.pendingBatchDownload.currentStatusIndex < this.pendingBatchDownload.statusList.length - 1) {
        // Move to next status
        this.pendingBatchDownload.currentStatusIndex++;
        const nextStatus = this.pendingBatchDownload.statusList[this.pendingBatchDownload.currentStatusIndex];
        const totalStatuses = this.pendingBatchDownload.statusList.length;
        // Reset dönem index for next status loop
        this.pendingBatchDownload.currentDonemIndex = 0;
        // Update ogrenciDurumu in options
        this.pendingBatchDownload.options.ogrenciDurumu = nextStatus.value;

        console.log(`[${account.label}] Batch: moving to next status: ${nextStatus.label} (${this.pendingBatchDownload.currentStatusIndex + 1}/${totalStatuses})`);
        this.showBatchProgress(win, `Durum taranıyor: ${nextStatus.label} (${this.pendingBatchDownload.currentStatusIndex + 1}/${totalStatuses})... Toplam: ${this.pendingBatchDownload.students.length} öğrenci`);

        this.pendingDownloadPhase = 'batch-skt02006-results';
        if (this.pendingBatchDownload.donemList.length > 0) {
          // Tüm Dönemler mode: start from first period again
          this.submitSkt02006Form(win, this.pendingBatchDownload.donemList[0].value, this.pendingBatchDownload.options);
        } else {
          // Single period mode
          this.submitSkt02006Form(win, this.pendingBatchDownload.options.donemi, this.pendingBatchDownload.options);
        }
        return;
      }

      // All periods and statuses processed - start downloading individual student data
      const totalStudents = this.pendingBatchDownload.students.length;
      if (totalStudents === 0) {
        this.showBatchProgress(win, 'Öğrenci bulunamadı!', '#ff4444');
        this.clearPendingBatchDownload();
        this.pendingDownloadPhase = null;
        return;
      }

      console.log(`[${account.label}] Batch: total unique students: ${totalStudents}, starting PDF generation...`);
      this.showBatchProgress(win, `${totalStudents} öğrenci bulundu. PDF oluşturuluyor... (0/${totalStudents})`);

      // Navigate to skt02009 for the first student
      this.pendingBatchDownload.currentStudentIndex = 0;
      this.pendingDownloadPhase = 'batch-skt02009-navigate';
      this.clickMenuItemForSkt02009(win, account);
    } catch (e) {
      console.error(`[${account.label}] Batch: results scrape error:`, e);
      this.showBatchProgress(win, 'Hata: Öğrenci listesi okunamadı', '#ff4444');
      this.clearPendingBatchDownload();
      this.pendingDownloadPhase = null;
    }
  }

  private async handleBatchStudentNavigate(win: BrowserWindow, account: Account) {
    if (!this.pendingBatchDownload) return;
    const { students, currentStudentIndex } = this.pendingBatchDownload;
    if (currentStudentIndex >= students.length) return;

    const student = students[currentStudentIndex];
    console.log(`[${account.label}] Batch: filling TC for ${student.name} (${student.tc}) [${currentStudentIndex + 1}/${students.length}]`);

    try {
      await win.webContents.executeJavaScript(`
        (function() {
          const tcInput = document.getElementById('txtTcKimlikNo');
          if (tcInput) {
            tcInput.value = '${student.tc}';
            tcInput.dispatchEvent(new Event('change', { bubbles: true }));
            tcInput.dispatchEvent(new Event('input', { bubbles: true }));
            setTimeout(() => {
              const searchBtn = document.getElementById('ImageButton1') ||
                               document.querySelector('input[id*="ImageButton"]') ||
                               document.querySelector('input[type="image"]');
              if (searchBtn) {
                searchBtn.click();
              } else {
                const form = tcInput.closest('form');
                if (form) form.submit();
              }
            }, 300);
          }
        })();
      `);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error(`[${account.label}] Batch: TC fill error for ${student.tc}:`, e);
      this.trackBatchError('TC giriş hatası', student.tc);
      this.pendingBatchDownload.failed++;
      this.batchProcessNextStudent(win, account);
    }
  }

  private async handleBatchStudentResults(win: BrowserWindow, account: Account) {
    if (!this.pendingBatchDownload) return;
    const { students, currentStudentIndex, outputDir } = this.pendingBatchDownload;
    if (currentStudentIndex >= students.length) return;

    const student = students[currentStudentIndex];
    const total = students.length;

    // Resolve the period the user picked in the batch dialog (e.g. "2026 - Mayıs").
    // If they left it as "Tüm Dönemler" we pass an empty string and the
    // in-page helper falls back to picking the chronologically newest period.
    const selectedDonemiValue = this.pendingBatchDownload.options?.donemi ?? '';
    const selectedDonemiLabelRaw =
      this.pendingBatchDownload.donemList?.find(d => d.value === selectedDonemiValue)?.label ?? '';
    const isAllPeriods = /tüm|tüm/i.test(selectedDonemiLabelRaw);
    const targetPeriodLabel = isAllPeriods ? '' : selectedDonemiLabelRaw;
    const targetPeriodJs = JSON.stringify(targetPeriodLabel);

    try {
      // Scrape lesson data (same logic as handleSkt02009Results)
      const lessonData = await win.webContents.executeJavaScript(`
        (function() {
          ${PERIOD_HELPERS_JS}
          const donemTable = document.getElementById('dgDonemBilgileri');
          const studentInfo = { 'ad-soyad': '', 'tc-kimlik-no': '${student.tc}', 'istenen-sertifika': '' };
          if (donemTable) {
            const dataRows = donemTable.querySelectorAll('tr:not(.frmListBaslik)');
            if (dataRows.length > 0) {
              const lastRow = dataRows[dataRows.length - 1];
              const cells = lastRow.querySelectorAll('td');
              if (cells.length >= 8) {
                studentInfo['tc-kimlik-no'] = cells[0].textContent.trim() || '${student.tc}';
                studentInfo['ad-soyad'] = cells[1].textContent.trim();
                studentInfo['istenen-sertifika'] = cells[7].textContent.trim();
              }
            }
          }
          const lessonTable = document.getElementById('dgDersProgrami');
          if (!lessonTable) {
            return { error: 'Ders programı bulunamadı', studentInfo };
          }
          const lessons = [];
          const rows = lessonTable.querySelectorAll('tr');
          for (const row of rows) {
            if (row.classList.contains('frmListBaslik')) continue;
            const cells = row.querySelectorAll('td');
            if (cells.length < 6) continue;
            const cellTexts = Array.from(cells).map(c => c.textContent.trim());
            const rowText = cellTexts.join(' ');
            if (rowText.includes('Başarısız Aday')) continue;
            lessons.push(cellTexts);
          }
          // Match the period the user picked in the batch dialog (e.g. May).
          // If they picked "Tüm Dönemler" or the student doesn't have that
          // period, fall back to the chronologically newest period.
          const filteredLessons = _filterByPeriod(lessons, ${targetPeriodJs});
          return { studentInfo, lessons: filteredLessons };
        })();
      `);

      if (lessonData.error) {
        console.log(`[${account.label}] Batch: ${student.tc} - ${lessonData.error}`);
        this.trackBatchError(lessonData.error, student.tc);
        this.pendingBatchDownload.failed++;
      } else {
        await this.batchGenerateForStudent(lessonData, student, account);
      }
    } catch (e) {
      const err = e as any;
      const errorMsg = err?.message || String(e);
      const detail = err?.detail || '';
      console.error(`[${account.label}] Batch: PDF error for ${student.tc}: ${errorMsg}${detail ? ' (' + detail + ')' : ''}`, e);
      this.trackBatchError(errorMsg, student.tc);
      this.pendingBatchDownload.failed++;
    }

    // Update progress and continue
    const completed = this.pendingBatchDownload.completed;
    const failed = this.pendingBatchDownload.failed;
    const processed = completed + failed;
    this.showBatchProgress(win, `PDF oluşturuluyor... (${processed}/${total}) - Başarılı: ${completed}${failed > 0 ? ', Hatalı: ' + failed : ''}`);

    this.batchProcessNextStudent(win, account);
  }

  private async batchGenerateForStudent(
    lessonData: { studentInfo: any; lessons: string[][] },
    student: { tc: string; name: string },
    account: Account
  ) {
    if (!this.pendingBatchDownload) return;
    const { batchType, outputDir } = this.pendingBatchDownload;

    const studentName = (lessonData.studentInfo['ad-soyad'] || student.name || 'unknown')
      .replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9\s]/g, '')
      .replace(/\s+/g, '_');

    if (batchType === 'direksiyon') {
      const pdfBuffer = await this.generatePdfFromTemplate(lessonData.studentInfo, lessonData.lessons);
      const filename = `direksiyon_${student.tc}_${studentName}.pdf`;
      fs.writeFileSync(path.join(outputDir, filename), pdfBuffer);
      console.log(`[${account.label}] Batch: saved ${filename}`);
      this.pendingBatchDownload.completed++;
      this.logPdf(account, 'direksiyon_takip', 1);

    } else if (batchType === 'simulator') {
      // Extract simulator sessions
      let simulatorSessions = this.extractSimulatorSessions(lessonData.lessons);
      if (simulatorSessions.length === 0) {
        console.log(`[${account.label}] Batch: ${student.tc} - Simülatör dersi bulunamadı`);
        this.trackBatchError('Simülatör dersi bulunamadı', student.tc);
        this.pendingBatchDownload.failed++;
        return;
      }
      // Sort desc by date+time, take top 2
      simulatorSessions.sort((a, b) => {
        const dateA = (a[6] || '').split('/').reverse().join('-');
        const dateB = (b[6] || '').split('/').reverse().join('-');
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        const timeA = (a[7] || '').split('-')[0].trim();
        const timeB = (b[7] || '').split('-')[0].trim();
        return timeB.localeCompare(timeA);
      });
      simulatorSessions = simulatorSessions.slice(0, 2);

      const simType = this.pendingBatchDownload.options.simType || 'both';
      const record = simulatorSessions[0];
      const recordo = simulatorSessions.length >= 2 ? simulatorSessions[1] : null;
      const donem = record?.[0] || 'bilinmeyen';
      const safeDonem = donem.replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9\s\-]/g, '').replace(/\s+/g, '-').trim();

      // Monthly/period-based foldering: outputDir/{period}/{tc}_{name}/
      const periodDir = path.join(outputDir, safeDonem);
      const studentDir = path.join(periodDir, `${student.tc}_${studentName}`);
      if (!fs.existsSync(studentDir)) fs.mkdirSync(studentDir, { recursive: true });

      if (simType === 'sesim' || simType === 'both') {
        const sesimHtml = await this.generateSesimHtml(lessonData.studentInfo, simulatorSessions, account.label);
        const sesimPdf = await this.generatePdfFromHtml(sesimHtml);
        fs.writeFileSync(path.join(studentDir, 'sesim.pdf'), sesimPdf);
      }

      if (simType === 'ana_grup' || simType === 'both') {
        const scenarios = this.getAnagrupScenarios();
        const baseTemplate = await this.fetchSimulatorTemplate('anagrup/anagrup.html');

        for (let i = 0; i < scenarios.length; i++) {
          const html = this.generateAnagrupHtml(baseTemplate, {
            studentName: lessonData.studentInfo['ad-soyad'],
            instructorName: record?.[8] || 'Bilinmeyen',
            date1: record?.[6] || '',
            time1: record?.[7] || '',
            date2: recordo?.[6] || '',
            time2: recordo?.[7] || '',
            donem,
            scenario: scenarios[i],
            accountLabel: account.label,
            isDual: recordo !== null,
          });
          const pdf = await this.generatePdfFromHtml(html);
          const safeName = scenarios[i].replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9 ]/g, '').trim();
          fs.writeFileSync(path.join(studentDir, `${i + 1}_${safeName}.pdf`), pdf);
        }
      }

      // Auto-generate EK4 alongside simulator reports
      const ek4Html = await this.generateEk4Html(
        lessonData.studentInfo['ad-soyad'],
        record?.[4] || '',  // plaka
        record?.[8] || '',  // egitmen
        account.label,
        record?.[6] || '',  // tarih
      );
      const ek4Pdf = await this.generatePdfFromHtml(ek4Html);
      fs.writeFileSync(path.join(studentDir, 'ek4.pdf'), ek4Pdf);

      console.log(`[${account.label}] Batch: simulator + ek4 saved for ${student.tc} in ${safeDonem}`);
      this.pendingBatchDownload.completed++;
      this.logPdf(account, 'simulator_raporu', 1);
    }
  }

  private async generateEk4Html(
    studentName: string,
    plateNumber: string,
    instructorName: string,
    companyName: string,
    examDate: string,
  ): Promise<string> {
    const templateContent = await this.fetchSimulatorTemplate('ek4/ek4.html');
    let html = templateContent;

    // Helper: replace inner text of the FIRST element matching `class="<className>"`
    // (the template uses <td>, <span>, <div> — match any tag, like PHP simple_html_dom find('.x', 0))
    const fillByClass = (className: string, value: string) => {
      const re = new RegExp(`(<([a-z][a-z0-9]*)\\b[^>]*\\bclass="[^"]*\\b${className}\\b[^"]*"[^>]*>)([\\s\\S]*?)(</\\2>)`, 'i');
      html = html.replace(re, `$1${value}$4`);
    };

    fillByClass('kursiyer', studentName);
    fillByClass('plakano', plateNumber);
    fillByClass('egitmen', instructorName);
    fillByClass('companyName', companyName.toUpperCase());
    fillByClass('tarih', examDate);

    // Randomize separator visibility (matches PHP saveek4):
    //   1) Add `hidden` class to every .sep element (template ships with `hidden` already,
    //      but re-applying is safe and idempotent).
    //   2) Pick one of 4 groups at random and remove `hidden` from sepN in that group.
    // Template CSS already defines `.hidden{ display:none; }` so no inline styles needed.
    html = html.replace(/class="sep sep(\d+)(?!\s*hidden)([^"]*)"/g, (_m, num, rest) => {
      return `class="sep sep${num}${rest} hidden"`.replace(/\s+/g, ' ');
    });

    const groups = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['10', '11', '12', '13'],
    ];
    const selectedGroup = groups[Math.floor(Math.random() * groups.length)];

    for (const num of selectedGroup) {
      // Remove ` hidden` (and collapse spaces) from the chosen sepN classes
      const re = new RegExp(`class="sep sep${num}([^"]*)\\s+hidden([^"]*)"`, 'g');
      html = html.replace(re, (_m, before, after) => `class="sep sep${num}${(before + after).replace(/\s+/g, ' ').trimEnd()}"`);
    }

    return html;
  }

  private async batchProcessNextStudent(win: BrowserWindow, account: Account) {
    if (!this.pendingBatchDownload) return;

    this.pendingBatchDownload.currentStudentIndex++;
    const { students, currentStudentIndex } = this.pendingBatchDownload;

    if (currentStudentIndex >= students.length) {
      // All students processed
      const { completed, failed, notFound, outputDir, batchType } = this.pendingBatchDownload;
      const actualErrors = failed - notFound; // errors other than not found
      const titles: Record<string, string> = { direksiyon: 'Çoklu Direksiyon Takip', simulator: 'Çoklu Simülatör Raporu' };

      // Build message: "XX PDF oluşturuldu, XX bulunamadı, XX hatalı"
      let statusMsg = `Tamamlandı! ${completed} PDF oluşturuldu`;
      if (notFound > 0) statusMsg += `, ${notFound} bulunamadı`;
      if (actualErrors > 0) statusMsg += `, ${actualErrors} hatalı`;

      console.log(`[${account.label}] Batch ${batchType}: completed! ${completed} success, ${notFound} not found, ${actualErrors} errors`);
      this.showBatchProgress(win, statusMsg, '#00cc66');

      const errorSummary = this.formatBatchErrorSummary();
      const dialogMsg = `${completed} PDF oluşturuldu${notFound > 0 ? ', ' + notFound + ' bulunamadı' : ''}${actualErrors > 0 ? ', ' + actualErrors + ' hatalı' : ''}.`;
      const detailText = errorSummary
        ? `Klasör: ${outputDir}\n\nHatalar:\n${errorSummary}`
        : `Klasör: ${outputDir}`;

      this.clearPendingBatchDownload();
      this.pendingDownloadPhase = null;

      // Auto-hide the top bar after 8 seconds
      setTimeout(() => { this.hideBatchStatus(win); }, 8000);

      // Show completion dialog
      dialog.showMessageBox(win, {
        type: 'info',
        title: titles[batchType] || 'Çoklu İndirme',
        message: dialogMsg,
        detail: detailText,
        buttons: ['Tamam'],
      }).catch(() => {});
      return;
    }

    // Navigate to skt02009 for the next student
    // Reload skt02009 page to get a fresh form
    this.pendingDownloadPhase = 'batch-skt02009-navigate';
    await win.webContents.executeJavaScript(`
      window.location.href = window.location.pathname;
    `).catch(() => {});
  }

  private showBatchProgress(win: BrowserWindow, message: string, color?: string) {
    if (this.pendingBatchDownload) {
      this.pendingBatchDownload.statusMessage = message;
    }
    const safeMsg = message.replace(/'/g, "\\'").replace(/\n/g, ' ');
    const bgColor = color || '#4361ee';
    if (!win.isDestroyed()) {
      win.webContents.executeJavaScript(`
        (function() {
          let bar = document.getElementById('mebbis-batch-status-bar');
          if (!bar) {
            bar = document.createElement('div');
            bar.id = 'mebbis-batch-status-bar';
            document.body.appendChild(bar);
          }
          bar.style.cssText = 'position: fixed; top: 0; left: 200px; right: 0; z-index: 999999; background: #1a1a2e; color: ${bgColor}; padding: 10px 20px; font-size: 13px; font-weight: bold; text-align: center; font-family: Arial, sans-serif; border-bottom: 2px solid ${bgColor}; box-shadow: 0 2px 8px rgba(0,0,0,0.4);';
          bar.textContent = '${safeMsg}';
          // Also update modal progress if it exists
          const progress = document.getElementById('batch-progress');
          if (progress) {
            progress.style.display = 'block';
            progress.style.cssText = 'display: block; margin-top: 16px; padding: 10px; border-radius: 4px; background: #16213e; color: ${bgColor}; font-size: 13px; text-align: center;';
            progress.textContent = '${safeMsg}';
          }
        })();
      `).catch(() => {});
    }
  }

  private hideBatchStatus(win: BrowserWindow) {
    if (!win.isDestroyed()) {
      win.webContents.executeJavaScript(`
        (function() {
          const bar = document.getElementById('mebbis-batch-status-bar');
          if (bar) bar.remove();
        })();
      `).catch(() => {});
    }
  }

  private reinjectBatchStatus(win: BrowserWindow) {
    if (this.pendingBatchDownload && this.pendingBatchDownload.statusMessage) {
      this.showBatchProgress(win, this.pendingBatchDownload.statusMessage);
    }
  }

  // ==================== END BATCH DİREKSİYON / SİMÜLATÖR ====================

  stopAll() {
    console.log('Stopping all accounts and flushing cookies...');
    for (const [id] of this.running) {
      const partition = `persist:mebbis-${id}`;
      const ses = session.fromPartition(partition);
      ses.cookies.flushStore().catch(() => {});
      this.stop(id);
    }
  }


  /**
   * Generate a K-Belgesi preview window from user-supplied form data,
   * then allow the user to print or cancel.
   */
  private async generateKBelgesiPdf(data: Record<string, string>, parentWin: BrowserWindow): Promise<void> {
    let html: string;
    try {
      html = await fetchEncryptedTemplate('k-belgesi/k-belgesi.html');
    } catch (e: any) {
      console.error('[K-Belgesi] Failed to fetch template:', e?.message ?? e);
      return;
    }

    const previewChrome = `<style id="kb-preview-chrome">
  @media screen {
    body { background: #e5e7eb !important; }
    #kb-toolbar { position: fixed; top: 12px; right: 12px; background: #1f2937; color: white; padding: 8px 12px; border-radius: 6px; display: flex; gap: 8px; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 999999; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 13px; }
    #kb-toolbar .label { margin-right: 6px; opacity: 0.85; }
    #kb-toolbar button { padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 13px; font-family: inherit; }
    #kb-cancel { border: 1px solid #6b7280; background: transparent; color: white; }
    #kb-cancel:hover { background: rgba(255,255,255,0.08); }
    #kb-print { border: none; background: #3b82f6; color: white; font-weight: 600; }
    #kb-print:hover { background: #2563eb; }
  }
  @media print { #kb-toolbar { display: none !important; } }
</style>
<div id="kb-toolbar">
  <span class="label">A4 · 100% · kenarlıksız</span>
  <button id="kb-cancel">İptal</button>
  <button id="kb-print">Yazdır</button>
</div>
<script>(function(){
  var data = ${JSON.stringify(data)};
  Object.keys(data).forEach(function(k){
    var el = document.querySelector('.cvp.' + k);
    if (el) el.textContent = data[k];
  });
  document.getElementById('kb-cancel').onclick = function(){ document.title = 'KB_CLOSE'; };
  document.getElementById('kb-print').onclick = function(){ document.title = 'KB_PRINT'; };
})();</script>`;

    const mergedHtml = html.replace('</body>', previewChrome + '</body>');

    const previewWin = new BrowserWindow({
      parent: parentWin,
      width: 900,
      height: 1180,
      title: 'K Belgesi — Önizleme',
      autoHideMenuBar: true,
      webPreferences: { sandbox: false, contextIsolation: false },
    });

    await previewWin.loadURL('about:blank');
    await previewWin.webContents.executeJavaScript(
      `document.open(); document.write(${JSON.stringify(mergedHtml)}); document.close();`,
    );

    let printing = false;
    previewWin.webContents.on('page-title-updated', (_event, title) => {
      if (previewWin.isDestroyed()) return;
      if (title === 'KB_PRINT' && !printing) {
        printing = true;
        previewWin.webContents.print(
          {
            silent: false,
            printBackground: true,
            margins: { marginType: 'none' },
            pageSize: 'A4',
            scaleFactor: 100,
          },
          (success, failureReason) => {
            if (!success) console.warn('[K-Belgesi] Print failed:', failureReason);
            if (!previewWin.isDestroyed()) previewWin.close();
          },
        );
      } else if (title === 'KB_CLOSE') {
        previewWin.close();
      }
    });
  }


}
