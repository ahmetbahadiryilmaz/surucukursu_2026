import { api } from './utils.js';
import { showLogin, showForgot } from './views.js';

const WA_NUMBER = '905521870334';

function buildForgotPwWaUrl(schoolName) {
  const intro = schoolName
    ? `Merhaba, ben Sürücü Kursu ${schoolName} adına yazıyorum.`
    : 'Merhaba,';
  const text = `${intro} Şifremi sıfırlayamıyorum, yardımcı olabilir misiniz?`;
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
}

const WA_COMPLAINT_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Merhaba, bir istek veya şikayetim var. Yardımcı olabilir misiniz?')}`;

async function openForgotPwWa() {
  const schoolName = await api.authGetSavedSchool().catch(() => null);
  api.openExternal(buildForgotPwWaUrl(schoolName));
}

document.getElementById('forgot-link').addEventListener('click', () => showForgot());
document.getElementById('forgot-back-1').addEventListener('click', () => showLogin());
document.getElementById('forgot-back-2').addEventListener('click', () => {
  document.getElementById('forgot-step-1').style.display   = 'block';
  document.getElementById('forgot-step-2').style.display   = 'none';
  document.getElementById('forgot-error-2').style.display  = 'none';
  document.getElementById('forgot-success-2').style.display = 'none';
});

document.getElementById('wa-btn-login').addEventListener('click', () => api.openExternal(WA_COMPLAINT_URL));
document.getElementById('wa-btn-1').addEventListener('click', openForgotPwWa);
document.getElementById('wa-btn-2').addEventListener('click', openForgotPwWa);

document.getElementById('forgot-phone').addEventListener('input', (e) => {
  const input = /** @type {HTMLInputElement} */ (e.target);
  input.value = input.value.replace(/\D/g, '').slice(0, 10);
});

let forgotEmail = '';

document.getElementById('forgot-form-step1').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email   = document.getElementById('forgot-email').value.trim();
  const phone   = document.getElementById('forgot-phone').value.trim();
  const errorEl = document.getElementById('forgot-error-1');
  const btn     = document.getElementById('forgot-btn-1');

  if (!email || !phone) return;

  if (!/^(0000000000|5\d{9})$/.test(phone)) {
    errorEl.textContent   = 'Telefon 10 haneli ve 5 ile başlamalıdır (5XXXXXXXXX).';
    errorEl.style.display = 'block';
    return;
  }

  errorEl.style.display = 'none';
  btn.disabled    = true;
  btn.textContent = 'Gönderiliyor…';

  try {
    const result = await api.authForgotPassword(email, phone);
    if (result?.success === false) {
      errorEl.textContent   = result.message;
      errorEl.style.display = 'block';
    } else {
      forgotEmail = email;
      document.getElementById('forgot-step-1').style.display = 'none';
      document.getElementById('forgot-step-2').style.display = 'block';
    }
  } catch {
    errorEl.textContent   = 'Bağlantı hatası oluştu. Lütfen tekrar deneyin.';
    errorEl.style.display = 'block';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Kod Gönder';
  }
});

document.getElementById('forgot-toggle-password').addEventListener('click', () => {
  const input      = document.getElementById('forgot-new-password');
  const eyeIcon    = document.getElementById('forgot-toggle-password').querySelector('.eye-icon');
  const eyeOffIcon = document.getElementById('forgot-toggle-password').querySelector('.eye-off-icon');
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  eyeIcon.style.display    = isPassword ? 'none'  : 'block';
  eyeOffIcon.style.display = isPassword ? 'block' : 'none';
});

document.getElementById('forgot-form-step2').addEventListener('submit', async (e) => {
  e.preventDefault();
  const code        = document.getElementById('forgot-code').value.trim();
  const newPassword = document.getElementById('forgot-new-password').value;
  const errorEl     = document.getElementById('forgot-error-2');
  const successEl   = document.getElementById('forgot-success-2');
  const btn         = document.getElementById('forgot-btn-2');

  if (!code || !newPassword) return;

  errorEl.style.display   = 'none';
  successEl.style.display = 'none';
  btn.disabled    = true;
  btn.textContent = 'Sıfırlanıyor…';

  try {
    const result = await api.authResetPassword(forgotEmail, code, newPassword);
    if (result?.success === false) {
      errorEl.textContent   = result.message || 'Geçersiz kod veya bir hata oluştu.';
      errorEl.style.display = 'block';
      btn.disabled    = false;
      btn.textContent = 'Şifremi Sıfırla';
      return;
    }
    successEl.textContent   = result?.message || 'Şifreniz başarıyla güncellendi!';
    successEl.style.display = 'block';
    btn.disabled    = true;
    btn.textContent = 'Tamamlandı';
    setTimeout(() => {
      showLogin();
      btn.disabled    = false;
      btn.textContent = 'Şifremi Sıfırla';
    }, 2000);
  } catch {
    errorEl.textContent   = 'Bir hata oluştu. Lütfen tekrar deneyin.';
    errorEl.style.display = 'block';
    btn.disabled    = false;
    btn.textContent = 'Şifremi Sıfırla';
  }
});
