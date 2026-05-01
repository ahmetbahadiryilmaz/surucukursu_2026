(function () {
  console.log('[MEBBIS] Auto-fill script loaded');
  function tryFill() {
    const usernameField = document.getElementById('txtKullaniciAd');
    const passwordField = document.getElementById('txtSifre');
    if (usernameField && passwordField) {
      usernameField.value = __USERNAME__;
      passwordField.value = __PASSWORD__;
      usernameField.dispatchEvent(new Event('input', { bubbles: true }));
      usernameField.dispatchEvent(new Event('change', { bubbles: true }));
      passwordField.dispatchEvent(new Event('input', { bubbles: true }));
      passwordField.dispatchEvent(new Event('change', { bubbles: true }));
      setTimeout(() => {
        const submitBtn =
          document.getElementById('btnGiris') ||
          document.getElementById('dogrula') ||
          document.querySelector('button[id*="Giris"]') ||
          document.querySelector('button[id*="giris"]') ||
          document.querySelector('input[type="submit"]') ||
          Array.from(document.querySelectorAll('button')).find(b =>
            b.textContent.includes('Giriş') || b.textContent.includes('giriş')
          );
        if (submitBtn) { submitBtn.click(); }
        else { const f = usernameField.closest('form'); if (f) f.submit(); }
      }, 300);
      return true;
    }
    return false;
  }
  tryFill();
})();
