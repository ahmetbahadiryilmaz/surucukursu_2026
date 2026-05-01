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
        { label: 'Yeni B (16 ders)', value: '0,B|16' },
        { label: 'Yeni A (14 ders)', value: '0,A|14' },
        { label: 'A1 \u2192 A2 (6 ders)', value: 'A1,A2|6' },
        { label: 'A2 \u2192 A (12 ders)', value: 'A2,A|12' },
        { label: 'A \u2192 B (14 ders)', value: 'A,B|14' },
        { label: 'B \u2192 A1 (12 ders)', value: 'B,A1|12' },
        { label: 'B \u2192 A2 (12 ders)', value: 'B,A2|12' },
        { label: 'B \u2192 A (12 ders)', value: 'B,A|12' },
        { label: 'B \u2192 BE (6 ders)', value: 'B,BE|6' },
        { label: 'B \u2192 C (12 ders)', value: 'B,C|12' },
        { label: 'B \u2192 D1 (7 ders)', value: 'B,D1|7' },
        { label: 'B(2016 \u00d6ncesi) \u2192 C (12 ders)', value: 'B(2016 \u00d6ncesi),C|12' },
        { label: 'B(2016 Sonras\u0131) \u2192 C (20 ders)', value: 'B(2016 Sonras\u0131),C|20' },
        { label: 'B(2016 \u00d6ncesi) \u2192 D (7 ders)', value: 'B(2016 \u00d6ncesi),D|7' },
        { label: 'C \u2192 CE (6 ders)', value: 'C,CE|6' },
        { label: 'C \u2192 D (7 ders)', value: 'C,D|7' },
        { label: 'C \u2192 D1 (4 ders)', value: 'C,D1|4' },
        { label: 'C \u2192 A2 (12 ders)', value: 'C,A2|12' },
        { label: 'D \u2192 C (10 ders)', value: 'D,C|10' },
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
})();
