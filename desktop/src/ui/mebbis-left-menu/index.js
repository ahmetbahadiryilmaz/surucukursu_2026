import { showDireksiyonModal } from './modals/direksiyon.js';
import { showSimulasyonModal } from './modals/simulasyon.js';
import { handleKBelgesi } from './k-belgesi/index.js';

if (document.getElementById('mebbis-left-menu')) {
  // already injected — nothing to do
} else {
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
    { label: 'Direksiyon Takip İndir',  action: 'direksiyon' },
    { label: 'Çoklu Direksiyon Takip',  action: 'coklu-direksiyon' },
    { label: 'Simulasyon Raporu Oluştur', action: 'simulasyon' },
    { label: 'Çoklu Simulasyon Raporu', action: 'coklu-simulasyon' },
    { label: 'K Belgesi Oluştur',       action: 'k-belgesi' },
  ];

  items.forEach(item => {
    const btn = document.createElement('button');
    btn.style.cssText =
      'background: none; border: none; width: 100%; padding: 12px 15px; text-align: left; color: #ccc; cursor: pointer; border-bottom: 1px solid #2a2a4a; font-size: 14px; transition: all 0.2s;';
    btn.textContent = item.label;
    btn.onmouseover = () => { btn.style.background = '#2a2a4a'; btn.style.color = '#4361ee'; };
    btn.onmouseout  = () => { btn.style.background = 'none';    btn.style.color = '#ccc'; };

    btn.onclick = () => {
      // Remove any existing modal before opening a new one
      const existing = document.getElementById('mebbis-modal-overlay');
      if (existing) existing.remove();

      if (item.action === 'simulasyon')        { showSimulasyonModal(); return; }
      if (item.action === 'coklu-direksiyon')  { console.log('MEBBIS_BATCH_DIREKSIYON'); return; }
      if (item.action === 'coklu-simulasyon')  { console.log('MEBBIS_BATCH_SIMULATOR'); return; }
      if (item.action === 'k-belgesi') {
        const store = window.__mebbisStore || { students: [], personnel: [] };
        handleKBelgesi(store);
        return;
      }
      // default: direksiyon
      showDireksiyonModal();
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

  // Re-entry hook: called by main process after fetching an unknown student.
  // Programmatically clicks the K Belgesi button, then auto-selects the student.
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
}
