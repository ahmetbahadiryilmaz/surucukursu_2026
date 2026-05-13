/**
 * Renders the "öğrenci ara" step into `overlay` and appends it to the DOM.
 * Calls `onSelect(student | null)` when the user picks a row or clicks Manuel doldur.
 */
export function showKBSearch(overlay, students, onSelect) {
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
      row.onclick = function() { onSelect(s); };
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
  manualBtn.onclick = function() { onSelect(null); };
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
}
