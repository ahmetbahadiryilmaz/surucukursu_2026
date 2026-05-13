/**
 * Injects the Öğrenciler / Personeller / Araçlar / Kurum sections into the
 * MEBBIS sidebar and wires the renderer. The entire body is one giant
 * webContents.executeJavaScript call building the UI in the page DOM.
 */

import { app, BrowserWindow } from 'electron';
import { Account } from '../storage/account-store';
import { getCodeLoader } from '../../launcher/remote-code-loader';
import type { MebbisManager } from './manager';

export async function injectStoreSidebarSections(_m: MebbisManager, win: BrowserWindow, account: Account): Promise<void> {
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

          // Section: Kişisel Bilgiler (K Belgesi'nde manuel doldurulan aday alanları)
          var kisiselFields = [
            ['Baba Adı', row.babaAd],
            ['Doğum Yeri', row.dogumYeri],
            ['Doğum Tarihi', row.dogumTarihi],
            ['Adresi', row.adres],
          ].filter(function(f) {
            return f[1] !== null && f[1] !== undefined && String(f[1]).trim() !== '';
          });
          if (kisiselFields.length) {
            var kisisel = makeSection('Kişisel Bilgiler', false, kisiselFields.length);
            kisiselFields.forEach(function(f) { addKV(kisisel.body, f[0], f[1]); });
            body.appendChild(kisisel.el);
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

          var kGuncelleBtn = document.createElement('button');
          kGuncelleBtn.textContent = 'Güncelle';
          kGuncelleBtn.style.cssText = 'background: #4361ee; color: white; border: none; border-radius: 4px; padding: 6px 14px; font-size: 13px; cursor: pointer; flex-shrink: 0;';
          kGuncelleBtn.onclick = function() {
            kGuncelleBtn.disabled = true;
            kGuncelleBtn.textContent = 'Yükleniyor...';
            kGuncelleBtn.style.opacity = '0.6';
            console.log('MEBBIS_REQUEST_KURUM_UPDATE');
          };

          var kCloseBtn = document.createElement('button');
          kCloseBtn.textContent = '✕';
          kCloseBtn.style.cssText = 'background: none; border: none; color: #ccc; cursor: pointer; font-size: 18px; padding: 0 8px; line-height: 1;';
          kCloseBtn.onclick = closeStoreModal;
          header.appendChild(titleWrap);
          header.appendChild(kGuncelleBtn);
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

export async function injectLeftMenu(m: MebbisManager, win: BrowserWindow, account: Account) {
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
    await m.injectStoreSidebarSections(win, account);
    // And immediately push current store state.
    m.pushStoreToSidebar(win, account);
}
