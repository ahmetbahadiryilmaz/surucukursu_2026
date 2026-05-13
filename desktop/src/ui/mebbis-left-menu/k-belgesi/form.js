/**
 * Builds the 4-section K Belgesi form into `modal`.
 * `overlay` is passed so cancel / submit can close the whole dialog.
 */
export function buildKBForm(modal, student, personnelList, store, overlay) {
  // ---- Autopick most-frequent instructor ----
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

  // ---- UI helpers ----
  function mkSection(title) {
    var sec = document.createElement('div');
    sec.style.cssText = 'margin-bottom: 18px;';
    var hdr = document.createElement('div');
    hdr.style.cssText = 'font-size: 12px; font-weight: bold; color: #4361ee; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #2a2a4a;';
    hdr.textContent = title;
    sec.appendChild(hdr);
    return sec;
  }

  function mkField(parent, label, id, opts) {
    opts = opts || {};
    var wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom: 10px; display: flex; align-items: center; gap: 10px;';
    var lbl = document.createElement('label');
    lbl.style.cssText = 'min-width: 150px; font-size: 13px; color: #aaa; text-align: right; flex-shrink: 0;';
    lbl.textContent = label;
    wrap.appendChild(lbl);
    var inp;
    if (opts.type === 'select') {
      inp = document.createElement('select');
      inp.style.cssText = 'flex: 1; padding: 8px 10px; border: 1px solid #2a2a4a; border-radius: 4px; background: #16213e; color: white; font-size: 13px; outline: none; cursor: pointer;';
      (opts.options || []).forEach(function(o) {
        var op = document.createElement('option');
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

  // ---- Autofill helpers ----
  function splitAdSoyad(full) {
    var s = (full || '').trim();
    if (!s) return { ad: '', soyad: '' };
    var parts = s.split(/\s+/);
    if (parts.length === 1) return { ad: parts[0], soyad: '' };
    return { ad: parts.slice(0, -1).join(' '), soyad: parts[parts.length - 1] };
  }

  function toIsoDate(s) {
    if (!s) return '';
    var m = String(s).match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
    if (!m) return '';
    return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  }

  function shortKursAdi(full) {
    if (!full) return '';
    var s = String(full).trim().toUpperCase().replace(/\s+/g, ' ');
    s = s.replace(/^ÖZEL\s+/, '');
    s = s.replace(/\s+(MOTORLU|TA[ŞS]IT|SÜRÜCÜ|KURSU)\b.*$/, '');
    return s.trim();
  }

  function extractIlIlceFromAdres(adres) {
    if (!adres) return null;
    var m = String(adres).match(/([A-ZÇĞİÖŞÜ]+)\s*\/\s*([A-ZÇĞİÖŞÜ]+)\s*$/);
    if (!m) return null;
    return { ilce: m[1], il: m[2] };
  }

  // ---- Derived values ----
  var today = new Date();
  var todayStr = today.toISOString().slice(0, 10);
  var sixMonthsLater = new Date(today);
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
  var sixMonthsStr = sixMonthsLater.toISOString().slice(0, 10);

  var studentNames = splitAdSoyad(student && student.adSoyad);

  var lessonDersYeri = '';
  if (student && Array.isArray(student.lessons)) {
    for (var li = 0; li < student.lessons.length; li++) {
      if (student.lessons[li] && student.lessons[li].dersYeri) { lessonDersYeri = student.lessons[li].dersYeri; break; }
    }
  }

  var autoPersonnel = null;
  if (autoPickedPersonnelTc) {
    for (var pi = 0; pi < personnelList.length; pi++) {
      if (personnelList[pi] && personnelList[pi].tc === autoPickedPersonnelTc) { autoPersonnel = personnelList[pi]; break; }
    }
  }

  var personnelIl = autoPersonnel ? (autoPersonnel.il || '') : '';
  var personnelIlce = autoPersonnel ? (autoPersonnel.ilce || '') : '';
  var personnelKurum = autoPersonnel ? (autoPersonnel.kurumAdi || '') : '';

  if (!personnelKurum || !personnelIl) {
    for (var pfi = 0; pfi < personnelList.length; pfi++) {
      var pf = personnelList[pfi];
      if (!pf) continue;
      if (!personnelKurum && pf.kurumAdi) personnelKurum = pf.kurumAdi;
      if (!personnelIl    && pf.il)       personnelIl    = pf.il;
      if (!personnelIlce  && pf.ilce)     personnelIlce  = pf.ilce;
      if (personnelKurum && personnelIl && personnelIlce) break;
    }
  }

  var personnelNames = autoPersonnel
    ? splitAdSoyad(autoPersonnel.adSoyad || ((autoPersonnel.ad || '') + ' ' + (autoPersonnel.soyad || '')))
    : { ad: '', soyad: '' };

  var kurumInfo = store.kurumInfo || null;

  var carsIndex = {};
  if (Array.isArray(store.cars)) {
    store.cars.forEach(function(c) { if (c.plate_number) carsIndex[c.plate_number.toUpperCase()] = c; });
  }

  var matchedCar = null;
  if (student && Array.isArray(student.lessons)) {
    for (var ci = 0; ci < student.lessons.length; ci++) {
      var lp = student.lessons[ci] && student.lessons[ci].plaka;
      if (lp && carsIndex[lp.toUpperCase()]) { matchedCar = carsIndex[lp.toUpperCase()]; break; }
    }
  }

  var kurumIlIlce = kurumInfo ? extractIlIlceFromAdres(kurumInfo.kurum_adres || kurumInfo.kurumAdres) : null;
  var ilIlceVal = '';
  if (kurumIlIlce) {
    ilIlceVal = kurumIlIlce.il + ' / ' + kurumIlIlce.ilce;
  } else if (personnelIl && personnelIlce) {
    ilIlceVal = personnelIl.toLocaleUpperCase('tr-TR') + ' / ' + personnelIlce.toLocaleUpperCase('tr-TR');
  }

  var kursAdiRaw = (kurumInfo && (kurumInfo.kurum_adi || kurumInfo.kurumAdi)) ||
    personnelKurum ||
    (student && student.kurum) || '';
  var kursAdiVal = shortKursAdi(kursAdiRaw);
  var kursAdresVal = (kurumInfo && (kurumInfo.kurum_adres || kurumInfo.kurumAdres)) || '';
  // Strip trailing "İLÇE / İL" (and any preceding separator) so kurs adresi only
  // shows mahalle/cadde/no — il/ilçe is its own field.
  kursAdresVal = kursAdresVal.replace(/[\s ,\-/]*[A-Za-zÇĞİıÖŞÜçğöşü]+[\s ]*\/[\s ]*[A-Za-zÇĞİıÖŞÜçğöşü]+[\s .]*$/, '').trim();
  console.log('[KB] kurumInfo=', kurumInfo, '| kursAdiRaw=', JSON.stringify(kursAdiRaw), '| kursAdiVal=', JSON.stringify(kursAdiVal), '| kursAdresVal=', JSON.stringify(kursAdresVal));

  // ---- Section 1: Araç ve İzin Bilgileri ----
  var sec1 = mkSection('Araç ve İzin Bilgileri');
  mkField(sec1, 'Araç Cinsi', 'aracCinsi', {
    type: 'select',
    options: ['Otomobil', 'Motosiklet', 'Kamyon', 'Otobüs', 'Minibüs', 'Kamyonet', 'Traktör', 'Diğer']
  });
  var kurumRouteInitial = (kurumInfo && kurumInfo.kurum_route) || '';
  var gurzergahVal = kurumRouteInitial || (matchedCar && matchedCar.route) || lessonDersYeri || '';
  var gurzergahInp = mkField(sec1, 'Güzergah', 'gurzergah', { placeholder: 'Mahalle içi - Şehir merkezi', value: gurzergahVal });
  var lastSavedKurumRoute = kurumRouteInitial;
  var saveRouteIfChanged = function() {
    var val = gurzergahInp.value.trim();
    if (!val || val === lastSavedKurumRoute) return;
    lastSavedKurumRoute = val;
    if (kurumInfo) kurumInfo.kurum_route = val;
    console.log('MEBBIS_SAVE_KURUM_ROUTE:' + JSON.stringify({ route: val }));
  };
  gurzergahInp.addEventListener('change', saveRouteIfChanged);
  gurzergahInp.addEventListener('blur', saveRouteIfChanged);
  mkField(sec1, 'Gün / Saat', 'gunSaat', { placeholder: 'Pzt-Cu 09:00-17:00' });
  mkField(sec1, 'Düzenlenme Tarihi', 'duzenlenmeTarihi', { type: 'date', value: todayStr });
  mkField(sec1, 'Geçerlik Bitişi', 'gecerlikBitisi', { type: 'date', value: sixMonthsStr });
  mkField(sec1, 'Kurs Adı', 'mudurAd', { placeholder: 'Kurs adı', value: kursAdiVal });
  modal.appendChild(sec1);

  // ---- Section 2: Kurs / Kurum Bilgileri ----
  var sec2 = mkSection('Kurs / Kurum Bilgileri');
  mkField(sec2, 'İli / İlçesi', 'iliIlcesi', { placeholder: 'ANKARA / ÇANKAYA', value: ilIlceVal });
  mkField(sec2, 'Kurs Adı', 'kursAdi', { placeholder: 'Kurs adı', value: kursAdiVal });
  mkField(sec2, 'Belge No', 'belgeNo', { placeholder: '2026-001' });
  mkField(sec2, 'Belge Tarihi', 'belgeTarihi', { type: 'date', value: todayStr });
  mkField(sec2, 'Kurs Adresi', 'kursAdresi', { placeholder: 'Mahalle, Sokak, No, İlçe/İl', value: kursAdresVal });
  modal.appendChild(sec2);

  // ---- Section 3: Sürücü Adayı Bilgileri ----
  var sec3 = mkSection('Sürücü Adayı Bilgileri');
  mkField(sec3, 'TC Kimlik No', 'adayTc', { placeholder: '12345678901', maxLength: 11, value: (student && student.tc) || '' });
  mkField(sec3, 'Adı', 'adayAd', { placeholder: 'Ad', value: studentNames.ad });
  mkField(sec3, 'Soyadı', 'adaySoyad', { placeholder: 'Soyad', value: studentNames.soyad });
  var babaAdInp = mkField(sec3, 'Baba Adı', 'adayBabaAd', { placeholder: 'Baba adı', value: (student && student.babaAd) || '' });
  var dogumYeriInp = mkField(sec3, 'Doğum Yeri', 'adayDogumYeri', { placeholder: 'İl adı', value: (student && student.dogumYeri) || '' });
  var dogumTarihiInp = mkField(sec3, 'Doğum Tarihi', 'adayDogumTarihi', { type: 'date', value: (student && student.dogumTarihi) || '' });
  var adresInp = mkField(sec3, 'Adresi', 'adayAdresi', { placeholder: 'Mahalle, No, İlçe/İl', value: (student && student.adres) || '' });
  modal.appendChild(sec3);

  // Auto-save aday kişisel bilgileri to backend whenever the user blurs/changes
  // any of the 4 fields. Saved against the student's TC (read live from input).
  var lastSavedPersonal = {
    babaAd: (student && student.babaAd) || '',
    dogumYeri: (student && student.dogumYeri) || '',
    dogumTarihi: (student && student.dogumTarihi) || '',
    adres: (student && student.adres) || '',
  };
  var savePersonalIfChanged = function() {
    var tcInp = document.getElementById('kb-adayTc');
    var tc = (tcInp && tcInp.value || '').trim();
    if (!/^\d{11}$/.test(tc)) return;
    var current = {
      babaAd: babaAdInp.value.trim(),
      dogumYeri: dogumYeriInp.value.trim(),
      dogumTarihi: dogumTarihiInp.value.trim(),
      adres: adresInp.value.trim(),
    };
    var diff = {};
    var changed = false;
    ['babaAd','dogumYeri','dogumTarihi','adres'].forEach(function(k) {
      if (current[k] !== lastSavedPersonal[k]) { diff[k] = current[k]; changed = true; }
    });
    if (!changed) return;
    Object.assign(lastSavedPersonal, current);
    if (student) Object.assign(student, current);
    console.log('MEBBIS_SAVE_STUDENT_PERSONAL:' + JSON.stringify(Object.assign({ tc: tc }, diff)));
  };
  [babaAdInp, dogumYeriInp, dogumTarihiInp, adresInp].forEach(function(inp) {
    inp.addEventListener('change', savePersonalIfChanged);
    inp.addEventListener('blur', savePersonalIfChanged);
  });

  // ---- Section 4: Usta Öğretici Bilgileri ----
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
    var sel = null;
    for (var k = 0; k < personnelList.length; k++) {
      if (personnelList[k] && personnelList[k].tc === selTc) { sel = personnelList[k]; break; }
    }
    if (!sel) return;
    var nm = splitAdSoyad(sel.adSoyad || ((sel.ad || '') + ' ' + (sel.soyad || '')));
    var setVal = function(id, val) { var el = document.getElementById('kb-' + id); if (el && val !== undefined) el.value = val; };
    setVal('ustaTc', sel.tc || '');
    setVal('ustaAd', nm.ad);
    setVal('ustaSoyad', nm.soyad);
    setVal('ustaAdresi', [sel.ilce, sel.il].filter(Boolean).join('/'));
    setVal('ustaBelgeNo', sel.izinNo || '');
    setVal('ustaBelgeYeri', sel.il || '');
  };
  modal.appendChild(sec4);

  // ---- Submit row ----
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

    function v(id) { var el = document.getElementById('kb-' + id); return el ? el.value.trim() : ''; }
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
}
