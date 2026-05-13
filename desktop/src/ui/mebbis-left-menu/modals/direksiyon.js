export function showDireksiyonModal() {
  const overlay = document.createElement('div');
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
    { label: 'Otomatik (ders sayısına göre)', value: '' },
    { label: 'Yeni B (16 ders)', value: '0,B|16' },
    { label: 'Yeni A (14 ders)', value: '0,A|14' },
    { label: 'A1 → A2 (6 ders)', value: 'A1,A2|6' },
    { label: 'A2 → A (12 ders)', value: 'A2,A|12' },
    { label: 'A → B (16 ders)', value: 'A,B|16' },
    { label: 'B → A1 (14 ders)', value: 'B,A1|14' },
    { label: 'B → A2 (14 ders)', value: 'B,A2|14' },
    { label: 'B → A (12 ders)', value: 'B,A|12' },
    { label: 'B → BE (6 ders)', value: 'B,BE|6' },
    { label: 'B → D1 (7 ders)', value: 'B,D1|7' },
    { label: 'B(2016 Öncesi) → C (16 ders)', value: 'B(2016 Öncesi),C|16' },
    { label: 'B(2016 Sonrası) → C (22 ders)', value: 'B(2016 Sonrası),C|22' },
    { label: 'B(2016 Öncesi) → D (9 ders)', value: 'B(2016 Öncesi),D|9' },
    { label: 'B(2016 Sonrası) → D (16 ders)', value: 'B(2016 Sonrası),D|16' },
    { label: 'C → CE (8 ders)', value: 'C,CE|8' },
    { label: 'C → D (9 ders)', value: 'C,D|9' },
    { label: 'C → D1 (4 ders)', value: 'C,D1|4' },
    { label: 'C → A2 (12 ders)', value: 'C,A2|12' },
    { label: 'D → C (12 ders)', value: 'D,C|12' },
    { label: 'D1 → D (6 ders)', value: 'D1,D|6' },
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
}
