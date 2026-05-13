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

export function parseAndLogStudentPage(m: MebbisManager, win: BrowserWindow, account: Account): void {
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
        const expectedTcBlank = m.pendingKbFetch.get(account.id);
        if (expectedTcBlank) {
          m.pendingKbFetch.delete(account.id);
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
      m.pushStoreToSidebar(win, account);

      // K Belgesi auto-fetch: if this detail load resolves a pending fetch,
      // re-open the K Belgesi form prefilled with the now-cached student.
      const expectedKbTc = m.pendingKbFetch.get(account.id);
      if (expectedKbTc && expectedKbTc === tc) {
        m.pendingKbFetch.delete(account.id);
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

export function parseAndIngestStudentList(m: MebbisManager, win: BrowserWindow, account: Account): void {
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
      m.pushStoreToSidebar(win, account);

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

export function openStudent(m: MebbisManager, win: BrowserWindow, account: Account, tc: string): void {
    if (win.isDestroyed()) {
      console.log(`[OpenStudent][${account.label}] Window destroyed, aborting tc=${tc}`);
      return;
    }
    if (!tc || !/^\d{11}$/.test(tc)) {
      console.log(`[OpenStudent][${account.label}] Invalid TC '${tc}', aborting`);
      return;
    }
    if (m.pendingDownload || m.pendingBatchDownload || m.pendingSimulatorReport) {
      console.log(`[OpenStudent][${account.label}] A download/batch is in progress, ignoring open-student tc=${tc}`);
      return;
    }
    console.log(`[OpenStudent][${account.label}] Navigating to skt00001 to open tc=${tc}`);
    m.pendingOpenStudent.set(account.id, { tc, phase: 'skt-module' });
    win.loadURL('https://mebbis.meb.gov.tr/SKT/skt00001.aspx').catch((e) => {
      console.error(`[OpenStudent][${account.label}] loadURL failed:`, e);
      m.pendingOpenStudent.delete(account.id);
    });
}

export function fillTcAndSubmit(m: MebbisManager, win: BrowserWindow, tc: string): void {
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

export async function handleStudentUpdateOptions(m: MebbisManager, win: BrowserWindow, account: Account): Promise<void> {
    if (!m.pendingStudentUpdate.has(account.id)) return;
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
      m.pendingStudentUpdate.delete(account.id);
    }
}

export async function submitStudentUpdateForm(m: MebbisManager, win: BrowserWindow,     options: { donemi: string; ogrenciDurumu: string; onayDurumu: string; grubu: string; subesi: string },): Promise<void> {
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
    m.pendingStudentUpdate.clear();
}
