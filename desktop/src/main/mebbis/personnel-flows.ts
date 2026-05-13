/**
 * Module functions extracted from manager.ts. Each takes the MebbisManager
 * instance as first argument (`m`) so callers go through m.x for shared state.
 */

import { BrowserWindow, dialog, session, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { Account } from '../storage/account-store';
import { getStudentDb } from '../storage/student-db';
import { getPersonnelDb, PersonnelDetailData } from '../storage/personnel-db';
import { fetchEncryptedTemplate } from '../templates/template-fetcher';
import { getRequestLogger } from '../utils/request-logger';
import { pushList, pushDetail } from '../sync/student-sync';
import { pushPersonnelList, pushPersonnelDetail } from '../sync/personnel-sync';
import { fetchKurumInfo } from '../sync/kurum-info-sync';
import { fetchCars, updateCarRoute } from '../sync/car-sync';
import { getCodeLoader } from '../../launcher/remote-code-loader';
import type { MebbisManager } from './manager';

export function parseAndIngestPersonnelList(m: MebbisManager, win: BrowserWindow, account: Account): void {
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
      m.pushStoreToSidebar(win, account);
    }).catch((e: any) => {
      console.error(`[PersonnelParser][${account.label}] Scrape failed:`, e);
    });
}

export function parseAndIngestPersonnelListOok(m: MebbisManager, win: BrowserWindow, account: Account): void {
    if (win.isDestroyed()) return;
    const alreadySearched = m.personnelAutoSearched.has(account.id);
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
        m.personnelAutoSearched.add(account.id);
        return;
      }
      if (!result || !Array.isArray(result.rows)) {
        console.log(`[PersonnelParserOok][${account.label}] No rows; reason=${result?.reason || 'unknown'}`);
        return;
      }
      const rows = result.rows as any[];
      m.personnelAutoSearched.delete(account.id);
      if (!rows.length) {
        console.log(`[PersonnelParserOok][${account.label}] Empty personnel list`);
        return;
      }
      const db = getPersonnelDb();
      const r = db.ingestList(account.id, rows);
      console.log(`[PersonnelParserOok][${account.label}] Ingested ${rows.length} OOK personnel: created=${r.created}, updated=${r.updated}. Total=${db.countPersonnel(account.id)}`);
      m.pushStoreToSidebar(win, account);
      pushPersonnelList(account.id, rows);

      if (m.personnelBatchDetailDone.has(account.id) || m.pendingPersonnelBatchDetail) return;

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
        m.pendingPersonnelBatchDetail = {
          accountId: account.id,
          totalRows,
          currentIndex: 0,
          formState,
        };
        m.triggerPersonnelAcPostback(win, account, 0);
      }).catch((e: any) => {
        console.error(`[PersonnelBatch][${account.label}] Form state capture failed:`, e);
      });
    }).catch((e: any) => {
      console.error(`[PersonnelParserOok][${account.label}] Scrape failed:`, e);
    });
}

export function triggerPersonnelAcPostback(m: MebbisManager, win: BrowserWindow, account: Account, index: number): void {
    if (win.isDestroyed()) return;
    const batch = m.pendingPersonnelBatchDetail;
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
          m.pendingPersonnelBatchDetail = null;
        }
      }).catch((e: any) => {
        console.error(`[PersonnelBatch][${account.label}] Postback row 0 JS error:`, e);
        m.pendingPersonnelBatchDetail = null;
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
        m.pendingPersonnelBatchDetail = null;
      }
    }).catch((e: any) => {
      console.error(`[PersonnelBatch][${account.label}] Postback row ${index} JS error:`, e);
      m.pendingPersonnelBatchDetail = null;
    });
}

export function scrapePersonnelDetail(m: MebbisManager, win: BrowserWindow, account: Account): void {
    if (win.isDestroyed()) return;
    const batch = m.pendingPersonnelBatchDetail;
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
        m.triggerPersonnelAcPostback(win, account, batch.currentIndex);
      } else {
        console.log(`[PersonnelBatch][${account.label}] Personnel detail batch complete — ${batch.totalRows} records scraped`);
        m.personnelBatchDetailDone.add(account.id);
        m.pendingPersonnelBatchDetail = null;
        m.pushStoreToSidebar(win, account);
      }
    }).catch((e: any) => {
      console.error(`[PersonnelBatch][${account.label}] scrapePersonnelDetail failed at index ${batch.currentIndex}:`, e);
      m.pendingPersonnelBatchDetail = null;
    });
}
