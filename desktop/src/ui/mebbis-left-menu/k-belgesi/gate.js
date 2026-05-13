export function showKBGate(missingKind) {
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
}
