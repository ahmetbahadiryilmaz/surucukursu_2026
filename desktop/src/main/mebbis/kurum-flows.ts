/**
 * Module functions extracted from manager.ts. Each takes the MebbisManager
 * instance as first argument (`m`) so callers go through m.x for shared state.
 */

import { BrowserWindow } from 'electron';
import { Account } from '../storage/account-store';
import { pushKurumInfo, fetchKurumInfo } from '../sync/kurum-info-sync';
import type { MebbisManager } from './manager';

/**
 * skt01001 ("Kurum Bilgileri") scrape — captures the kurum header fields plus
 * the Programlar and Araç Bilgileri grids, then pushes the whole snapshot to
 * the backend so the Kurum modal and K Belgesi form can read it.
 *
 * `force` controls re-scraping: a user-triggered "Güncelle" passes `true` to
 * re-scrape even when a snapshot is already cached this session. A passive
 * visit passes `false`, so the page is only scraped once per session.
 */
export function parseAndPushKurumInfo(
  m: MebbisManager,
  win: BrowserWindow,
  account: Account,
  force: boolean,
): void {
  if (win.isDestroyed()) return;
  if (!force && m.kurumInfoCache.has(account.id)) return;
  console.log(`[KurumInfoParser][${account.label}] Scraping skt01001 (force=${force})`);

  win.webContents.executeJavaScript(`
    (function() {
      function txt(id) {
        var el = document.getElementById(id);
        if (!el) return '';
        return (el.value || el.textContent || '')
          .replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ').trim();
      }
      function cellText(td) {
        return (td && td.textContent || '')
          .replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ').trim();
      }
      // dgProgramlar and dgAracBilgileri share the same shape: the header row
      // carries class "frmListBaslik"; data rows are plain <tr>.
      function gridRows(gridId, minCells) {
        var grid = document.getElementById(gridId);
        if (!grid) return [];
        var out = [];
        var trs = grid.querySelectorAll('tr');
        for (var i = 0; i < trs.length; i++) {
          var tr = trs[i];
          if (tr.classList && tr.classList.contains('frmListBaslik')) continue;
          var tds = tr.querySelectorAll('td');
          if (tds.length < minCells) continue;
          var cells = [];
          for (var j = 0; j < tds.length; j++) cells.push(cellText(tds[j]));
          out.push(cells);
        }
        return out;
      }

      // dgProgramlar columns:
      //   0:Ehliyet Sınıfı | 1:Program Ruhsat Alma Tarihi |
      //   2:Programın Kapanma Tarihi | 3:Durumu
      var programs = gridRows('dgProgramlar', 4).map(function(c) {
        return {
          ehliyetSinifi: c[0] || '',
          ruhsatTarihi:  c[1] || '',
          kapanmaTarihi: c[2] || '',
          durum:         c[3] || '',
        };
      });

      // dgAracBilgileri columns:
      //   0:Plaka | 1:Ehliyet Sınıfı | 2:Markası | 3:Modeli | 4:Model Yılı |
      //   5:Tescil Tarihi | 6:Hizmete Giriş | 7:Hizmetten Çıkış |
      //   8:Aracın Durumu | 9:MEM Onay Durumu
      var vehicles = gridRows('dgAracBilgileri', 10).map(function(c) {
        return {
          plaka:          c[0] || '',
          ehliyetSinifi:  c[1] || '',
          marka:          c[2] || '',
          model:          c[3] || '',
          modelYili:      c[4] || '',
          tescilTarihi:   c[5] || '',
          hizmeteGiris:   c[6] || '',
          hizmettenCikis: c[7] || '',
          durum:          c[8] || '',
          memOnay:        c[9] || '',
        };
      });

      return {
        kurumKodu:     txt('lblKurumKodu'),
        kurumAdi:      txt('lblKurumAdi'),
        kurumAdres:    txt('lblKurumAdres'),
        kurumTelefon:  txt('lblKurumTelefon'),
        binaKontenjan: txt('lblBinaKontenjan'),
        acilmaTarihi:  txt('lblAcilmaTarihi'),
        programs: programs,
        vehicles: vehicles,
      };
    })();
  `).then((result: any) => {
    if (!result || !result.kurumAdi) {
      console.log(`[KurumInfoParser][${account.label}] No kurum adı found on skt01001 — skipping push`);
      return;
    }
    console.log(`[KurumInfoParser][${account.label}] Found: ${result.kurumAdi} (programs=${result.programs.length}, vehicles=${result.vehicles.length})`);
    pushKurumInfo(account.id, {
      kurumKodu:     result.kurumKodu     || undefined,
      kurumAdi:      result.kurumAdi      || undefined,
      kurumAdres:    result.kurumAdres    || undefined,
      kurumTelefon:  result.kurumTelefon  || undefined,
      binaKontenjan: result.binaKontenjan || undefined,
      acilmaTarihi:  result.acilmaTarihi  || undefined,
      programs:      result.programs,
      vehicles:      result.vehicles,
    }).then((r) => {
      if (!r) {
        console.log(`[KurumInfoParser][${account.label}] Backend push returned null (no token / failed)`);
        return;
      }
      // Refresh the cache from the backend so the next Kurum modal / K Belgesi
      // open sees the canonical record (with ids, last_scraped_at, route).
      fetchKurumInfo().then((info) => {
        if (!info) return;
        m.kurumInfoCache.set(account.id, info);
        if (!win.isDestroyed()) {
          m.pushStoreToSidebar(win, account);
          if (force) {
            // User-triggered "Mebbisden Güncelle" — return them to the Kurum
            // panel with a fresh snapshot and a "Güncellendi" badge.
            win.webContents.executeJavaScript(`
              (function() {
                try {
                  window.__kurumUpdatePending = true;
                  if (typeof window.__mebbisShowKurumDetail === 'function') {
                    window.__mebbisShowKurumDetail();
                  }
                } catch (e) { console.log('[KurumUpdate] reopen failed: ' + e); }
              })();
            `).catch(() => {});
          }
        }
      }).catch(() => {});
    });
  }).catch((e: any) => {
    console.error(`[KurumInfoParser][${account.label}] scrape failed:`, e);
  });
}
