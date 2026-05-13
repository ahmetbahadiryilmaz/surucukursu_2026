export function showSimulasyonModal() {
  const overlay = document.createElement('div');
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
}
