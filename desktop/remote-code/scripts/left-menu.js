(function () {
  if (document.getElementById('mebbis-left-menu')) return;

  const sidebar = document.createElement('div');
  sidebar.id = 'mebbis-left-menu';
  sidebar.style.cssText =
    'position: fixed; left: 0; top: 0; bottom: 0; width: 200px; z-index: 10000; background: #1a1a2e; border-right: 1px solid #2a2a4a; display: flex; flex-direction: column; color: white; font-family: Arial, sans-serif; overflow-y: auto;';

  const title = document.createElement('div');
  title.style.cssText =
    'padding: 15px; border-bottom: 1px solid #2a2a4a; font-weight: bold; color: #4361ee;';
  title.textContent = 'Menu';
  sidebar.appendChild(title);

  const items = [
    { label: 'Direksiyon Takip İndir', action: 'direksiyon' },
    { label: 'Çoklu Direksiyon Takip', action: 'coklu-direksiyon' },
    { label: 'Simulasyon Raporu Oluştur', action: 'simulasyon' },
    { label: 'Çoklu Simulasyon Raporu', action: 'coklu-simulasyon' },
    { label: 'K Belgesi Oluştur', action: 'k-belgesi' },
  ];

  items.forEach(item => {
    const btn = document.createElement('button');
    btn.style.cssText =
      'background: none; border: none; width: 100%; padding: 12px 15px; text-align: left; color: #ccc; cursor: pointer; border-bottom: 1px solid #2a2a4a; font-size: 14px; transition: all 0.2s;';
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
        let overlay = document.getElementById('mebbis-modal-overlay');
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = 'mebbis-modal-overlay';
        overlay.style.cssText =
          'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 99999; display: flex; align-items: center; justify-content: center;';

        const modal = document.createElement('div');
        modal.style.cssText =
          'background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 8px; padding: 24px; width: 380px; font-family: Arial, sans-serif; color: white;';

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
        tcInput.style.cssText =
          'width: 100%; padding: 10px; border: 1px solid #2a2a4a; border-radius: 4px; background: #16213e; color: white; font-size: 14px; box-sizing: border-box; outline: none; margin-bottom: 16px;';
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
          const simType = (document.querySelector('input[name="simType"]:checked') || {}).value || 'sesim';
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

      if (item.action === 'k-belgesi') {
        let overlay = document.getElementById('mebbis-modal-overlay');
        if (overlay) overlay.remove();

        var store = window.__mebbisStore || { students: [], personnel: [] };
        var students = Array.isArray(store.students) ? store.students : [];
        var personnel = Array.isArray(store.personnel) ? store.personnel : [];

        // Gate: K Belgesi needs Kurum Bilgisi (for kurum adı/adres/il-ilçe)
        // and Personel Bilgisi (for usta öğretici autopick). If either is
        // missing show a prompt with a Güncelle button instead of the form.
        var hasKurum = !!(store.kurumInfo && store.kurumInfo.kurumAdi);
        var hasPersonnel = personnel.length > 0;
        if (!hasKurum || !hasPersonnel) {
          var missingKind = !hasKurum ? 'kurum' : 'personel';
          var gateOv = document.createElement('div');
          gateOv.id = 'mebbis-modal-overlay';
          gateOv.style.cssText =
            'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 99999; display: flex; align-items: center; justify-content: center;';
          var gateModal = document.createElement('div');
          gateModal.style.cssText =
            'background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 10px; padding: 24px 28px; width: 400px; font-family: Arial, sans-serif; color: white; text-align: center;';
          var gateTitle = document.createElement('h3');
          gateTitle.style.cssText = 'margin: 0 0 12px 0; color: #4361ee; font-size: 16px;';
          gateTitle.textContent = missingKind === 'kurum' ? 'Kurum Bilgisi Eksik' : 'Personel Bilgisi Eksik';
          gateModal.appendChild(gateTitle);
          var gateMsg = document.createElement('div');
          gateMsg.style.cssText = 'font-size: 14px; color: #ccc; margin-bottom: 20px; line-height: 1.5;';
          gateMsg.textContent = missingKind === 'kurum'
            ? 'Lütfen Kurum Bilgisi güncelleyin.'
            : 'Lütfen Personel Bilgisi güncelleyin.';
          gateModal.appendChild(gateMsg);
          var gateBtns = document.createElement('div');
          gateBtns.style.cssText = 'display: flex; gap: 10px; justify-content: center;';
          var gateCancel = document.createElement('button');
          gateCancel.textContent = 'İptal';
          gateCancel.style.cssText = 'padding: 8px 16px; border: 1px solid #2a2a4a; border-radius: 4px; background: none; color: #ccc; cursor: pointer; font-size: 14px;';
          gateCancel.onclick = function() { gateOv.remove(); };
          gateBtns.appendChild(gateCancel);
          var gateUpd = document.createElement('button');
          gateUpd.textContent = 'Güncelle';
          gateUpd.style.cssText = 'padding: 8px 16px; border: none; border-radius: 4px; background: #4361ee; color: white; cursor: pointer; font-size: 14px; font-weight: 500;';
          gateUpd.onclick = function() {
            gateUpd.disabled = true;
            gateUpd.textContent = 'Yükleniyor...';
            gateUpd.style.opacity = '0.6';
            console.log(missingKind === 'kurum' ? 'MEBBIS_REQUEST_KURUM_UPDATE' : 'MEBBIS_REQUEST_PERSONNEL_UPDATE');
          };
          gateBtns.appendChild(gateUpd);
          gateModal.appendChild(gateBtns);
          gateOv.appendChild(gateModal);
          gateOv.onclick = function(e) { if (e.target === gateOv) gateOv.remove(); };
          document.body.appendChild(gateOv);
          return;
        }

        overlay = document.createElement('div');
        overlay.id = 'mebbis-modal-overlay';
        overlay.style.cssText =
          'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 99999; display: flex; align-items: flex-start; justify-content: center; overflow-y: auto; padding: 20px 0;';

        // -------- STEP 1: Öğrenci ara --------
        var searchModal = document.createElement('div');
        searchModal.style.cssText =
          'background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 10px; padding: 24px 28px; width: 520px; font-family: Arial, sans-serif; color: white; margin: auto;';

        var searchTitle = document.createElement('h3');
        searchTitle.style.cssText = 'margin: 0 0 16px 0; color: #4361ee; font-size: 17px; border-bottom: 1px solid #2a2a4a; padding-bottom: 12px;';
        searchTitle.textContent = 'K Belgesi — Öğrenci Seç';
        searchModal.appendChild(searchTitle);

        var hint = document.createElement('div');
        hint.style.cssText = 'font-size: 12px; color: #888; margin-bottom: 10px;';
        hint.textContent = students.length
          ? 'TC veya Ad Soyad ile arayın (' + students.length + ' kayıtlı öğrenci)'
          : 'Henüz öğrenci yüklenmemiş — önce Öğrencileri Güncelle. Manuel TC ile devam edebilirsiniz.';
        searchModal.appendChild(hint);

        var searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'TC veya Ad Soyad';
        searchInput.style.cssText =
          'width: 100%; padding: 10px; border: 1px solid #2a2a4a; border-radius: 4px; background: #16213e; color: white; font-size: 14px; box-sizing: border-box; outline: none; margin-bottom: 8px;';
        searchInput.onfocus = function() { searchInput.style.borderColor = '#4361ee'; };
        searchInput.onblur = function() { searchInput.style.borderColor = '#2a2a4a'; };
        searchModal.appendChild(searchInput);

        var resultsBox = document.createElement('div');
        resultsBox.style.cssText = 'max-height: 280px; overflow-y: auto; border: 1px solid #2a2a4a; border-radius: 4px; background: #16213e; margin-bottom: 16px;';
        searchModal.appendChild(resultsBox);

        function renderResults(q) {
          resultsBox.innerHTML = '';
          var query = (q || '').toLowerCase().trim();
          if (!query) {
            resultsBox.style.display = 'none';
            return;
          }
          resultsBox.style.display = 'block';
          var matches = students.filter(function(s) {
            if (!s) return false;
            var tc = (s.tc || '').toLowerCase();
            var name = (s.adSoyad || '').toLowerCase();
            return tc.indexOf(query) !== -1 || name.indexOf(query) !== -1;
          }).slice(0, 30);
          if (!matches.length) {
            var empty = document.createElement('div');
            empty.style.cssText = 'padding: 10px; color: #888; font-size: 13px; text-align: center;';
            empty.textContent = 'Eşleşme bulunamadı';
            resultsBox.appendChild(empty);
            // If the query is a valid 11-digit TC, offer to fetch from MEBBIS.
            if (/^\d{11}$/.test(query)) {
              var fetchWrap = document.createElement('div');
              fetchWrap.style.cssText = 'padding: 0 10px 12px; text-align: center;';
              var fetchHint = document.createElement('div');
              fetchHint.style.cssText = 'color: #888; font-size: 11px; margin-bottom: 8px;';
              fetchHint.textContent = "Bu TC yerel kayıtta yok. MEBBIS'ten çekilsin mi?";
              fetchWrap.appendChild(fetchHint);
              var fetchBtn = document.createElement('button');
              fetchBtn.type = 'button';
              fetchBtn.textContent = "MEBBIS'ten Getir →";
              fetchBtn.style.cssText = 'padding: 8px 16px; border: none; border-radius: 4px; background: #4361ee; color: white; cursor: pointer; font-size: 13px; font-weight: 500;';
              fetchBtn.onclick = function() {
                fetchBtn.disabled = true;
                fetchBtn.textContent = 'Çekiliyor...';
                fetchBtn.style.opacity = '0.6';
                console.log('MEBBIS_KB_FETCH_STUDENT:' + query);
                overlay.remove();
              };
              fetchWrap.appendChild(fetchBtn);
              resultsBox.appendChild(fetchWrap);
            }
            return;
          }
          matches.forEach(function(s) {
            var row = document.createElement('div');
            row.style.cssText = 'padding: 9px 12px; cursor: pointer; border-bottom: 1px solid #1f2a44; font-size: 13px; display: flex; justify-content: space-between; gap: 10px;';
            var left = document.createElement('div');
            left.innerHTML = '<div style="color:white;">' + (s.adSoyad || '-') + '</div>' +
              '<div style="color:#888; font-size:11px;">TC: ' + (s.tc || '-') +
              (s.grubu ? ' · ' + s.grubu : '') + '</div>';
            var right = document.createElement('div');
            right.style.cssText = 'color:#4361ee; font-size:11px; align-self:center;';
            right.textContent = 'Seç →';
            row.appendChild(left);
            row.appendChild(right);
            row.onmouseover = function() { row.style.background = '#1f2a44'; };
            row.onmouseout = function() { row.style.background = 'transparent'; };
            row.onclick = function() { openForm(s); };
            resultsBox.appendChild(row);
          });
        }
        renderResults('');
        searchInput.oninput = function() { renderResults(searchInput.value); };

        var searchBtnRow = document.createElement('div');
        searchBtnRow.style.cssText = 'display: flex; gap: 10px; justify-content: space-between; align-items: center;';

        var manualBtn = document.createElement('button');
        manualBtn.textContent = 'Manuel doldur';
        manualBtn.style.cssText = 'padding: 8px 14px; border: 1px solid #2a2a4a; border-radius: 4px; background: none; color: #ccc; cursor: pointer; font-size: 13px;';
        manualBtn.onclick = function() { openForm(null); };
        searchBtnRow.appendChild(manualBtn);

        var cancelSearchBtn = document.createElement('button');
        cancelSearchBtn.textContent = 'İptal';
        cancelSearchBtn.style.cssText = 'padding: 8px 16px; border: 1px solid #2a2a4a; border-radius: 4px; background: none; color: #ccc; cursor: pointer; font-size: 14px;';
        cancelSearchBtn.onclick = function() { overlay.remove(); };
        searchBtnRow.appendChild(cancelSearchBtn);

        searchModal.appendChild(searchBtnRow);
        overlay.appendChild(searchModal);
        overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
        document.body.appendChild(overlay);
        searchInput.focus();

        function openForm(selectedStudent) {
          overlay.innerHTML = '';
          overlay.appendChild(modal);
          buildForm(selectedStudent);
        }

        // -------- STEP 2: Form --------
        const modal = document.createElement('div');
        modal.style.cssText =
          'background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 10px; padding: 24px 28px; width: 600px; font-family: Arial, sans-serif; color: white; margin: auto;';

        const kbModalTitle = document.createElement('h3');
        kbModalTitle.style.cssText = 'margin: 0 0 20px 0; color: #4361ee; font-size: 17px; border-bottom: 1px solid #2a2a4a; padding-bottom: 12px;';
        kbModalTitle.textContent = 'K Belgesi Oluştur';
        modal.appendChild(kbModalTitle);

        function buildForm(student) {
          buildFormBody(modal, student, personnel);
        }

        function buildFormBody(modal, student, personnelList) {
        // Pick the most-frequent lesson instructor TC for this student (autopick).
        var autoPickedPersonnelTc = '';
        if (student && Array.isArray(student.lessons) && student.lessons.length && personnelList.length) {
          var counts = {};
          student.lessons.forEach(function(l) {
            var name = (l && l.personel || '').trim();
            if (!name) return;
            counts[name] = (counts[name] || 0) + 1;
          });
          var topName = '';
          var topCount = 0;
          Object.keys(counts).forEach(function(n) { if (counts[n] > topCount) { topCount = counts[n]; topName = n; } });
          if (topName) {
            var normalize = function(s) { return (s || '').toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ').trim(); };
            var nTop = normalize(topName);
            for (var i = 0; i < personnelList.length; i++) {
              var p = personnelList[i];
              if (!p) continue;
              if (normalize(p.adSoyad) === nTop || normalize((p.ad || '') + ' ' + (p.soyad || '')) === nTop) {
                autoPickedPersonnelTc = p.tc;
                break;
              }
            }
          }
        }

        function mkSection(title) {
          const sec = document.createElement('div');
          sec.style.cssText = 'margin-bottom: 18px;';
          const hdr = document.createElement('div');
          hdr.style.cssText = 'font-size: 12px; font-weight: bold; color: #4361ee; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #2a2a4a;';
          hdr.textContent = title;
          sec.appendChild(hdr);
          return sec;
        }

        function mkField(parent, label, id, opts) {
          opts = opts || {};
          const wrap = document.createElement('div');
          wrap.style.cssText = 'margin-bottom: 10px; display: flex; align-items: center; gap: 10px;';
          const lbl = document.createElement('label');
          lbl.style.cssText = 'min-width: 150px; font-size: 13px; color: #aaa; text-align: right; flex-shrink: 0;';
          lbl.textContent = label;
          wrap.appendChild(lbl);
          let inp;
          if (opts.type === 'select') {
            inp = document.createElement('select');
            inp.style.cssText = 'flex: 1; padding: 8px 10px; border: 1px solid #2a2a4a; border-radius: 4px; background: #16213e; color: white; font-size: 13px; outline: none; cursor: pointer;';
            (opts.options || []).forEach(function(o) {
              const op = document.createElement('option');
              op.value = o.value !== undefined ? o.value : o;
              op.textContent = o.label !== undefined ? o.label : o;
              op.style.cssText = 'background: #16213e; color: white;';
              inp.appendChild(op);
            });
          } else {
            inp = document.createElement('input');
            inp.type = opts.type || 'text';
            inp.placeholder = opts.placeholder || '';
            if (opts.maxLength) inp.maxLength = opts.maxLength;
            if (opts.value) inp.value = opts.value;
            inp.style.cssText = 'flex: 1; padding: 8px 10px; border: 1px solid #2a2a4a; border-radius: 4px; background: #16213e; color: white; font-size: 13px; outline: none;';
          }
          inp.id = 'kb-' + id;
          inp.onfocus = function() { inp.style.borderColor = '#4361ee'; };
          inp.onblur = function() { inp.style.borderColor = '#2a2a4a'; };
          wrap.appendChild(inp);
          parent.appendChild(wrap);
          return inp;
        }

        var today = new Date();
        var todayStr = today.toISOString().slice(0, 10);
        var sixMonthsLater = new Date(today);
        sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
        var sixMonthsStr = sixMonthsLater.toISOString().slice(0, 10);

        // ---- Autofill helpers ----
        function splitAdSoyad(full) {
          var s = (full || '').trim();
          if (!s) return { ad: '', soyad: '' };
          var parts = s.split(/\s+/);
          if (parts.length === 1) return { ad: parts[0], soyad: '' };
          return { ad: parts.slice(0, -1).join(' '), soyad: parts[parts.length - 1] };
        }
        // Convert "dd.mm.yyyy" or "dd/mm/yyyy" → "yyyy-mm-dd" for <input type="date">
        function toIsoDate(s) {
          if (!s) return '';
          var m = String(s).match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
          if (!m) return '';
          return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
        }
        var studentNames = splitAdSoyad(student && student.adSoyad);
        // student.lessons[].dersYeri often holds an address-like string; pick the first non-empty
        var lessonDersYeri = '';
        if (student && Array.isArray(student.lessons)) {
          for (var li = 0; li < student.lessons.length; li++) {
            if (student.lessons[li] && student.lessons[li].dersYeri) { lessonDersYeri = student.lessons[li].dersYeri; break; }
          }
        }
        // Pick auto-personnel record up-front so its fields can be inlined.
        var autoPersonnel = null;
        if (autoPickedPersonnelTc) {
          for (var pi = 0; pi < personnelList.length; pi++) {
            if (personnelList[pi] && personnelList[pi].tc === autoPickedPersonnelTc) { autoPersonnel = personnelList[pi]; break; }
          }
        }
        var personnelIl = autoPersonnel ? (autoPersonnel.il || '') : '';
        var personnelIlce = autoPersonnel ? (autoPersonnel.ilce || '') : '';
        var personnelKurum = autoPersonnel ? (autoPersonnel.kurumAdi || '') : '';
        var personnelNames = autoPersonnel ? splitAdSoyad(autoPersonnel.adSoyad || ((autoPersonnel.ad || '') + ' ' + (autoPersonnel.soyad || ''))) : { ad: '', soyad: '' };

        // Shared kurum derivations (used in section 1 + section 2)
        var kurumInfo = store.kurumInfo || null;
        // MEBBIS adres ends with "...ILÇE / İL"; extract the trailing two ALL-CAPS words.
        function extractIlIlceFromAdres(adres) {
          if (!adres) return null;
          var m = String(adres).match(/([A-ZÇĞİÖŞÜ]+)\s*\/\s*([A-ZÇĞİÖŞÜ]+)\s*$/);
          if (!m) return null;
          return { ilce: m[1], il: m[2] };
        }
        var kurumIlIlce = kurumInfo ? extractIlIlceFromAdres(kurumInfo.kurumAdres) : null;
        var ilIlceVal = '';
        if (kurumIlIlce) {
          ilIlceVal = kurumIlIlce.il + ' / ' + kurumIlIlce.ilce;
        } else if (personnelIl && personnelIlce) {
          ilIlceVal = personnelIl.toLocaleUpperCase('tr-TR') + ' / ' + personnelIlce.toLocaleUpperCase('tr-TR');
        }
        // "ÖZEL AYDINCIK BATUHAN MOTORLU TAŞIT SÜRÜCÜLERİ KURSU" → "AYDINCIK BATUHAN"
        function shortKursAdi(full) {
          if (!full) return '';
          var s = String(full).trim().toUpperCase().replace(/\s+/g, ' ');
          // Strip leading "ÖZEL " (Turkish uppercase, no /i needed after toUpperCase)
          s = s.replace(/^ÖZEL\s+/, '');
          // Strip from "MOTORLU" or "TAŞIT" or "SÜRÜCÜLERİ" or "KURSU" onwards
          s = s.replace(/\s+(MOTORLU|TA[ŞS]IT|SÜRÜCÜ|KURSU)\b.*$/, '');
          return s.trim();
        }
        var kursAdiVal = shortKursAdi((kurumInfo && (kurumInfo.kurum_adi || kurumInfo.kurumAdi)) || personnelKurum || (student && student.kurum) || '');
        var kursAdresVal = (kurumInfo && (kurumInfo.kurum_adres || kurumInfo.kurumAdres)) || '';

        // Section 1: Araç ve İzin Bilgileri
        var sec1 = mkSection('Araç ve İzin Bilgileri');
        mkField(sec1, 'Araç Cinsi', 'aracCinsi', {
          type: 'select',
          options: ['Otomobil', 'Motosiklet', 'Kamyon', 'Otobüs', 'Minibüs', 'Kamyonet', 'Traktör', 'Diğer']
        });
        mkField(sec1, 'Güzergah', 'gurzergah', { placeholder: 'Mahalle içi - Şehir merkezi', value: lessonDersYeri });
        mkField(sec1, 'Gün / Saat', 'gunSaat', { placeholder: 'Pzt-Cu 09:00-17:00' });
        mkField(sec1, 'Düzenlenme Tarihi', 'duzenlenmeTarihi', { type: 'date', value: todayStr });
        mkField(sec1, 'Geçerlik Bitişi', 'gecerlikBitisi', { type: 'date', value: sixMonthsStr });
        mkField(sec1, 'Kurs Adı', 'mudurAd', { placeholder: 'Kurs adı', value: kursAdiVal });
        modal.appendChild(sec1);

        // Section 2: Kurs / Kurum Bilgileri (prefer kurumInfo from skt01001 over personnel-derived fallback)
        var sec2 = mkSection('Kurs / Kurum Bilgileri');
        mkField(sec2, 'İli / İlçesi', 'iliIlcesi', { placeholder: 'ANKARA / ÇANKAYA', value: ilIlceVal });
        mkField(sec2, 'Kurs Adı', 'kursAdi', { placeholder: 'Kurs adı', value: kursAdiVal });
        mkField(sec2, 'Belge No', 'belgeNo', { placeholder: '2026-001' });
        mkField(sec2, 'Belge Tarihi', 'belgeTarihi', { type: 'date', value: todayStr });
        mkField(sec2, 'Kurs Adresi', 'kursAdresi', { placeholder: 'Mahalle, Sokak, No, İlçe/İl', value: kursAdresVal });
        modal.appendChild(sec2);

        // Section 3: Sürücü Adayı Bilgileri (autofilled from selected student)
        var sec3 = mkSection('Sürücü Adayı Bilgileri');
        mkField(sec3, 'TC Kimlik No', 'adayTc', { placeholder: '12345678901', maxLength: 11, value: (student && student.tc) || '' });
        mkField(sec3, 'Adı', 'adayAd', { placeholder: 'Ad', value: studentNames.ad });
        mkField(sec3, 'Soyadı', 'adaySoyad', { placeholder: 'Soyad', value: studentNames.soyad });
        mkField(sec3, 'Baba Adı', 'adayBabaAd', { placeholder: 'Baba adı' });
        mkField(sec3, 'Doğum Yeri', 'adayDogumYeri', { placeholder: 'İl adı' });
        mkField(sec3, 'Doğum Tarihi', 'adayDogumTarihi', { type: 'date' });
        mkField(sec3, 'Adresi', 'adayAdresi', { placeholder: 'Mahalle, No, İlçe/İl' });
        modal.appendChild(sec3);

        // Section 4: Usta Öğretici (dropdown of cached personnel + autopick)
        var sec4 = mkSection('Usta Öğretici Bilgileri');
        var personnelOpts = [{ value: '', label: personnelList.length ? '— Seçiniz —' : '(personel bulunamadı, manuel girin)' }];
        personnelList.forEach(function(p) {
          if (!p || !p.tc) return;
          personnelOpts.push({ value: p.tc, label: (p.adSoyad || ((p.ad || '') + ' ' + (p.soyad || ''))) + ' · ' + p.tc });
        });
        var personnelSelect = mkField(sec4, 'Personel Seç', 'ustaSelect', { type: 'select', options: personnelOpts });
        mkField(sec4, 'TC Kimlik No', 'ustaTc', { placeholder: '12345678901', maxLength: 11, value: autoPersonnel ? autoPersonnel.tc : '' });
        mkField(sec4, 'Adı', 'ustaAd', { placeholder: 'Ad', value: personnelNames.ad });
        mkField(sec4, 'Soyadı', 'ustaSoyad', { placeholder: 'Soyad', value: personnelNames.soyad });
        mkField(sec4, 'Adresi', 'ustaAdresi', { placeholder: 'Mahalle, No, İl', value: (autoPersonnel && (autoPersonnel.il || autoPersonnel.ilce)) ? ([autoPersonnel.ilce, autoPersonnel.il].filter(Boolean).join('/')) : '' });
        mkField(sec4, 'Belge Sınıfı', 'ustaBelgeSinifi', {
          type: 'select',
          options: ['B', 'A', 'A1', 'A2', 'BE', 'C', 'CE', 'D', 'D1', 'DE']
        });
        mkField(sec4, 'Belge No', 'ustaBelgeNo', { placeholder: 'Belge numarası', value: autoPersonnel ? (autoPersonnel.izinNo || '') : '' });
        mkField(sec4, 'Belge Yeri', 'ustaBelgeYeri', { placeholder: 'İl adı', value: autoPersonnel ? (autoPersonnel.il || '') : '' });
        if (autoPickedPersonnelTc) personnelSelect.value = autoPickedPersonnelTc;

        personnelSelect.onchange = function() {
          var selTc = personnelSelect.value;
          var p = null;
          for (var k = 0; k < personnelList.length; k++) {
            if (personnelList[k] && personnelList[k].tc === selTc) { p = personnelList[k]; break; }
          }
          if (!p) return;
          var nm = splitAdSoyad(p.adSoyad || ((p.ad || '') + ' ' + (p.soyad || '')));
          var setVal = function(id, val) { var el = document.getElementById('kb-' + id); if (el && val !== undefined) el.value = val; };
          setVal('ustaTc', p.tc || '');
          setVal('ustaAd', nm.ad);
          setVal('ustaSoyad', nm.soyad);
          setVal('ustaAdresi', [p.ilce, p.il].filter(Boolean).join('/'));
          setVal('ustaBelgeNo', p.izinNo || '');
          setVal('ustaBelgeYeri', p.il || '');
        };
        modal.appendChild(sec4);

        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; padding-top: 16px; border-top: 1px solid #2a2a4a;';

        var cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'İptal';
        cancelBtn.style.cssText = 'padding: 9px 20px; border: 1px solid #2a2a4a; border-radius: 4px; background: none; color: #ccc; cursor: pointer; font-size: 14px;';
        cancelBtn.onclick = function() { overlay.remove(); };
        btnRow.appendChild(cancelBtn);

        var submitBtn = document.createElement('button');
        submitBtn.textContent = 'Oluştur';
        submitBtn.style.cssText = 'padding: 9px 20px; border: none; border-radius: 4px; background: #4361ee; color: white; cursor: pointer; font-size: 14px; font-weight: bold;';
        submitBtn.onclick = function() {
          var errors = [];
          var adayTcVal = document.getElementById('kb-adayTc').value.trim();
          var ustaTcVal = document.getElementById('kb-ustaTc').value.trim();
          if (adayTcVal.length !== 11 || !/^[0-9]+$/.test(adayTcVal)) errors.push('adayTc');
          if (ustaTcVal.length !== 11 || !/^[0-9]+$/.test(ustaTcVal)) errors.push('ustaTc');

          errors.forEach(function(id) {
            var el = document.getElementById('kb-' + id);
            if (el) el.style.borderColor = '#ff4444';
          });
          if (errors.length) return;

          function v(id) {
            var el = document.getElementById('kb-' + id);
            return el ? el.value.trim() : '';
          }
          function fmtDateSpaced(isoStr) {
            if (!isoStr) return '';
            var parts = isoStr.split('-');
            if (parts.length !== 3) return isoStr;
            return parts[2] + '    ' + parts[1] + '    ' + parts[0];
          }
          function fmtDate(isoStr) {
            if (!isoStr) return '';
            var parts = isoStr.split('-');
            if (parts.length !== 3) return isoStr;
            return parts[2] + '/' + parts[1] + '/' + parts[0];
          }

          var data = {
            aracCinsi: v('aracCinsi'),
            gurzergah: v('gurzergah'),
            gunSaat: v('gunSaat'),
            duzenlenmeTarihi: fmtDateSpaced(v('duzenlenmeTarihi')),
            gecerlikBitisi: fmtDateSpaced(v('gecerlikBitisi')),
            mudurAd: v('mudurAd'),
            iliIlcesi: v('iliIlcesi'),
            kursAdi: v('kursAdi'),
            belgeNo: v('belgeNo'),
            belgeTarihi: fmtDate(v('belgeTarihi')),
            kursAdresi: v('kursAdresi'),
            adayTc: adayTcVal,
            adayAd: v('adayAd'),
            adaySoyad: v('adaySoyad'),
            adayBabaAd: v('adayBabaAd'),
            adayDogumYeri: v('adayDogumYeri'),
            adayDogumTarihi: fmtDate(v('adayDogumTarihi')),
            adayAdresi: v('adayAdresi'),
            ustaTc: ustaTcVal,
            ustaAd: v('ustaAd'),
            ustaSoyad: v('ustaSoyad'),
            ustaAdresi: v('ustaAdresi'),
            ustaBelgeSinifi: v('ustaBelgeSinifi'),
            ustaBelgeNo: v('ustaBelgeNo'),
            ustaBelgeYeri: v('ustaBelgeYeri'),
          };
          console.log('MEBBIS_K_BELGESI:' + JSON.stringify(data));
          submitBtn.disabled = true;
          submitBtn.textContent = 'Hazırlanıyor...';
          submitBtn.style.opacity = '0.6';
          overlay.remove();
        };
        btnRow.appendChild(submitBtn);

        modal.appendChild(btnRow);
        var focusTarget = document.getElementById('kb-adayBabaAd') || document.getElementById('kb-adayTc');
        if (focusTarget) focusTarget.focus();
        } // end buildFormBody
        return;
      }

      // Direksiyon Takip modal
      let overlay = document.getElementById('mebbis-modal-overlay');
      if (overlay) overlay.remove();

      overlay = document.createElement('div');
      overlay.id = 'mebbis-modal-overlay';
      overlay.style.cssText =
        'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 99999; display: flex; align-items: center; justify-content: center;';

      const modal = document.createElement('div');
      modal.style.cssText =
        'background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 8px; padding: 24px; width: 350px; font-family: Arial, sans-serif; color: white;';

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
      input.style.cssText =
        'width: 100%; padding: 10px; border: 1px solid #2a2a4a; border-radius: 4px; background: #16213e; color: white; font-size: 14px; box-sizing: border-box; outline: none;';
      input.onfocus = () => { input.style.borderColor = '#4361ee'; };
      input.onblur = () => { input.style.borderColor = '#2a2a4a'; };
      modal.appendChild(input);

      const sinifLabel = document.createElement('label');
      sinifLabel.style.cssText = 'display: block; margin-top: 12px; margin-bottom: 8px; font-size: 14px; color: #ccc;';
      sinifLabel.textContent = 'Sınıf Seçiniz';
      modal.appendChild(sinifLabel);

      const sinifSelect = document.createElement('select');
      sinifSelect.style.cssText =
        'width: 100%; padding: 10px; border: 1px solid #2a2a4a; border-radius: 4px; background: #16213e; color: white; font-size: 14px; box-sizing: border-box; outline: none; cursor: pointer;';
      sinifSelect.onfocus = () => { sinifSelect.style.borderColor = '#4361ee'; };
      sinifSelect.onblur = () => { sinifSelect.style.borderColor = '#2a2a4a'; };
      const sinifOptions = [
        { label: 'Otomatik (ders say\u0131s\u0131na g\u00f6re)', value: '' },
        { label: 'Yeni B (16 ders)', value: '0,B|16' },
        { label: 'Yeni A (14 ders)', value: '0,A|14' },
        { label: 'A1 \u2192 A2 (6 ders)', value: 'A1,A2|6' },
        { label: 'A2 \u2192 A (12 ders)', value: 'A2,A|12' },
        { label: 'A \u2192 B (16 ders)', value: 'A,B|16' },
        { label: 'B \u2192 A1 (14 ders)', value: 'B,A1|14' },
        { label: 'B \u2192 A2 (14 ders)', value: 'B,A2|14' },
        { label: 'B \u2192 A (12 ders)', value: 'B,A|12' },
        { label: 'B \u2192 BE (6 ders)', value: 'B,BE|6' },
        { label: 'B \u2192 D1 (7 ders)', value: 'B,D1|7' },
        { label: 'B(2016 \u00d6ncesi) \u2192 C (16 ders)', value: 'B(2016 \u00d6ncesi),C|16' },
        { label: 'B(2016 Sonras\u0131) \u2192 C (22 ders)', value: 'B(2016 Sonras\u0131),C|22' },
        { label: 'B(2016 \u00d6ncesi) \u2192 D (9 ders)', value: 'B(2016 \u00d6ncesi),D|9' },
        { label: 'B(2016 Sonras\u0131) \u2192 D (16 ders)', value: 'B(2016 Sonras\u0131),D|16' },
        { label: 'C \u2192 CE (8 ders)', value: 'C,CE|8' },
        { label: 'C \u2192 D (9 ders)', value: 'C,D|9' },
        { label: 'C \u2192 D1 (4 ders)', value: 'C,D1|4' },
        { label: 'C \u2192 A2 (12 ders)', value: 'C,A2|12' },
        { label: 'D \u2192 C (12 ders)', value: 'D,C|12' },
        { label: 'D1 \u2192 D (6 ders)', value: 'D1,D|6' },
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

  if (document.body) {
    document.body.appendChild(sidebar);
    const style = document.createElement('style');
    style.textContent = 'body { margin-left: 200px !important; } main { margin-left: 0 !important; }';
    document.head.appendChild(style);
    console.log('[MEBBIS] Left menu injected');
  }

  // Re-entry hook for K Belgesi auto-fetch flow. Called by the main process
  // after it has scraped a previously-unknown student and refreshed __mebbisStore.
  // Simulates a click on the K Belgesi menu button, then auto-selects the new row.
  window.__openKBelgesi = function(autoTc) {
    var menuBtns = document.querySelectorAll('#mebbis-left-menu button');
    var clicked = false;
    for (var i = 0; i < menuBtns.length; i++) {
      if (menuBtns[i].textContent === 'K Belgesi Oluştur') {
        menuBtns[i].click();
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      console.log('[MEBBIS] __openKBelgesi: K Belgesi button not found');
      return;
    }
    if (!autoTc) return;
    setTimeout(function() {
      var ov = document.getElementById('mebbis-modal-overlay');
      if (!ov) return;
      var input = ov.querySelector('input[placeholder*="Soyad"]');
      if (!input) return;
      input.value = autoTc;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(function() {
        var row = ov.querySelector('div[style*="cursor: pointer"]');
        if (row) row.click();
      }, 120);
    }, 60);
  };
})();
