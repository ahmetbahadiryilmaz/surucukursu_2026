import { api, cleanError } from './utils.js';
import { showMain, showLogin } from './views.js';
import { refreshAccounts } from './accounts.js';
import { maybeShowWhatsNew } from './whats-new.js';

const loginForm          = document.getElementById('login-form');
const loginEmailInput    = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginErrorEl       = document.getElementById('login-error');
const loginBtn           = document.getElementById('login-btn');
const loginToggleBtn     = document.getElementById('login-toggle-password');

loginToggleBtn.addEventListener('click', () => {
  const isPassword = loginPasswordInput.type === 'password';
  loginPasswordInput.type = isPassword ? 'text' : 'password';
  loginToggleBtn.querySelector('.eye-icon').style.display     = isPassword ? 'none'  : 'block';
  loginToggleBtn.querySelector('.eye-off-icon').style.display = isPassword ? 'block' : 'none';
});

export async function attemptLogin(email, password, autoLogin) {
  loginErrorEl.style.display = 'none';
  loginBtn.disabled    = true;
  loginBtn.textContent = 'Giriş yapılıyor…';
  try {
    const result = await api.authLogin(email, password, autoLogin);
    showMain(result.school, result.user);
    await refreshAccounts();
    await maybeShowWhatsNew();
    return true;
  } catch (err) {
    loginErrorEl.textContent   = cleanError(err) || 'Giriş başarısız. E-posta veya şifre hatalı.';
    loginErrorEl.style.display = 'block';
    if (autoLogin) await api.authSetAutoLogin(false).catch(() => {});
    return false;
  } finally {
    loginBtn.disabled    = false;
    loginBtn.textContent = 'Giriş Yap';
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = loginEmailInput.value.trim();
  const password = loginPasswordInput.value;
  if (!email || !password) return;
  const autoLogin = !!document.getElementById('login-auto-login')?.checked;
  await attemptLogin(email, password, autoLogin);
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  const savedEmail = await api.authGetSavedEmail();
  await api.authLogout();
  showLogin(savedEmail);
});
