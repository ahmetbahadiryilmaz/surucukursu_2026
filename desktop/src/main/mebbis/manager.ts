import { BrowserWindow, session } from 'electron';
import { Account } from '../storage/account-store';
import { getCodeLoader } from '../../launcher/remote-code-loader';
import { OPEN_DEVTOOLS_IN_DEV, IS_DEV } from '../../launcher/config';
import { getRequestLogger } from '../utils/request-logger';
import { updateCarRoute } from '../sync/car-sync';
import { updateKurumRoute, fetchKurumInfo } from '../sync/kurum-info-sync';
import { updateStudentPersonal } from '../sync/student-sync';
import { getStudentDb } from '../storage/student-db';
import type { RemoteKurumInfo, RemoteCar } from '../api/api-client';
import * as sidebarUi from './sidebar';
import * as pdfRender from './pdf-render';
import * as downloadBatch from './download-batch';
import * as downloadSingle from './download-single';
import * as studentFlows from './student-flows';
import * as personnelFlows from './personnel-flows';
import * as kurumFlows from './kurum-flows';
import * as store from './store';
import { RunningAccount, PERIOD_HELPERS_JS } from './constants';
export { PERIOD_HELPERS_JS };

export class MebbisManager {
  running: Map<string, RunningAccount> = new Map();
  loginAttempts: Map<string, number> = new Map();
  autoRefreshIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  activityLogger: ((accountId: string, pdfType: 'direksiyon_takip' | 'simulator_raporu', count: number) => void) | null = null;
  batchStateListener: ((inProgress: boolean) => void) | null = null;

  // Pending "open student" navigation triggered from sidebar Details button
  pendingOpenStudent: Map<string, { tc: string; phase: 'skt-module' | 'skt02009' }> = new Map();

  // Personnel-update navigation: when the user clicks "Güncelle" we set this
  // flag, navigate to OOK's home (ook00001) to establish the OOK module
  // session, then auto-navigate to ook12001 on home-page load. A direct hop
  // to ook12001 from elsewhere in MEBBIS bounces back to ook00001, so the
  // two-step is mandatory.
  pendingPersonnelUpdate: Set<string> = new Set();

  // Tracks accounts where the auto-Ara click has already been fired on
  // ook12001 this update cycle, preventing infinite reload loops when the
  // grid is initially empty and needs the "Aç" filter applied.
  personnelAutoSearched: Set<string> = new Set();

  // Kurum-update navigation: when the user clicks "Güncelle" in the Kurum
  // modal we set this flag, navigate to skt01001 (the MTSK "Kurum Bilgileri"
  // page), and force a re-scrape on load. skt01001 lives in the MTSK module,
  // so if the window is currently inside the OOK module a direct navigation
  // bounces back — we click "Modül Çıkış" first, mirroring the personnel flow.
  pendingKurumUpdate: Set<string> = new Set();

  // K Belgesi auto-fetch flow: when the user types a TC into K Belgesi that
  // is not in the local student cache, we navigate skt02009 to scrape that
  // student's detail. accountId → expected TC. Cleared on detail-load
  // (either the form is blank → toast "MEBBIS'te bulunamadı" or matches →
  // calls `window.__openKBelgesi(tc)` to re-open the form prefilled).
  pendingKbFetch: Map<string, string> = new Map();

  // Accounts whose currently-open window is a Local Test window (opened via
  // startLocalTest, no MEBBIS login). Used so the sidebar can disable the
  // Güncelle/Detay buttons that require live MEBBIS navigation, while the
  // Kurum Güncelle (pure backend re-fetch) stays functional.
  localTestAccounts: Set<string> = new Set();

  // Cached Kurum Bilgisi per account, populated by a fire-and-forget fetch
  // from the backend on the first pushStoreToSidebar call. The sidebar reads
  // this via window.__mebbisStore.kurumInfo to render the "Kurum" modal.
  kurumInfoCache: Map<string, RemoteKurumInfo> = new Map();
  // Tracks accounts with an in-flight fetch so we don't fire it repeatedly.
  kurumInfoFetching: Set<string> = new Set();

  // Cars (plates + routes) per account, fetched once per account on first
  // pushStoreToSidebar. The K-Belgesi form reads store.cars to pre-fill
  // güzergah from the matched vehicle's saved route.
  carsCache: Map<string, RemoteCar[]> = new Map();
  carsFetching: Set<string> = new Set();

  // Öğrenciler "Güncelle" toplu listele flow: when the user clicks Güncelle
  // in the sidebar Öğrenciler modal we set this flag, navigate to skt02006,
  // and on load show a filter dialog (dönem/durum/grup/şube). Submitting the
  // dialog re-POSTs the form; the resulting list page is parsed by the
  // passive skt02006 branch in the page-load handler.
  pendingStudentUpdate: Set<string> = new Set();

  // Sequential batch detail scraping state: after the personnel list is
  // ingested from ook12001 we click each row's "Aç" button one at a time,
  // visit ook12002, and scrape full detail fields. This holds the in-flight
  // batch (account-scoped) so navigation handlers can resume after each hop.
  pendingPersonnelBatchDetail: {
    accountId: string;
    totalRows: number;
    currentIndex: number;
    formState: Record<string, string>;
  } | null = null;

  // Accounts that have completed a full detail batch this session. Cleared
  // when the user requests a fresh Güncelle so the next ook12001 visit
  // re-scrapes everything.
  personnelBatchDetailDone: Set<string> = new Set();

  // Demo subscription gating: cap tekli at 5 (toplu blocked entirely)
  static readonly DEMO_PDF_LIMIT = 5;
  demoSessionUsage: Map<string, number> = new Map();

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

  clearPendingBatchDownload(): void {
    if (this.pendingBatchDownload === null) return;
    this.pendingBatchDownload = null;
    try { this.batchStateListener?.(false); } catch { /* ignore */ }
  }

  logPdf(account: Account, pdfType: 'direksiyon_takip' | 'simulator_raporu', count = 1) {
    try {
      this.activityLogger?.(account.id, pdfType, count);
    } catch { /* fire-and-forget */ }
    if (this.isDemoAccount(account)) {
      const cur = this.demoSessionUsage.get(account.id) ?? 0;
      this.demoSessionUsage.set(account.id, cur + count);
    }
  }

  isDemoAccount(account: Account): boolean {
    return account.subscription?.type === 'demo';
  }

  isDemoLimitReached(account: Account): boolean {
    if (!this.isDemoAccount(account)) return false;
    const baseline = account.subscription?.pdfPrintUsed ?? 0;
    const session = this.demoSessionUsage.get(account.id) ?? 0;
    return baseline + session >= MebbisManager.DEMO_PDF_LIMIT;
  }

  async showDemoSingleBlocked(win: BrowserWindow) {
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

  async showDemoBatchBlocked(win: BrowserWindow) {
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

    // Fresh start — clear any stale login-attempt count from a prior session
    // (e.g. previous window closed via X button without going through stop()).
    this.loginAttempts.delete(account.id);

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

    if (IS_DEV && OPEN_DEVTOOLS_IN_DEV) {
      win.webContents.openDevTools({ mode: 'detach' });
    }

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
      if (message.startsWith('MEBBIS_SAVE_KURUM_ROUTE:')) {
        try {
          const { route } = JSON.parse(message.replace('MEBBIS_SAVE_KURUM_ROUTE:', '').trim());
          updateKurumRoute(route).then(() => {
            const info = this.kurumInfoCache.get(account.id);
            if (info) (info as any).kurum_route = route;
            console.log(`[${account.label}] Kurum route saved: "${route}"`);
          });
        } catch (e) {
          console.error(`[${account.label}] MEBBIS_SAVE_KURUM_ROUTE parse error:`, e);
        }
      }
      if (message.startsWith('MEBBIS_SAVE_STUDENT_PERSONAL:')) {
        try {
          const payload = JSON.parse(message.replace('MEBBIS_SAVE_STUDENT_PERSONAL:', '').trim());
          const { tc, ...fields } = payload;
          if (tc && /^\d{11}$/.test(tc)) {
            // Local cache patch (sidebar refreshes immediately)
            const ok = getStudentDb().updatePersonal(account.id, tc, fields);
            if (ok) this.pushStoreToSidebar(win, account);
            // Remote PATCH
            updateStudentPersonal(tc, fields).then(() => {
              console.log(`[${account.label}] Student personal saved: tc=${tc} ${JSON.stringify(fields)}`);
            });
          }
        } catch (e) {
          console.error(`[${account.label}] MEBBIS_SAVE_STUDENT_PERSONAL parse error:`, e);
        }
      }
      if (message === 'MEBBIS_REQUEST_KURUM_UPDATE') {
        console.log(`[KurumUpdate][${account.label}] Güncelle requested`);
        this.pendingKurumUpdate.add(account.id);
        const currentURL = win.webContents.getURL();
        const lowerURL = currentURL.toLowerCase();
        if (lowerURL.includes('skt01001')) {
          // Already on the Kurum Bilgileri page — re-scrape in place, no nav.
          console.log(`[KurumUpdate][${account.label}] Already on skt01001 — re-scraping in place`);
          this.pendingKurumUpdate.delete(account.id);
          this.parseAndPushKurumInfo(win, account, true);
        } else if (lowerURL.includes('/ookgm/')) {
          // Inside the OOK module — a direct SKT navigation bounces back. Click
          // "Modül Çıkış" first so the skt01001 loadURL on the next page-load
          // sticks (same two-step the personnel flow uses for MTSK→OOK).
          console.log(`[KurumUpdate][${account.label}] In OOK module — clicking Modül Çıkış`);
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
              console.log('[MEBBIS] Modül Çıkış not found, falling back to direct skt01001 navigation');
              return false;
            })();
          `).then((clicked: boolean) => {
            if (!clicked) {
              win.loadURL('https://mebbis.meb.gov.tr/SKT/skt01001.aspx').catch((e) => {
                console.error(`[KurumUpdate][${account.label}] skt01001 fallback failed:`, e);
                this.pendingKurumUpdate.delete(account.id);
              });
            }
          }).catch(() => {
            win.loadURL('https://mebbis.meb.gov.tr/SKT/skt01001.aspx').catch(() => {});
          });
        } else {
          // Portal or another MTSK page — a direct navigation into skt01001
          // works (the download flow proves direct SKT navigation sticks).
          win.loadURL('https://mebbis.meb.gov.tr/SKT/skt01001.aspx').catch((e) => {
            console.error(`[KurumUpdate][${account.label}] loadURL skt01001 failed:`, e);
            this.pendingKurumUpdate.delete(account.id);
          });
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
      } else if (currentURL.toLowerCase().includes('skt01001')) {
        // Kurum Bilgileri page. A pending "Güncelle" forces a re-scrape; a
        // plain user visit scrapes passively (once per session) so the Kurum
        // modal and K Belgesi form auto-populate.
        const forced = this.pendingKurumUpdate.has(account.id);
        this.pendingKurumUpdate.delete(account.id);
        this.hideStatus(win);
        this.injectLeftMenu(win, account);
        this.parseAndPushKurumInfo(win, account, forced);
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
      } else if (currentURL.toLowerCase().includes('main.aspx') && this.pendingKurumUpdate.has(account.id)) {
        // Modül Çıkış landed us on the portal — chain to skt01001. The next
        // page-load reaches the skt01001 branch above which runs the scrape.
        console.log(`[KurumUpdate][${account.label}] Main portal loaded after Modül Çıkış, navigating to skt01001`);
        this.injectLeftMenu(win, account);
        win.loadURL('https://mebbis.meb.gov.tr/SKT/skt01001.aspx').catch((e) => {
          console.error(`[KurumUpdate][${account.label}] skt01001 from main failed:`, e);
          this.pendingKurumUpdate.delete(account.id);
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

  async autoFillLogin(win: BrowserWindow, account: Account) {
    if (win.isDestroyed()) return;
    console.log(`[${account.label}] Injecting auto-fill script...`);

    // Hardcoded fallback used when the remote script is not yet cached.
    // Placeholders __USERNAME__ / __PASSWORD__ are substituted by runScriptOrFallback.
    // (The remote script also expects __SUBMIT__ / __READONLY__ — see the call below.)
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

    // SUBMIT/READONLY must be passed: the remote auto-fill-login.js references
    // __SUBMIT__ and __READONLY__. Any placeholder not supplied here is left as
    // a bare identifier in the injected script, which throws a ReferenceError
    // and silently aborts the whole auto-fill (login appears stuck on "TRYING
    // LOGIN..."). SUBMIT=true → fill + submit; READONLY=false → fields editable.
    await getCodeLoader().runScriptOrFallback(win, 'scripts/auto-fill-login.js', fallback, {
      USERNAME: account.username,
      PASSWORD: account.password,
      SUBMIT: true,
      READONLY: false,
    });
    console.log(`[${account.label}] Auto-fill script executed`);
  }

  showStatus(win: BrowserWindow, message: string, color: string) {
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

  hideStatus(win: BrowserWindow) {
    const fallback = `
      (function() {
        const statusBar = document.getElementById('mebbis-status-bar');
        if (statusBar) statusBar.style.display = 'none';
      })();
    `;

    void getCodeLoader().runScriptOrFallback(win, 'scripts/hide-status.js', fallback);
  }

  /** skt02009 detail scrape — captures full student record. */
  parseAndLogStudentPage(win: BrowserWindow, account: Account): void {
    return studentFlows.parseAndLogStudentPage(this, win, account);
  }

  /** skt02006 list scrape — bulk-ingests basic records for many students. */
  parseAndIngestStudentList(win: BrowserWindow, account: Account): void {
    return studentFlows.parseAndIngestStudentList(this, win, account);
  }

  /** skt04002 ddlPersonel scrape — extracts personnel/staff into the local DB. */
  parseAndIngestPersonnelList(win: BrowserWindow, account: Account): void {
    return personnelFlows.parseAndIngestPersonnelList(this, win, account);
  }

  /** skt01001 scrape — kurum header + Programlar/Araç grids → backend store. */
  parseAndPushKurumInfo(win: BrowserWindow, account: Account, force: boolean): void {
    return kurumFlows.parseAndPushKurumInfo(this, win, account, force);
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
  parseAndIngestPersonnelListOok(win: BrowserWindow, account: Account): void {
    return personnelFlows.parseAndIngestPersonnelListOok(this, win, account);
  }

  /**
   * Trigger the ASP.NET postback for the Nth row of the dgPersonelArama grid.
   * Row 0 fires `__doPostBack` directly because we are still on the ook12001
   * results page. Subsequent rows have already navigated to ook12002, so we
   * synthesise a form POST back to ook12001 using the VIEWSTATE captured from
   * the original results page (`pendingPersonnelBatchDetail.formState`).
   */
  triggerPersonnelAcPostback(win: BrowserWindow, account: Account, index: number): void {
    return personnelFlows.triggerPersonnelAcPostback(this, win, account, index);
  }

  /**
   * Scrape detail fields from a loaded ook12002 page (one personel), persist
   * via PersonnelDb.ingestDetail, push the detail to the backend, then advance
   * the batch index. When the batch finishes, mark the account as done so a
   * re-visit to ook12001 in this session does not re-trigger the scrape.
   */
  scrapePersonnelDetail(win: BrowserWindow, account: Account): void {
    return personnelFlows.scrapePersonnelDetail(this, win, account);
  }

  serializeStore(account: Account) {
    return store.serializeStore(this, account);
  }

  pushStoreToSidebar(win: BrowserWindow, account: Account): void {
    return store.pushStoreToSidebar(this, win, account);
  }

  openStudent(win: BrowserWindow, account: Account, tc: string): void {
    return studentFlows.openStudent(this, win, account, tc);
  }

  fillTcAndSubmit(win: BrowserWindow, tc: string): void {
    return studentFlows.fillTcAndSubmit(this, win, tc);
  }

  async injectLeftMenu(win: BrowserWindow, account: Account) {
    return sidebarUi.injectLeftMenu(this, win, account);
  }

  async injectStoreSidebarSections(win: BrowserWindow, account: Account): Promise<void> {
    return sidebarUi.injectStoreSidebarSections(this, win, account);
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
    this.localTestAccounts.add(account.id);

    win.on('closed', () => {
      this.running.delete(account.id);
      this.localTestAccounts.delete(account.id);
      if (parentWindow && !parentWindow.isDestroyed()) {
        parentWindow.webContents.send('account:stopped', account.id);
      }
    });

    win.once('ready-to-show', () => win.show());

    // Local test mode has no MEBBIS session, so the full page-load /
    // console-message machinery from createMebbisWindow is not wired up.
    // Kurum "Güncelle" is the one update that needs no MEBBIS navigation
    // (it just re-fetches from the backend), so handle that single message
    // here. Öğrenciler/Personeller Güncelle stay disabled — see the
    // localTest flag passed to injectStoreSidebarSections.
    win.webContents.on('console-message', (_event, _level, message) => {
      if (message === 'MEBBIS_REQUEST_KURUM_UPDATE') {
        console.log(`[LocalTest][${account.label}] Kurum update requested — re-fetching from backend`);
        fetchKurumInfo().then((info) => {
          if (info) {
            this.kurumInfoCache.set(account.id, info);
            console.log(`[LocalTest][${account.label}] Kurum info refreshed from backend`);
          } else {
            console.log(`[LocalTest][${account.label}] Kurum info fetch returned null`);
          }
          if (!win.isDestroyed()) this.pushStoreToSidebar(win, account);
        });
      }
    });

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

  isLoginPage(url: string): boolean {
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
  isPreAuthPage(url: string): boolean {
    const lower = url.toLowerCase();
    return lower.includes('default.aspx') || lower.includes('redirect.aspx');
  }

  async saveResponse(win: BrowserWindow, account: Account, url: string) {
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

  async downloadDireksiyonTakip(tc: string, _partition: string, account: Account, parentWin: BrowserWindow, sinif?: string) {
    return downloadSingle.downloadDireksiyonTakip(this, tc, _partition, account, parentWin, sinif);
  }

  async clickMenuItemForSkt02009(win: BrowserWindow, account: Account) {
    return downloadSingle.clickMenuItemForSkt02009(this, win, account);
  }

  async handleSktModuleLoaded(win: BrowserWindow, account: Account) {
    return downloadSingle.handleSktModuleLoaded(this, win, account);
  }

  pendingDownload: { tc: string; sinif: string; account: Account; parentWin: BrowserWindow } | null = null;
  pendingDownloadPhase:
    'skt-module' | 'navigate' | 'search' | 'navigate-simulator' | 'search-simulator' |
    'batch-skt-module' | 'batch-navigate-skt02006' | 'batch-skt02006-options' |
    'batch-skt02006-results' | 'batch-skt02009-navigate' | 'batch-skt02009-results' | null = null;

  pendingBatchDownload: {
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

  async handleSkt02009Loaded(win: BrowserWindow, account: Account) {
    return downloadSingle.handleSkt02009Loaded(this, win, account);
  }

  async handleSkt02009Results(win: BrowserWindow, account: Account) {
    return downloadSingle.handleSkt02009Results(this, win, account);
  }

  async handleSkt02009SimulatorLoaded(win: BrowserWindow, account: Account) {
    return downloadSingle.handleSkt02009SimulatorLoaded(this, win, account);
  }

  async handleSkt02009SimulatorResults(win: BrowserWindow, account: Account) {
    return downloadSingle.handleSkt02009SimulatorResults(this, win, account);
  }

  fetchSimulatorTemplate(templateName: string): Promise<string> {
    return pdfRender.fetchSimulatorTemplate(this, templateName);
  }

  async generatePdfFromHtml(html: string): Promise<Buffer> {
    return pdfRender.generatePdfFromHtml(this, html);
  }

  async generatePdfFromTemplate(
    studentInfo: { 'ad-soyad': string; 'tc-kimlik-no': string; 'istenen-sertifika': string },
    lessons: string[][],
    sinif?: string
  ): Promise<Buffer> {
    return pdfRender.generatePdfFromTemplate(this, studentInfo, lessons, sinif);
  }

  async handleSimulationReport(tc: string, simulationType: string, account: Account, parentWin: BrowserWindow) {
    return downloadSingle.handleSimulationReport(this, tc, simulationType, account, parentWin);
  }

  /**
   * Extract simulator sessions from lesson records
   * Returns only lessons where ders_yeri contains "Simulatör" or "Direksiyon Eğitim Alanı"
   */
  extractSimulatorSessions(lessons: string[][]): string[][] {
    return pdfRender.extractSimulatorSessions(this, lessons);
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
    return pdfRender.generateSimulatorReportPdf(this, studentInfo, simulatorSessions, simulationType, account, parentWindow);
  }

  /**
   * Generate Sesim HTML from template with session data
   * Matches PHP sesimkaydet() for single session, sesimkaydet2() for dual sessions
   * Generates 16 timing rows with 6-min intervals (8-min for rows 8 and 16)
   * +18min break gap at row 8 for single session, switches to session 2 for dual
   */
  async generateSesimHtml(
    studentInfo: any,
    sessions: string[][],
    accountLabel: string
  ): Promise<string> {
    return pdfRender.generateSesimHtml(this, studentInfo, sessions, accountLabel);
  }

  generateAnagrupHtml(
    baseTemplate: string,
    data: {
      studentName: string; instructorName: string;
      date1: string; time1: string; date2: string; time2: string;
      donem: string; scenario: string; accountLabel: string; isDual: boolean;
    }
  ): string {
    return pdfRender.generateAnagrupHtml(this, baseTemplate, data);
  }

  /**
   * Get list of anagrup scenarios
   */
  getAnagrupScenarios(): string[] {
    return pdfRender.getAnagrupScenarios(this);
  }

  pendingSimulatorReport: { tc: string; simulationType: string; account: Account } | null = null;

  fetchTemplate(templateName: string): Promise<string> {
    return pdfRender.fetchTemplate(this, templateName);
  }

  // ==================== BATCH DİREKSİYON TAKİP / SİMÜLATÖR ====================

  trackBatchError(errorMessage: string, studentTc: string) {
    return downloadBatch.trackBatchError(this, errorMessage, studentTc);
  }

  formatBatchErrorSummary(): string {
    return downloadBatch.formatBatchErrorSummary(this);
  }

  async handleBatchDireksiyon(account: Account, parentWin: BrowserWindow) {
    return downloadBatch.handleBatchDireksiyon(this, account, parentWin);
  }

  async handleBatchGeneric(batchType: 'direksiyon' | 'simulator', account: Account, parentWin: BrowserWindow) {
    return downloadBatch.handleBatchGeneric(this, batchType, account, parentWin);
  }

  async clickMenuItemForSkt02006(win: BrowserWindow, account: Account) {
    return downloadBatch.clickMenuItemForSkt02006(this, win, account);
  }

  async handleSkt02006Options(win: BrowserWindow, account: Account) {
    return downloadBatch.handleSkt02006Options(this, win, account);
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
  async handleStudentUpdateOptions(win: BrowserWindow, account: Account): Promise<void> {
    return studentFlows.handleStudentUpdateOptions(this, win, account);
  }

  /**
   * Submits the skt02006 filter form for the student-update flow. The
   * resulting page load is caught by the passive skt02006 branch in the
   * page-load handler, which runs parseAndIngestStudentList (already wired
   * to push to the backend). Clears the pending flag so subsequent visits
   * behave normally.
   */
  async submitStudentUpdateForm(
    win: BrowserWindow,
    options: { donemi: string; ogrenciDurumu: string; onayDurumu: string; grubu: string; subesi: string },
  ): Promise<void> {
    return studentFlows.submitStudentUpdateForm(this, win, options);
  }

  async handleBatchStart(
    options: { donemi: string; ogrenciDurumu: string; onayDurumu: string; grubu: string; subesi: string; simType?: string },
    account: Account,
    win: BrowserWindow
  ) {
    return downloadBatch.handleBatchStart(this, options, account, win);
  }

  async submitSkt02006Form(
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

  async handleSkt02006Results(win: BrowserWindow, account: Account) {
    return downloadBatch.handleSkt02006Results(this, win, account);
  }

  async handleBatchStudentNavigate(win: BrowserWindow, account: Account) {
    return downloadBatch.handleBatchStudentNavigate(this, win, account);
  }

  async handleBatchStudentResults(win: BrowserWindow, account: Account) {
    return downloadBatch.handleBatchStudentResults(this, win, account);
  }

  async batchGenerateForStudent(
    lessonData: { studentInfo: any; lessons: string[][] },
    student: { tc: string; name: string },
    account: Account
  ) {
    return downloadBatch.batchGenerateForStudent(this, lessonData, student, account);
  }

  async generateEk4Html(
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

  async batchProcessNextStudent(win: BrowserWindow, account: Account) {
    return downloadBatch.batchProcessNextStudent(this, win, account);
  }

  showBatchProgress(win: BrowserWindow, message: string, color?: string) {
    return downloadBatch.showBatchProgress(this, win, message, color);
  }

  hideBatchStatus(win: BrowserWindow) {
    return downloadBatch.hideBatchStatus(this, win);
  }

  reinjectBatchStatus(win: BrowserWindow) {
    return downloadBatch.reinjectBatchStatus(this, win);
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
  async generateKBelgesiPdf(data: Record<string, string>, parentWin: BrowserWindow): Promise<void> {
    return pdfRender.generateKBelgesiPdf(this, data, parentWin);
  }


}
