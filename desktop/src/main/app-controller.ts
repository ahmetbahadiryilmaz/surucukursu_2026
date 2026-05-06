/**
 * AppController
 * ─────────────
 * Remoted entry point — bundled by `scripts/build-remote.js` into
 * `remote-code/main/app-bundle.js` and loaded into memory at runtime by
 * the bootstrap. Everything in this module is replaceable via a
 * remote-code deploy without rebuilding the exe.
 *
 * Runtime model
 *   - Exports a single `start(ctx)` entry point.
 *   - The bootstrap calls `start(ctx)` once per process. ctx supplies
 *     bootstrap-only services (RemoteCodeLoader singleton, autoUpdater,
 *     device-id, computed renderer URL/preload path, app version).
 *   - All other dependencies (`./auth-store`, `./mebbis-manager`, etc.)
 *     are bundled via esbuild into the same artifact.
 *
 * What this owns
 *   - IPC handler registration (auth, accounts, profile, dev-only PDFs)
 *   - Main BrowserWindow lifecycle
 *   - Application menu (Hakkında + hidden Test menu while Shift is held)
 *   - About / PDF / What's-New dialogs
 *   - App-level event handlers (window-all-closed, before-quit, activate)
 */

import { app, BrowserWindow, ipcMain, session, Menu, dialog, shell } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import { Account, SimulatorType } from './account-store';
import { AuthStore } from './auth-store';
import { configureStudentSync, pullAll as pullStudentSync } from './student-sync';
import { MebbisManager } from './mebbis-manager';
import { apiClient, MebbisAccount, ActivityLogBody } from './api-client';
import { getCodeLoader } from '../launcher/remote-code-loader';
import type { VersionCheckResult } from '../launcher/auto-updater';

type RemoteCodeLoader = ReturnType<typeof getCodeLoader>;

export interface BootstrapContext {
  /** Installed-app version string (from package.json). */
  appVersion: string;
  /** True when running unpackaged (dev mode). */
  isDev: boolean;
  /** URL the main BrowserWindow should load. file:// in dev, mtsk-ui:// in prod. */
  rendererIndexUrl: string;
  /** Absolute path to the compiled preload script. */
  preloadPath: string;

  // Bootstrap singletons / utilities
  codeLoader: RemoteCodeLoader;
  setupAutoUpdater: (win: BrowserWindow | null) => void;
  fetchVersionCheck: (version: string) => Promise<VersionCheckResult>;
  showWhatsNewIfUpdated: (win: BrowserWindow) => void;
  getPendingWhatsNew: () => { version: string; lines: string[] } | null;
  markWhatsNewSeen: () => void;
  getDeviceId: () => string;
}

export interface AppControllerHandle {
  mainWindow: BrowserWindow;
}

export async function start(ctx: BootstrapContext): Promise<AppControllerHandle> {
  const authStore = new AuthStore();
  const mebbisManager = new MebbisManager();

  // Wire the student-sync HTTP client. Account-id resolver returns null;
  // sync calls receive the explicit account.id from MebbisManager scrape paths.
  configureStudentSync(() => authStore.getToken(), () => null);

  // If we already have a valid token from a previous session, pull on boot.
  if (authStore.getToken()) {
    pullStudentSync().catch((e) => console.error('[StudentSync] Boot pull failed:', e));
  }

  let mainWindow: BrowserWindow | null = null;
  let isShiftHeld = false;

  // ── Helpers ─────────────────────────────────────────────────────

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

  function logActivity(body: ActivityLogBody) {
    const token = authStore.getToken();
    if (!token) return;
    apiClient.logActivity(token, body).catch(() => { /* ignore */ });
  }

  function createMainWindow(): BrowserWindow {
    const win = new BrowserWindow({
      width: 900,
      height: 700,
      minWidth: 700,
      minHeight: 500,
      title: 'MEBBIS Account Manager',
      webPreferences: {
        preload: ctx.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    win.loadURL(ctx.rendererIndexUrl);
    win.on('closed', () => {
      if (mainWindow === win) mainWindow = null;
    });
    return win;
  }

  function rebuildAppMenu() {
    const items: MenuItemConstructorOptions[] = [
      { label: 'Hakkında', click: showAboutDialog },
    ];
    if (isShiftHeld) {
      items.push({
        label: '🧪 Test',
        submenu: [
          { label: 'Direksiyon Takip PDF…', click: showDireksiyonPdfDialog },
          { label: 'Simülasyon Raporu PDF…', click: showSimulatorPdfDialog },
          { type: 'separator' },
          { label: '👥 Öğrenciler (örnek)', click: () => showFakeListDialog('students') },
          { label: '🚗 Araçlar (örnek)', click: () => showFakeListDialog('cars') },
        ],
      });
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate(items));
  }

  async function showAboutDialog() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const installedVer = ctx.appVersion;

    let remoteVer = '';
    try {
      await ctx.codeLoader.sync({ force: true });
      const fresh = ctx.codeLoader.getVersion();
      remoteVer = fresh ? `v${fresh}` : '(yok)';
    } catch {
      remoteVer = 'hata';
    }

    let statusLine = '';
    try {
      const result = await ctx.fetchVersionCheck(installedVer);
      statusLine = result.allowed ? '✓ Güncel' : `✗ Engellendi`;
    } catch {
      statusLine = '✗ Sunucuya ulaşılamadı';
    }

    const aboutWin = new BrowserWindow({
      width: 400,
      height: 440,
      resizable: false,
      minimizable: false,
      maximizable: false,
      frame: false,
      alwaysOnTop: true,
      center: true,
      parent: mainWindow,
      modal: true,
      show: false,
      backgroundColor: '#1a1a2e',
      webPreferences: { nodeIntegration: true, contextIsolation: false, sandbox: false },
    });

    const WHATSAPP_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#25D366" width="20" height="20"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

    const APP_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4361ee" width="20" height="20"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{background:#1a1a2e;color:#e9e9f5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;display:flex;flex-direction:column;height:100vh;user-select:none;-webkit-user-select:none}
      .drag{-webkit-app-region:drag;background:#12122a;padding:10px 16px;display:flex;align-items:center;justify-content:space-between}
      .drag-title{font-size:13px;color:#8888aa;font-weight:500}
      .close-btn{-webkit-app-region:no-drag;background:none;border:none;color:#8888aa;font-size:18px;cursor:pointer;padding:0 4px;line-height:1}
      .close-btn:hover{color:#fff}
      .body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 32px;gap:6px}
      .app-name{font-size:22px;font-weight:700;color:#4361ee;margin-bottom:2px}
      .tagline{font-size:12px;color:#6b6b8a;margin-bottom:16px}
      .info-box{background:#12122a;border-radius:10px;padding:14px 20px;width:100%;font-size:12px;color:#b9b9d1;line-height:1.9}
      .info-row{display:flex;justify-content:space-between}
      .info-label{color:#6b6b8a}
      .info-val{color:#e9e9f5;font-weight:500}
      .divider{height:1px;background:#2a2a4a;margin:10px 0}
      .btns{display:flex;gap:10px;width:100%;margin-top:16px}
      .btn{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 0;border-radius:8px;border:none;font-size:13px;font-family:inherit;cursor:pointer;font-weight:600;transition:filter .15s}
      .btn:hover{filter:brightness(1.12)}
      .btn-wa{background:#25D366;color:#fff}
      .btn-web{background:#4361ee;color:#fff}
      .btn-close{background:#2a2a4a;color:#e9e9f5;flex:0.6}
    </style></head>
    <body>
      <div class="drag">
        <span class="drag-title">Hakkında</span>
        <button class="close-btn" id="btnClose">✕</button>
      </div>
      <div class="body">
        <div class="app-name">MTSK Uygulaması</div>
        <div class="tagline">Motorlu Taşıt Sürücüleri Kursu Yönetim Sistemi</div>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Uygulama</span><span class="info-val">v${installedVer}</span></div>
          <div class="info-row"><span class="info-label">Uzak kod</span><span class="info-val">${remoteVer}</span></div>
          <div class="divider"></div>
          <div class="info-row"><span class="info-label">Durum</span><span class="info-val">${statusLine}</span></div>
          <div class="divider"></div>
          <div class="info-row"><span class="info-label">Web</span><span class="info-val">mtsk.app</span></div>
          <div class="info-row"><span class="info-label">WhatsApp</span><span class="info-val">+90 552 187 03 34</span></div>
        </div>
        <div class="btns">
          <button class="btn btn-wa" id="btnWa">${WHATSAPP_ICON} WhatsApp</button>
          <button class="btn btn-web" id="btnWeb">${APP_ICON} Web Sitesi</button>
          <button class="btn btn-close" id="btnClose2">Kapat</button>
        </div>
      </div>
      <script>
        const {ipcRenderer} = require('electron');
        document.getElementById('btnWa').onclick = () => ipcRenderer.send('about:action', 'wa');
        document.getElementById('btnWeb').onclick = () => ipcRenderer.send('about:action', 'web');
        document.getElementById('btnClose').onclick = () => ipcRenderer.send('about:action', 'close');
        document.getElementById('btnClose2').onclick = () => ipcRenderer.send('about:action', 'close');
      </script>
    </body></html>`;

    aboutWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    aboutWin.once('ready-to-show', () => aboutWin.show());

    await new Promise<void>((resolve) => {
      const { ipcMain: ipc } = require('electron');
      const handler = (_e: any, action: string) => {
        ipc.removeListener('about:action', handler);
        if (!aboutWin.isDestroyed()) aboutWin.close();
        if (action === 'wa') shell.openExternal('https://wa.me/905521870334');
        else if (action === 'web') shell.openExternal('https://mtsk.app');
        resolve();
      };
      ipc.on('about:action', handler);
      aboutWin.on('closed', () => { ipc.removeListener('about:action', handler); resolve(); });
    });
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

  async function showFakeListDialog(kind: 'students' | 'cars') {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    interface ExamRow {
      donemi: string; sinavKodu: string; sinavTarihi: string; plaka: string;
      ustaOgretici: string; onayDurumu: string; sinavDurumu: string; sonuc: string;
    }
    interface LessonRow {
      donemi: string; grupAdi: string; grupBaslama: string; subesi: string;
      plaka: string; dersYeri: string; dersTarihi: string; dersSaati: string;
      personel: string; egitimTuru: string;
    }
    interface FakeStudent {
      tc: string; adSoyad: string;
      hasDetail: boolean;
      kurum?: string;
      donemi?: string; grubu?: string; subesi?: string;
      mevcutBelge?: string; istenenSertifika?: string;
      kurumOnay?: string; ilceOnay?: string; uygulama?: string; durumu?: string;
      teorikHak?: number; uygulamaHak?: number; eSinavHak?: number; kayitUcreti?: number;
      exams: ExamRow[]; lessons: LessonRow[];
    }

    const KURUM = '99993164/ÖZEL AYDINCIK BATUHAN MOTORLU TAŞIT SÜRÜCÜLERİ KURSU';
    const fakeStudents: FakeStudent[] = [
      {
        tc: '14674579946', adSoyad: 'MEHMET ÇELİK', hasDetail: true, kurum: KURUM,
        donemi: '2026 - Mayıs', grubu: 'Grup-1', subesi: 'C',
        mevcutBelge: 'B SINIFI SERTİFİKA', istenenSertifika: 'C SINIFI SERTİFİKA (Manuel)',
        kurumOnay: 'Onaylandı', ilceOnay: 'Onaylandı',
        uygulama: 'Muaf veya Geçti', durumu: 'Sertifika Almaya Hak Kazandı',
        teorikHak: 1, uygulamaHak: 0, eSinavHak: 1, kayitUcreti: 162272,
        exams: [
          { donemi: '2026 - Nisan', sinavKodu: '13303121', sinavTarihi: '25/04/2026', plaka: '33HE190', ustaOgretici: 'YETKİNER TOKLU', onayDurumu: 'Onaylandı', sinavDurumu: 'Sınava Girdi', sonuc: 'Başarılı' },
        ],
        lessons: [
          { donemi: '2026 - Mayıs', grupAdi: 'Grup 1', grupBaslama: '02/05/2026', subesi: 'C ŞUBESİ', plaka: '33L3380', dersYeri: 'Akan Trafik', dersTarihi: '04/05/2026', dersSaati: '15:00 - 15:50', personel: 'İBRAHİM ÇITIRKI', egitimTuru: 'Normal Eğitim' },
          { donemi: '2026 - Mayıs', grupAdi: 'Grup 1', grupBaslama: '02/05/2026', subesi: 'C ŞUBESİ', plaka: '33L3380', dersYeri: 'Akan Trafik', dersTarihi: '05/05/2026', dersSaati: '15:00 - 15:50', personel: 'İBRAHİM ÇITIRKI', egitimTuru: 'Normal Eğitim' },
        ],
      },
      {
        tc: '23456789012', adSoyad: 'AYŞE YILMAZ', hasDetail: true, kurum: KURUM,
        donemi: '2026 - Mayıs', grubu: 'Grup-2', subesi: 'B',
        mevcutBelge: '—', istenenSertifika: 'B SINIFI SERTİFİKA',
        kurumOnay: 'Onaylandı', ilceOnay: 'Beklemede',
        uygulama: 'Devam Ediyor', durumu: 'Eğitim Sürüyor',
        teorikHak: 2, uygulamaHak: 2, eSinavHak: 2, kayitUcreti: 92500,
        exams: [],
        lessons: [
          { donemi: '2026 - Mayıs', grupAdi: 'Grup 2', grupBaslama: '02/05/2026', subesi: 'B ŞUBESİ', plaka: '34ABC123', dersYeri: 'Park ve Manevra', dersTarihi: '06/05/2026', dersSaati: '09:00 - 09:50', personel: 'AYHAN DEMİR', egitimTuru: 'Normal Eğitim' },
        ],
      },
      {
        tc: '34567890123', adSoyad: 'AHMET KAYA', hasDetail: true, kurum: KURUM,
        donemi: '2026 - Nisan', grubu: 'Grup-1', subesi: 'B',
        mevcutBelge: '—', istenenSertifika: 'B SINIFI SERTİFİKA',
        kurumOnay: 'Onaylandı', ilceOnay: 'Onaylandı',
        uygulama: 'Sınava Girdi', durumu: 'Tekrar Sınava Girecek',
        teorikHak: 0, uygulamaHak: 1, eSinavHak: 0, kayitUcreti: 92500,
        exams: [
          { donemi: '2026 - Nisan', sinavKodu: '13301204', sinavTarihi: '20/04/2026', plaka: '33L3380', ustaOgretici: 'METİN ARSLAN', onayDurumu: 'Onaylandı', sinavDurumu: 'Sınava Girdi', sonuc: 'Başarısız' },
          { donemi: '2026 - Nisan', sinavKodu: '13301888', sinavTarihi: '28/04/2026', plaka: '33XY789', ustaOgretici: 'METİN ARSLAN', onayDurumu: 'Onaylandı', sinavDurumu: 'Sınava Girmedi', sonuc: '—' },
        ],
        lessons: [
          { donemi: '2026 - Nisan', grupAdi: 'Grup 1', grupBaslama: '01/04/2026', subesi: 'B ŞUBESİ', plaka: '33L3380', dersYeri: 'Akan Trafik', dersTarihi: '15/04/2026', dersSaati: '14:00 - 14:50', personel: 'METİN ARSLAN', egitimTuru: 'Normal Eğitim' },
        ],
      },
      {
        tc: '45678901234', adSoyad: 'ELİF DEMİR', hasDetail: true, kurum: KURUM,
        donemi: '2026 - Mayıs', grubu: 'Grup-3', subesi: 'A2',
        mevcutBelge: 'B SINIFI SERTİFİKA', istenenSertifika: 'A2 SINIFI SERTİFİKA (Manuel)',
        kurumOnay: 'Onaylandı', ilceOnay: 'Onaylandı',
        uygulama: 'Devam Ediyor', durumu: 'Eğitim Sürüyor',
        teorikHak: 1, uygulamaHak: 2, eSinavHak: 1, kayitUcreti: 75000,
        exams: [],
        lessons: [
          { donemi: '2026 - Mayıs', grupAdi: 'Grup 3', grupBaslama: '03/05/2026', subesi: 'A2 ŞUBESİ', plaka: '06FK4567', dersYeri: 'Akan Trafik', dersTarihi: '07/05/2026', dersSaati: '10:00 - 10:50', personel: 'HASAN ÖZ', egitimTuru: 'Normal Eğitim' },
          { donemi: '2026 - Mayıs', grupAdi: 'Grup 3', grupBaslama: '03/05/2026', subesi: 'A2 ŞUBESİ', plaka: '06FK4567', dersYeri: 'Park ve Manevra', dersTarihi: '08/05/2026', dersSaati: '10:00 - 10:50', personel: 'HASAN ÖZ', egitimTuru: 'Normal Eğitim' },
        ],
      },
      // List-only (hasDetail: false) — came from skt02006 list, detail never fetched
      {
        tc: '56789012345', adSoyad: 'MUSTAFA ŞAHİN', hasDetail: false,
        donemi: '2026 - Mayıs', grubu: 'Grup-1', subesi: 'B',
        durumu: 'Eğitime Başlamadı',
        exams: [],
        lessons: [],
      },
      {
        tc: '67890123456', adSoyad: 'ZEYNEP ÖZTÜRK', hasDetail: false,
        donemi: '2026 - Mayıs', grubu: 'Grup-2', subesi: 'B',
        durumu: 'Sınav Bekleniyor',
        exams: [],
        lessons: [],
      },
    ];

    const platesOf = (s: FakeStudent): string[] =>
      Array.from(new Set([
        ...s.exams.map((e) => e.plaka),
        ...s.lessons.map((l) => l.plaka),
      ].filter(Boolean)));

    const fakePlates = Array.from(
      new Set(fakeStudents.flatMap(platesOf)),
    ).sort();

    const isStudents = kind === 'students';
    const title = isStudents ? '👥 Öğrenciler (örnek veri)' : '🚗 Araçlar (örnek veri)';

    let bodyHtml = '';
    if (isStudents) {
      bodyHtml = fakeStudents
        .map((s) => {
          const ps = platesOf(s).join(', ');
          const meta = s.hasDetail
            ? (ps || '—')
            : `${s.donemi || ''} · ${s.grubu || ''} · ${s.subesi || ''}`.replace(/^[ ·]+|[ ·]+$/g, '') || 'Liste kaydı';
          const tag = s.hasDetail ? '' : '<span class="badge-tag">liste</span>';
          return `
        <div class="row" data-tc="${s.tc}">
          <div class="info">
            <div class="name">${s.adSoyad} ${tag}</div>
            <div class="tc">${s.tc} · ${meta}</div>
          </div>
          <button class="detay" data-tc="${s.tc}">Detay</button>
        </div>`;
        })
        .join('');
    } else {
      bodyHtml = fakePlates
        .map((p) => `<div class="row"><div class="plate">${p}</div></div>`)
        .join('');
    }

    // Serialize fake students for renderer (used by detail view)
    const fakeStudentsJson = JSON.stringify(fakeStudents).replace(/<\/script/gi, '<\\/script');

    const listWin = new BrowserWindow({
      width: 420,
      height: 520,
      resizable: true,
      minimizable: false,
      maximizable: false,
      frame: false,
      alwaysOnTop: true,
      center: true,
      parent: mainWindow,
      modal: true,
      show: false,
      backgroundColor: '#1a1a2e',
      webPreferences: { nodeIntegration: true, contextIsolation: false, sandbox: false },
    });

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{background:#1a1a2e;color:#e9e9f5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;display:flex;flex-direction:column;height:100vh;user-select:none;-webkit-user-select:none}
      .drag{-webkit-app-region:drag;background:#12122a;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;gap:8px}
      .drag-title{font-size:13px;color:#8888aa;font-weight:500;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .icon-btn{-webkit-app-region:no-drag;background:none;border:none;color:#8888aa;font-size:14px;cursor:pointer;padding:2px 8px;line-height:1;border-radius:4px}
      .icon-btn:hover{color:#fff;background:#2a2a4a}
      .close-btn{font-size:18px}
      .body{flex:1;overflow-y:auto;padding:8px 0}
      .row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 16px;border-bottom:1px solid #20203a}
      .row:hover{background:#12122a}
      .info{flex:1;min-width:0}
      .name{font-size:13px;color:#e9e9f5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .tc{font-size:11px;color:#6b6b8a;margin-top:2px}
      .plate{font-size:13px;color:#ddd;font-family:Consolas,monospace;letter-spacing:0.5px}
      .detay{background:#2a2a4a;border:none;color:#4361ee;cursor:pointer;padding:5px 12px;font-size:11px;border-radius:4px;font-weight:600}
      .detay:hover{background:#33335a}
      .footer{background:#12122a;padding:8px 16px;font-size:11px;color:#6b6b8a;text-align:center;border-top:1px solid #2a2a4a}
      .hidden{display:none !important}

      /* Detail view */
      #detail-view .body{padding:0}
      .det-hero{padding:18px 20px 14px;background:linear-gradient(180deg,#22224a 0%,#1a1a2e 100%);border-bottom:1px solid #2a2a4a}
      .det-name{font-size:18px;font-weight:700;color:#e9e9f5}
      .det-tc{font-size:12px;color:#8888aa;margin-top:2px;font-family:Consolas,monospace}
      .det-status{display:inline-block;margin-top:8px;padding:3px 10px;font-size:11px;border-radius:10px;font-weight:600;background:#1a3a2e;color:#4ade80}
      .det-status.pending{background:#3a2e1a;color:#fbbf24}
      .det-status.fail{background:#3a1a1a;color:#f87171}
      .section{padding:14px 20px;border-bottom:1px solid #20203a}
      .section-title{font-size:11px;color:#4361ee;font-weight:700;letter-spacing:0.8px;margin-bottom:10px;text-transform:uppercase}
      .kv{display:grid;grid-template-columns:1fr 1.4fr;gap:8px 12px;font-size:12px}
      .kv-label{color:#6b6b8a}
      .kv-val{color:#ddd;text-align:right;word-break:break-word}
      .hak-row{display:flex;gap:8px;margin-top:6px}
      .hak{flex:1;background:#12122a;border:1px solid #2a2a4a;border-radius:6px;padding:8px;text-align:center}
      .hak-num{font-size:18px;font-weight:700;color:#4361ee}
      .hak-num.zero{color:#6b6b8a}
      .hak-lbl{font-size:10px;color:#8888aa;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px}
      .table{width:100%;font-size:11px;border-collapse:collapse}
      .table th{background:#12122a;color:#8888aa;font-weight:600;text-align:left;padding:6px 8px;border-bottom:1px solid #2a2a4a;font-size:10px;text-transform:uppercase;letter-spacing:0.4px}
      .table td{padding:6px 8px;border-bottom:1px solid #20203a;color:#ccc;vertical-align:top}
      .badge{display:inline-block;padding:2px 6px;border-radius:8px;font-size:10px;font-weight:600}
      .badge.ok{background:#1a3a2e;color:#4ade80}
      .badge.fail{background:#3a1a1a;color:#f87171}
      .badge.pending{background:#3a2e1a;color:#fbbf24}
      .empty{padding:20px;text-align:center;color:#666;font-size:12px;font-style:italic}
      .badge-tag{display:inline-block;padding:1px 6px;font-size:9px;border-radius:6px;background:#3a2e1a;color:#fbbf24;margin-left:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;vertical-align:middle}
      .empty-state{padding:40px 24px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px}
      .empty-title{font-size:14px;color:#e9e9f5;font-weight:600}
      .empty-desc{font-size:12px;color:#8888aa;line-height:1.5;max-width:300px;font-style:normal}
      .cta-btn{margin-top:6px;background:#4361ee;color:#fff;border:none;padding:10px 22px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
      .cta-btn:hover{filter:brightness(1.12)}
      .cta-btn:disabled{opacity:0.6;cursor:wait}
      .empty-note{font-size:10px;color:#6b6b8a;margin-top:6px;font-style:italic}
    </style></head><body>
      <!-- LIST VIEW -->
      <div id="list-view" style="display:flex;flex-direction:column;height:100vh">
        <div class="drag">
          <div class="drag-title">${title}</div>
          <button class="icon-btn close-btn" id="close-btn">×</button>
        </div>
        <div class="body">${bodyHtml}</div>
        <div class="footer">Örnek veri — gerçek kayıtlar değil</div>
      </div>

      <!-- DETAIL VIEW -->
      <div id="detail-view" class="hidden" style="flex-direction:column;height:100vh">
        <div class="drag">
          <button class="icon-btn" id="back-btn" title="Geri">‹ Geri</button>
          <div class="drag-title" id="det-title-bar">Öğrenci Detay</div>
          <button class="icon-btn close-btn" id="close-btn-2">×</button>
        </div>
        <div class="body" id="detail-body"></div>
        <div class="footer">Örnek veri — gerçek kayıtlar değil</div>
      </div>

      <script>
        const STUDENTS = ${fakeStudentsJson};
        const listView = document.getElementById('list-view');
        const detailView = document.getElementById('detail-view');
        const detailBody = document.getElementById('detail-body');
        const titleBar = document.getElementById('det-title-bar');

        document.getElementById('close-btn').onclick = () => window.close();
        document.getElementById('close-btn-2').onclick = () => window.close();
        document.getElementById('back-btn').onclick = () => showList();

        function showList() {
          detailView.classList.add('hidden');
          detailView.style.display = 'none';
          listView.classList.remove('hidden');
          listView.style.display = 'flex';
        }
        function showDetail(tc) {
          const s = STUDENTS.find(x => x.tc === tc);
          if (!s) { console.log('[FakeList] No student for tc=' + tc); return; }
          listView.style.display = 'none';
          detailView.classList.remove('hidden');
          detailView.style.display = 'flex';
          titleBar.textContent = s.adSoyad;
          detailBody.innerHTML = renderDetail(s);
          detailBody.scrollTop = 0;
        }

        function statusClass(durum) {
          const d = (durum || '').toLowerCase();
          if (d.includes('hak kazandı') || d.includes('başarılı') || d.includes('tamamlandı')) return '';
          if (d.includes('başarısız') || d.includes('iptal') || d.includes('red')) return 'fail';
          return 'pending';
        }
        function badge(text) {
          const t = (text || '').toLowerCase();
          let cls = 'pending';
          if (t === 'başarılı' || t === 'onaylandı' || t === 'sınava girdi') cls = 'ok';
          else if (t === 'başarısız' || t === 'sınava girmedi' || t === 'iptal') cls = 'fail';
          return '<span class="badge ' + cls + '">' + (text || '—') + '</span>';
        }

        function renderDetail(s) {
          if (!s.hasDetail) {
            return \`
              <div class="det-hero">
                <div class="det-name">\${s.adSoyad}</div>
                <div class="det-tc">\${s.tc} · \${s.donemi || '—'} · \${s.grubu || '—'} · Şube \${s.subesi || '—'}</div>
                <div class="det-status pending">\${s.durumu || 'Detay Yüklenmedi'}</div>
              </div>
              <div class="empty-state">
                <div class="empty-title">Bu öğrenci sadece liste kaydı</div>
                <div class="empty-desc">Sınav geçmişi, ders programı, sertifika ve hak bilgileri için MEBBIS'e gidip TC ile sorgulanmalı. Tek tıklayın, biz hallederiz.</div>
                <button id="fetch-detay-btn" class="cta-btn" data-tc="\${s.tc}">⤓ Detay Getir</button>
                <div class="empty-note">örnek veri — gerçek bir sorgu yapılmaz</div>
              </div>
            \`;
          }
          const platesAll = Array.from(new Set([
            ...s.exams.map(e => e.plaka),
            ...s.lessons.map(l => l.plaka)
          ].filter(Boolean)));
          const passed = s.exams.filter(e => (e.sonuc || '').toLowerCase() === 'başarılı').length;
          const failed = s.exams.filter(e => (e.sonuc || '').toLowerCase() === 'başarısız').length;
          const teachers = Array.from(new Set([
            ...s.exams.map(e => e.ustaOgretici),
            ...s.lessons.map(l => l.personel)
          ].filter(Boolean)));

          const examRows = s.exams.length ? s.exams.map(e => \`
            <tr>
              <td>\${e.donemi}</td><td>\${e.sinavTarihi}</td><td>\${e.plaka}</td>
              <td>\${e.ustaOgretici}</td><td>\${badge(e.sinavDurumu)}</td><td>\${badge(e.sonuc)}</td>
            </tr>\`).join('') : '<tr><td colspan="6" class="empty">Sınav kaydı yok</td></tr>';

          const lessonRows = s.lessons.length ? s.lessons.map(l => \`
            <tr>
              <td>\${l.dersTarihi}</td><td>\${l.dersSaati}</td><td>\${l.plaka}</td>
              <td>\${l.dersYeri}</td><td>\${l.personel}</td><td>\${l.egitimTuru}</td>
            </tr>\`).join('') : '<tr><td colspan="6" class="empty">Ders kaydı yok</td></tr>';

          return \`
            <div class="det-hero">
              <div class="det-name">\${s.adSoyad}</div>
              <div class="det-tc">\${s.tc} · \${s.donemi} · \${s.grubu} · Şube \${s.subesi}</div>
              <div class="det-status \${statusClass(s.durumu)}">\${s.durumu}</div>
            </div>

            <div class="section">
              <div class="section-title">Genel Bilgiler</div>
              <div class="kv">
                <div class="kv-label">Kurum</div><div class="kv-val">\${s.kurum}</div>
                <div class="kv-label">Mevcut Belge</div><div class="kv-val">\${s.mevcutBelge}</div>
                <div class="kv-label">İstenen Sertifika</div><div class="kv-val">\${s.istenenSertifika}</div>
                <div class="kv-label">Kurum Onayı</div><div class="kv-val">\${badge(s.kurumOnay)}</div>
                <div class="kv-label">İlçe Onayı</div><div class="kv-val">\${badge(s.ilceOnay)}</div>
                <div class="kv-label">Uygulama Durumu</div><div class="kv-val">\${s.uygulama}</div>
                <div class="kv-label">Kayıt Ücreti</div><div class="kv-val">\${(s.kayitUcreti||0).toLocaleString('tr-TR')} ₺</div>
                <div class="kv-label">Araçlar</div><div class="kv-val">\${platesAll.join(', ') || '—'}</div>
                <div class="kv-label">Eğitmenler</div><div class="kv-val">\${teachers.join(', ') || '—'}</div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Sınav Hakları</div>
              <div class="hak-row">
                <div class="hak"><div class="hak-num \${s.teorikHak ? '' : 'zero'}">\${s.teorikHak}</div><div class="hak-lbl">Teorik</div></div>
                <div class="hak"><div class="hak-num \${s.uygulamaHak ? '' : 'zero'}">\${s.uygulamaHak}</div><div class="hak-lbl">Uygulama</div></div>
                <div class="hak"><div class="hak-num \${s.eSinavHak ? '' : 'zero'}">\${s.eSinavHak}</div><div class="hak-lbl">E-Sınav</div></div>
              </div>
              <div style="margin-top:10px;font-size:11px;color:#8888aa">
                Geçti: <span style="color:#4ade80;font-weight:600">\${passed}</span> ·
                Kaldı: <span style="color:#f87171;font-weight:600">\${failed}</span> ·
                Toplam Sınav: <span style="color:#ddd;font-weight:600">\${s.exams.length}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Sınav Geçmişi</div>
              <table class="table">
                <thead><tr><th>Dönem</th><th>Tarih</th><th>Plaka</th><th>Usta Öğretici</th><th>Durum</th><th>Sonuç</th></tr></thead>
                <tbody>\${examRows}</tbody>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Ders Programı</div>
              <table class="table">
                <thead><tr><th>Tarih</th><th>Saat</th><th>Plaka</th><th>Yer</th><th>Personel</th><th>Tür</th></tr></thead>
                <tbody>\${lessonRows}</tbody>
              </table>
            </div>
          \`;
        }

        document.querySelectorAll('.detay').forEach(b => {
          b.onclick = () => {
            const tc = b.getAttribute('data-tc');
            console.log('[FakeList] Detay opening tc=' + tc);
            showDetail(tc);
          };
        });

        // Delegated handler for Detay Getir CTA inside detail empty state
        detailBody.addEventListener('click', (ev) => {
          const btn = ev.target && ev.target.closest && ev.target.closest('#fetch-detay-btn');
          if (!btn) return;
          const tc = btn.getAttribute('data-tc');
          console.log('[FakeList] Detay Getir clicked tc=' + tc);
          btn.disabled = true;
          btn.textContent = '⏳ Sorgulanıyor…';
          // Simulated fetch — real flow would fire MEBBIS_OPEN_STUDENT:<tc>
          setTimeout(() => {
            const s = STUDENTS.find(x => x.tc === tc);
            if (!s) return;
            // Promote fake student to detailed with placeholder rich data
            s.hasDetail = true;
            s.kurum = s.kurum || '99993164/ÖZEL AYDINCIK BATUHAN MOTORLU TAŞIT SÜRÜCÜLERİ KURSU';
            s.mevcutBelge = s.mevcutBelge || '—';
            s.istenenSertifika = s.istenenSertifika || 'B SINIFI SERTİFİKA';
            s.kurumOnay = s.kurumOnay || 'Onaylandı';
            s.ilceOnay = s.ilceOnay || 'Onaylandı';
            s.uygulama = s.uygulama || 'Yeni Veri';
            s.teorikHak = s.teorikHak ?? 1;
            s.uygulamaHak = s.uygulamaHak ?? 1;
            s.eSinavHak = s.eSinavHak ?? 1;
            s.kayitUcreti = s.kayitUcreti ?? 92500;
            s.exams = [];
            s.lessons = [];
            showDetail(tc);
          }, 700);
        });
      </script>
    </body></html>`;

    await listWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    listWin.once('ready-to-show', () => listWin.show());
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

  // ── IPC ─────────────────────────────────────────────────────────

  function setupIPC() {
    ipcMain.handle('device:id', () => ctx.getDeviceId());

    ipcMain.handle('whats-new:check', () => ctx.getPendingWhatsNew());
    ipcMain.handle('whats-new:dismiss', () => { ctx.markWhatsNewSeen(); return true; });

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

    ipcMain.handle('app:is-dev', () => ctx.isDev);
    ipcMain.handle('desktop-code:version', () => ctx.codeLoader.getVersion());
    ipcMain.handle('app:version', () => ctx.appVersion);

    ipcMain.handle('dev:test-direksiyon-pdf', async (_event, sinif: string) => {
      if (!ctx.isDev) throw new Error('Only available in development mode');
      if (!mainWindow) throw new Error('No main window');
      return mebbisManager.generateTestDireksiyonPdf(sinif || '0,B|16', mainWindow);
    });
    ipcMain.handle('dev:test-simulator-pdf', async (_event, simType: string) => {
      if (!ctx.isDev) throw new Error('Only available in development mode');
      if (!mainWindow) throw new Error('No main window');
      return mebbisManager.generateTestSimulatorPdf(simType || 'sesim', mainWindow);
    });

    ipcMain.handle('auth:check', async () => {
      const token = authStore.getToken();
      const user = authStore.getUser();
      if (!token || !user) return null;
      try {
        const isAdmin = ctx.isDev && (user.userType === -1 || user.userType === -2);
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
        authStore.setRememberedPassword(password);
        authStore.setAutoLogin(autoLogin === true);
        const isAdmin = ctx.isDev && (result.user.userType === -1 || result.user.userType === -2);
        console.log('[auth:login] Logged in:', email, 'userType:', result.user.userType, 'isAdmin:', isAdmin);
        let school = null;
        if (!isAdmin) {
          school = await apiClient.getMySchool(result.token).catch(() => null);
          if (school?.name) authStore.setSavedSchoolName(school.name);
        }
        // Pull the school's student/plate data into local DB on every login.
        pullStudentSync().catch((e) => console.error('[StudentSync] Login pull failed:', e));
        return { user: result.user, school };
      } catch (err: any) {
        const raw = String(err?.message || '');
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
        try { await apiClient.logout(token); } catch { /* ignore */ }
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
      try { return await apiClient.forgotPassword(email, phone); }
      catch (err: any) { return { success: false, message: err?.message || 'Bir hata oluştu.' }; }
    });
    ipcMain.handle('auth:verify-reset-code', async (_event, email: string, code: string) => {
      try { return await apiClient.verifyResetCode(email, code); }
      catch (err: any) { return { success: false, message: err?.message || 'Bir hata oluştu.' }; }
    });
    ipcMain.handle('auth:reset-password', async (_event, email: string, code: string, newPassword: string) => {
      try { return await apiClient.resetPassword(email, code, newPassword); }
      catch (err: any) { return { success: false, message: err?.message || 'Bir hata oluştu.' }; }
    });

    ipcMain.handle('shell:open-external', async (_event, url: string) => {
      if (url.startsWith('https://')) {
        await shell.openExternal(url);
      }
    });

    mebbisManager.setActivityLogger((schoolIdStr, pdfType, count) => {
      const schoolId = parseInt(schoolIdStr, 10);
      if (!Number.isFinite(schoolId)) return;
      logActivity({ event: 'pdf_download', school_id: schoolId, pdf_type: pdfType, count });
    });

    ipcMain.handle('accounts:list', async () => {
      const token = authStore.getToken();
      const user = authStore.getUser();
      if (!token) return [];
      try {
        const isAdmin = ctx.isDev && (user?.userType === -1 || user?.userType === -2);
        const dbAccounts = isAdmin
          ? await apiClient.getAllSchools(token)
          : await apiClient.getMebbisAccounts(token);
        console.log(`[accounts:list] IS_DEV=${ctx.isDev} userType=${user?.userType} isAdmin=${isAdmin} count=${dbAccounts.length}`);
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
      if (!dbAccounts.length) {
        await apiClient.setupSchool(token, data.label || 'Sürücü Kursum');
        dbAccounts = await apiClient.getMebbisAccounts(token);
      }
      if (!dbAccounts.length) throw new Error('No driving school found for this account');
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
      const isAdmin = ctx.isDev && (user?.userType === -1 || user?.userType === -2);
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

    ipcMain.handle('accounts:start', async (_event, id: string) => {
      const token = authStore.getToken();
      const user = authStore.getUser();
      if (!token) throw new Error('Not authenticated');
      const isAdmin = ctx.isDev && (user?.userType === -1 || user?.userType === -2);
      const dbAccounts = isAdmin
        ? await apiClient.getAllSchools(token)
        : await apiClient.getMebbisAccounts(token);
      const found = dbAccounts.find(m => String(m.id) === id);
      if (!found) throw new Error('Account not found');
      if (!found.subscriptionActive) {
        throw new Error('SUBSCRIPTION_INACTIVE');
      }
      if (!found.simulatorType) {
        throw new Error('NO_SIMULATOR_TYPE');
      }
      const account = { ...dbToAccount(found), isRunning: false };
      mebbisManager.start(account, mainWindow!);
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

  // ── Wire it all up ──────────────────────────────────────────────

  setupIPC();

  mainWindow = createMainWindow();

  ctx.setupAutoUpdater(mainWindow);

  rebuildAppMenu();

  // Track Shift to toggle the hidden Test menu. Released-on-blur guards
  // against the user alt-tabbing while Shift is held.
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    const next = input.shift === true;
    if (next !== isShiftHeld) {
      isShiftHeld = next;
      rebuildAppMenu();
    }
  });
  mainWindow.on('blur', () => {
    if (isShiftHeld) {
      isShiftHeld = false;
      rebuildAppMenu();
    }
  });

  ctx.showWhatsNewIfUpdated(mainWindow);

  // Process-level events. These persist for the app lifetime; the bundle
  // is loaded once per process so re-registering on a hot-swap is N/A.
  app.on('window-all-closed', () => {
    mebbisManager.stopAll();
    app.quit();
  });
  app.on('before-quit', () => {
    console.log('App quitting, flushing all cookies + student DB...');
    mebbisManager.stopAll();
    try { require('./student-db').getStudentDb().flush(); } catch (e) { console.error('StudentDb flush on quit failed:', e); }
  });
  app.on('activate', () => {
    if (mainWindow === null) {
      mainWindow = createMainWindow();
    }
  });

  return { mainWindow };
}
