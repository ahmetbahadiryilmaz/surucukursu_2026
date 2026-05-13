import { showKBGate } from './gate.js';
import { showKBSearch } from './search.js';
import { buildKBForm } from './form.js';

export function handleKBelgesi(store) {
  var students = Array.isArray(store.students) ? store.students : [];
  var personnel = Array.isArray(store.personnel) ? store.personnel : [];

  var hasKurum = !!(store.kurumInfo && (store.kurumInfo.kurum_adi || store.kurumInfo.kurumAdi));
  var hasPersonnel = personnel.length > 0;

  if (!hasKurum || !hasPersonnel) {
    showKBGate(!hasKurum ? 'kurum' : 'personel');
    return;
  }

  var overlay = document.createElement('div');
  overlay.id = 'mebbis-modal-overlay';
  overlay.style.cssText =
    'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 99999; display: flex; align-items: flex-start; justify-content: center; overflow-y: auto; padding: 20px 0;';

  // Pre-build form modal shell so openForm can swap overlay content
  var modal = document.createElement('div');
  modal.style.cssText =
    'background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 10px; padding: 24px 28px; width: 600px; font-family: Arial, sans-serif; color: white; margin: auto;';

  var kbModalTitle = document.createElement('h3');
  kbModalTitle.style.cssText = 'margin: 0 0 20px 0; color: #4361ee; font-size: 17px; border-bottom: 1px solid #2a2a4a; padding-bottom: 12px;';
  kbModalTitle.textContent = 'K Belgesi Oluştur';
  modal.appendChild(kbModalTitle);

  // showKBSearch appends overlay to body; overlay.onclick is set inside it
  showKBSearch(overlay, students, function(selectedStudent) {
    overlay.innerHTML = '';
    overlay.appendChild(modal);
    buildKBForm(modal, selectedStudent, personnel, store, overlay);
    var focusTarget = document.getElementById('kb-adayBabaAd') || document.getElementById('kb-adayTc');
    if (focusTarget) focusTarget.focus();
  });
}
