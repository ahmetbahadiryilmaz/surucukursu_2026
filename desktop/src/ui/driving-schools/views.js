import { state, isCurrentUserAdmin } from './state.js';

const loginView  = document.getElementById('login-view');
const forgotView = document.getElementById('forgot-view');
const mainView   = document.getElementById('main-view');

const loginEmailInput    = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');

export function showLogin(prefill) {
  loginView.style.display  = 'flex';
  forgotView.style.display = 'none';
  mainView.style.display   = 'none';
  if (prefill && typeof prefill === 'object') {
    if (prefill.email)    loginEmailInput.value    = prefill.email;
    if (prefill.password) loginPasswordInput.value = prefill.password;
    if (typeof prefill.autoLogin === 'boolean') {
      const cb = document.getElementById('login-auto-login');
      if (cb) cb.checked = prefill.autoLogin;
    }
    if (loginPasswordInput.value) {
      document.getElementById('login-btn').focus();
    } else {
      loginPasswordInput.focus();
    }
  } else if (typeof prefill === 'string' && prefill) {
    loginEmailInput.value    = prefill;
    loginPasswordInput.value = '';
    loginPasswordInput.focus();
  }
}

export function showForgot() {
  loginView.style.display  = 'none';
  forgotView.style.display = 'flex';
  mainView.style.display   = 'none';
  document.getElementById('forgot-step-1').style.display = 'block';
  document.getElementById('forgot-step-2').style.display = 'none';
  document.getElementById('forgot-email').value          = '';
  document.getElementById('forgot-phone').value          = '';
  document.getElementById('forgot-code').value           = '';
  document.getElementById('forgot-new-password').value   = '';
  document.getElementById('forgot-error-1').style.display   = 'none';
  document.getElementById('forgot-error-2').style.display   = 'none';
  document.getElementById('forgot-success-2').style.display = 'none';
}

export function showMain(school, user) {
  loginView.style.display  = 'none';
  forgotView.style.display = 'none';
  mainView.style.display   = 'block';
  state.currentSchool = school || null;
  state.currentUser   = user   || null;

  const badge = document.getElementById('school-name');
  if (badge) {
    badge.textContent = isCurrentUserAdmin()
      ? 'Yönetici'
      : ((school && school.name) ? school.name : (typeof school === 'string' ? school : ''));
  }

  const btnAddEl = document.getElementById('btn-add');
  if (btnAddEl) btnAddEl.style.display = isCurrentUserAdmin() ? 'none' : '';

  const searchBar = document.getElementById('admin-search-bar');
  if (searchBar) searchBar.style.display = isCurrentUserAdmin() ? 'flex' : 'none';

  state.adminSearchQuery = '';
  const searchInput = document.getElementById('admin-search-input');
  if (searchInput) searchInput.value = '';

  const btnDevTest = document.getElementById('btn-dev-test');
  if (btnDevTest) btnDevTest.style.display = state.devMode ? '' : 'none';

  const devPanel = document.getElementById('dev-test-panel');
  if (devPanel) devPanel.style.display = 'none';
  if (btnDevTest) btnDevTest.classList.remove('active');
}
