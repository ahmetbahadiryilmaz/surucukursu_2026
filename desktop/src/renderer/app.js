// @ts-check

/** @type {typeof window.mebbisAPI} */
const api = /** @type {any} */ (window).mebbisAPI;

/**
 * Strip Electron IPC wrapper from error messages.
 * "Error invoking remote method 'auth:login': Error: <real msg>" -> "<real msg>"
 */
function cleanError(err) {
  const raw = err?.message || '';
  const m = raw.match(/Error invoking remote method '[^']+':\s*(?:Error:\s*)?(.+)$/);
  const msg = (m ? m[1] : raw).trim();
  // Last-resort: never expose internal URLs to the user
  return msg.replace(/https?:\/\/[^\s"'\])]+/g, '[server]').replace(/[^\s"'\])]*\.mtsk\.app[^\s"'\])]*/g, '[server]');
}

// ── Views ──────────────────────────────────────────────────────
const loginView  = document.getElementById('login-view');
const forgotView = document.getElementById('forgot-view');
const mainView   = document.getElementById('main-view');

function showLogin(prefill) {
  loginView.style.display  = 'flex';
  forgotView.style.display = 'none';
  mainView.style.display   = 'none';
  if (prefill && typeof prefill === 'object') {
    if (prefill.email) loginEmailInput.value = prefill.email;
    if (prefill.password) loginPasswordInput.value = prefill.password;
    if (typeof prefill.autoLogin === 'boolean') {
      const cb = document.getElementById('login-auto-login');
      if (cb) cb.checked = prefill.autoLogin;
    }
    if (loginPasswordInput.value) {
      // Have both fields filled — most likely they want to just submit.
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

function showForgot() {
  loginView.style.display  = 'none';
  forgotView.style.display = 'flex';
  mainView.style.display   = 'none';
  // Reset to step 1
  document.getElementById('forgot-step-1').style.display = 'block';
  document.getElementById('forgot-step-2').style.display = 'none';
  document.getElementById('forgot-email').value = '';
  document.getElementById('forgot-phone').value = '';
  document.getElementById('forgot-code').value  = '';
  document.getElementById('forgot-new-password').value = '';
  document.getElementById('forgot-error-1').style.display = 'none';
  document.getElementById('forgot-error-2').style.display = 'none';
  document.getElementById('forgot-success-2').style.display = 'none';
}

let currentSchool = null;
let currentUser = null;
let devMode = false;  // set to true once api.isDev() resolves

function isCurrentUserAdmin() {
  return currentUser && (currentUser.userType === -1 || currentUser.userType === -2);
}

function showMain(school, user) {
  loginView.style.display  = 'none';
  forgotView.style.display = 'none';
  mainView.style.display   = 'block';
  currentSchool = school || null;
  currentUser = user || null;
  const badge = document.getElementById('school-name');
  if (badge) {
    if (isCurrentUserAdmin()) {
      badge.textContent = 'Yönetici';
    } else {
      badge.textContent = (school && school.name) ? school.name : (typeof school === 'string' ? school : '');
    }
  }
  // Hide 'Hesap Ekle' for admins (they cannot create new schools from the desktop)
  const btnAddEl = document.getElementById('btn-add');
  if (btnAddEl) btnAddEl.style.display = isCurrentUserAdmin() ? 'none' : '';
  // Show / hide search bar
  const searchBar = document.getElementById('admin-search-bar');
  if (searchBar) searchBar.style.display = isCurrentUserAdmin() ? 'flex' : 'none';
  // Reset search on each login
  adminSearchQuery = '';
  const searchInput = document.getElementById('admin-search-input');
  if (searchInput) searchInput.value = '';
  // Show dev test toggle only in dev mode
  const btnDevTest = document.getElementById('btn-dev-test');
  if (btnDevTest) btnDevTest.style.display = devMode ? '' : 'none';
  // Always hide test panel on (re-)login
  const devPanel = document.getElementById('dev-test-panel');
  if (devPanel) devPanel.style.display = 'none';
  if (btnDevTest) btnDevTest.classList.remove('active');
}

// ── Login Form ─────────────────────────────────────────────────
const loginForm          = document.getElementById('login-form');
const loginEmailInput    = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginErrorEl       = document.getElementById('login-error');
const loginBtn           = document.getElementById('login-btn');
const loginToggleBtn     = document.getElementById('login-toggle-password');

loginToggleBtn.addEventListener('click', () => {
  const isPassword = loginPasswordInput.type === 'password';
  loginPasswordInput.type = isPassword ? 'text' : 'password';
  loginToggleBtn.querySelector('.eye-icon').style.display    = isPassword ? 'none'  : 'block';
  loginToggleBtn.querySelector('.eye-off-icon').style.display = isPassword ? 'block' : 'none';
});

async function attemptLogin(email, password, autoLogin) {
  loginErrorEl.style.display = 'none';
  loginBtn.disabled   = true;
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
    // If a saved-credential auto-submit just failed, drop the autoLogin flag
    // so the user isn't trapped in a loop on next launch.
    if (autoLogin) await api.authSetAutoLogin(false).catch(() => {});
    return false;
  } finally {
    loginBtn.disabled    = false;
    loginBtn.textContent = 'Giriş Yap';
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email      = loginEmailInput.value.trim();
  const password   = loginPasswordInput.value;
  if (!email || !password) return;
  const autoLogin  = !!document.getElementById('login-auto-login')?.checked;
  await attemptLogin(email, password, autoLogin);
});

// ── Logout ─────────────────────────────────────────────────────
document.getElementById('btn-logout').addEventListener('click', async () => {
  const savedEmail = await api.authGetSavedEmail();
  await api.authLogout();
  showLogin(savedEmail);
});

// ── Dev Test Panel ─────────────────────────────────────────────
document.getElementById('btn-dev-test').addEventListener('click', () => {
  const panel = document.getElementById('dev-test-panel');
  const btn   = document.getElementById('btn-dev-test');
  const open  = panel.style.display !== 'none';
  panel.style.display = open ? 'none' : 'block';
  btn.classList.toggle('active', !open);
});

document.getElementById('dev-btn-direksiyon').addEventListener('click', async () => {
  const sinif  = document.getElementById('dev-sinif-select').value;
  const statusEl = document.getElementById('dev-direksiyon-status');
  const btn    = document.getElementById('dev-btn-direksiyon');
  btn.disabled = true;
  statusEl.className = 'dev-status';
  statusEl.textContent = 'PDF oluşturuluyor…';
  try {
    await api.devTestDireksiyonPdf(sinif);
    statusEl.className = 'dev-status ok';
    statusEl.textContent = '✓ PDF oluşturuldu ve açıldı.';
  } catch (err) {
    statusEl.className = 'dev-status err';
    statusEl.textContent = '✗ ' + (cleanError(err) || 'Hata oluştu.');
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('dev-btn-simulator').addEventListener('click', async () => {
  const simType  = document.querySelector('input[name="dev-sim-type"]:checked')?.value || 'sesim';
  const statusEl = document.getElementById('dev-simulator-status');
  const btn      = document.getElementById('dev-btn-simulator');
  btn.disabled = true;
  statusEl.className = 'dev-status';
  statusEl.textContent = 'PDF oluşturuluyor…';
  try {
    await api.devTestSimulatorPdf(simType);
    statusEl.className = 'dev-status ok';
    statusEl.textContent = '✓ PDF(ler) oluşturuldu, klasör açıldı.';
  } catch (err) {
    statusEl.className = 'dev-status err';
    statusEl.textContent = '✗ ' + (cleanError(err) || 'Hata oluştu.');
  } finally {
    btn.disabled = false;
  }
});

// ── Forgot Password ────────────────────────────────────────────
document.getElementById('forgot-link').addEventListener('click', () => showForgot());
document.getElementById('forgot-back-1').addEventListener('click', () => showLogin());
document.getElementById('forgot-back-2').addEventListener('click', () => {
  document.getElementById('forgot-step-1').style.display = 'block';
  document.getElementById('forgot-step-2').style.display = 'none';
  document.getElementById('forgot-error-2').style.display = 'none';
  document.getElementById('forgot-success-2').style.display = 'none';
});

// WhatsApp support buttons
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

document.getElementById('wa-btn-login').addEventListener('click', () => api.openExternal(WA_COMPLAINT_URL));
document.getElementById('wa-btn-1').addEventListener('click', openForgotPwWa);
document.getElementById('wa-btn-2').addEventListener('click', openForgotPwWa);

// Phone: digits only, max 10 (5XXXXXXXXX). 0000000000 acts as bypass code.
document.getElementById('forgot-phone').addEventListener('input', (e) => {
  const input = /** @type {HTMLInputElement} */ (e.target);
  input.value = input.value.replace(/\D/g, '').slice(0, 10);
});

let forgotEmail = '';

document.getElementById('forgot-form-step1').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value.trim();
  const phone  = document.getElementById('forgot-phone').value.trim();
  const errorEl = document.getElementById('forgot-error-1');
  const btn     = document.getElementById('forgot-btn-1');

  if (!email || !phone) return;

  // Validate phone format (10 digits starting with 5; allow 0000000000 as bypass)
  if (!/^(0000000000|5\d{9})$/.test(phone)) {
    errorEl.textContent = 'Telefon 10 haneli ve 5 ile başlamalıdır (5XXXXXXXXX).';
    errorEl.style.display = 'block';
    return;
  }

  errorEl.style.display = 'none';
  btn.disabled = true;
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
  } catch (err) {
    errorEl.textContent   = 'Bağlantı hatası oluştu. Lütfen tekrar deneyin.';
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Kod Gönder';
  }
});

document.getElementById('forgot-toggle-password').addEventListener('click', () => {
  const input = document.getElementById('forgot-new-password');
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
  btn.disabled = true;
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
    btn.disabled = true;
    btn.textContent = 'Tamamlandı';
    // Return to login after 2s
    setTimeout(() => {
      showLogin();
      btn.disabled = false;
      btn.textContent = 'Şifremi Sıfırla';
    }, 2000);
  } catch (err) {
    errorEl.textContent   = 'Bir hata oluştu. Lütfen tekrar deneyin.';
    errorEl.style.display = 'block';
    btn.disabled    = false;
    btn.textContent = 'Şifremi Sıfırla';
  }
});

// ── Account Manager (unchanged logic) ─────────────────────────
const accountListEl = document.getElementById('account-list');
const emptyStateEl  = document.getElementById('empty-state');
const btnAdd        = document.getElementById('btn-add');
const modalOverlay  = document.getElementById('modal-overlay');
const modalTitle    = document.getElementById('modal-title');
const accountForm   = document.getElementById('account-form');
const formId        = document.getElementById('form-id');
const formLabel     = document.getElementById('form-label');
const formUsername  = document.getElementById('form-username');
const formPassword  = document.getElementById('form-password');
const togglePasswordBtn = document.getElementById('toggle-password');
const btnCancel       = document.getElementById('btn-cancel');
const formSimulator   = document.getElementById('form-simulator');
const modalSimError   = document.getElementById('modal-sim-error');

let accounts = [];
let adminSearchQuery = '';

// --- Admin Search ---
document.getElementById('admin-search-input').addEventListener('input', (e) => {
  adminSearchQuery = e.target.value.trim();
  renderAccounts();
});

// --- Password Toggle (MEBBIS form) ---
togglePasswordBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const isPassword = formPassword.type === 'password';
  formPassword.type = isPassword ? 'text' : 'password';

  const eyeIcon    = togglePasswordBtn.querySelector('.eye-icon');
  const eyeOffIcon = togglePasswordBtn.querySelector('.eye-off-icon');

  if (isPassword) {
    eyeIcon.style.display    = 'none';
    eyeOffIcon.style.display = 'block';
  } else {
    eyeIcon.style.display    = 'block';
    eyeOffIcon.style.display = 'none';
  }
});

// --- Modal ---
function openModal(editAccount) {
  const subscriptionInfo = document.getElementById('subscription-info');
  const subType          = document.getElementById('sub-type');
  const subEndsAt        = document.getElementById('sub-ends-at');
  const subPdfUsed       = document.getElementById('sub-pdf-used');

  if (editAccount) {
    modalTitle.textContent = 'Hesap Düzenle';
    formId.value        = editAccount.id;
    formLabel.value     = editAccount.label;
    formUsername.value  = editAccount.username;
    formPassword.value  = editAccount.password;
    formSimulator.value = editAccount.simulatorType || '';

    // Populate subscription info
    const sub = editAccount.subscription;
    if (sub) {
      const typeMap = { paid: 'Ücretli', demo: 'Demo', unlimited: 'Limitsiz' };
      subType.textContent = typeMap[sub.type] || sub.type || '-';
      subType.className   = 'subscription-info-value';

      if (sub.endsAt) {
        const d = new Date(sub.endsAt * 1000);
        const now = Date.now() / 1000;
        const formatted = d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        subEndsAt.textContent = formatted;
        subEndsAt.className   = sub.endsAt < now
          ? 'subscription-info-value expired'
          : 'subscription-info-value active';
      } else {
        subEndsAt.textContent = 'Süresiz';
        subEndsAt.className   = 'subscription-info-value active';
      }

      const limit = sub.pdfPrintLimit;
      subPdfUsed.textContent = limit
        ? `${sub.pdfPrintUsed} / ${limit.toLocaleString('tr-TR')}`
        : `${sub.pdfPrintUsed}`;
      subPdfUsed.className = 'subscription-info-value';
    } else {
      subType.textContent   = '-';
      subEndsAt.textContent = '-';
      subPdfUsed.textContent = '-';
      subType.className = subEndsAt.className = subPdfUsed.className = 'subscription-info-value';
    }
    subscriptionInfo.style.display = 'block';
  } else {
    modalTitle.textContent = 'Hesap Ekle';
    formId.value        = '';
    formLabel.value     = '';
    formUsername.value  = '';
    formPassword.value  = '';
    formSimulator.value = '';
    subscriptionInfo.style.display = 'none';
  }
  modalOverlay.style.display = 'flex';
  formLabel.focus();
}

function closeModal() {
  modalOverlay.style.display = 'none';
  document.getElementById('subscription-info').style.display = 'none';
  document.getElementById('modal-save-error').style.display = 'none';
  accountForm.reset();
}

btnAdd.addEventListener('click', () => openModal(null));
btnCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

accountForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id            = formId.value;
  const label         = formLabel.value.trim();
  const username      = formUsername.value.trim();
  const password      = formPassword.value;
  const simulatorType = formSimulator.value || undefined;

  modalSimError.style.display = 'none';
  document.getElementById('modal-save-error').style.display = 'none';
  if (!label || !username || !password) return;
  if (!simulatorType) {
    modalSimError.style.display = 'block';
    formSimulator.focus();
    return;
  }

  try {
    if (id) {
      await api.updateAccount(id, { label, username, password, simulatorType });
    } else {
      const newAccount = await api.addAccount(username, password, label);
      if (newAccount && simulatorType) {
        await api.updateAccount(newAccount.id, { simulatorType });
      }
    }
    closeModal();
    await refreshAccounts();
  } catch (err) {
    console.error('Save error:', err);
    const saveErrorEl = document.getElementById('modal-save-error');
    saveErrorEl.textContent = cleanError(err) || 'Bir hata oluştu. Lütfen tekrar deneyin.';
    saveErrorEl.style.display = 'block';
  }
});

// --- Profile / Hesap Ayarları Modal ---
const profileOverlay   = document.getElementById('profile-overlay');
const profileForm      = document.getElementById('profile-form');
const profileNameEl    = document.getElementById('profile-name');
const profileEmailEl   = document.getElementById('profile-email');
const profilePhoneEl   = document.getElementById('profile-phone');
const profileErrorEl   = document.getElementById('profile-error');

profilePhoneEl.addEventListener('input', (e) => {
  const input = /** @type {HTMLInputElement} */ (e.target);
  input.value = input.value.replace(/\D/g, '').slice(0, 10);
});

document.getElementById('btn-profile').addEventListener('click', async () => {
  profileErrorEl.style.display = 'none';
  profileNameEl.value  = '';
  profileEmailEl.value = '';
  profilePhoneEl.value = '';
  profileOverlay.style.display = 'flex';
  try {
    const p = await api.profileGet();
    profileNameEl.value  = p.name  || '';
    profileEmailEl.value = p.email || '';
    profilePhoneEl.value = p.phone || '';
  } catch (err) {
    profileErrorEl.textContent = 'Profil yüklenemedi: ' + (cleanError(err) || 'Bilinmeyen hata');
    profileErrorEl.style.display = 'block';
  }
});

document.getElementById('btn-profile-cancel').addEventListener('click', () => {
  profileOverlay.style.display = 'none';
});
profileOverlay.addEventListener('click', (e) => {
  if (e.target === profileOverlay) profileOverlay.style.display = 'none';
});

profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  profileErrorEl.style.display = 'none';
  const phone = profilePhoneEl.value.trim();
  if (!phone) return;
  if (!/^5\d{9}$/.test(phone)) {
    profileErrorEl.textContent = 'Telefon 10 haneli ve 5 ile başlamalıdır (5XXXXXXXXX).';
    profileErrorEl.style.display = 'block';
    return;
  }
  const saveBtn = document.getElementById('btn-profile-save');
  saveBtn.disabled = true;
  try {
    await api.profileUpdate(phone);
    profileOverlay.style.display = 'none';
  } catch (err) {
    profileErrorEl.textContent = cleanError(err) || 'Kaydetme başarısız. Lütfen tekrar deneyin.';
    profileErrorEl.style.display = 'block';
  } finally {
    saveBtn.disabled = false;
  }
});

// --- Rendering ---
function renderAccounts() {
  // Apply search filter for admin users
  const visible = isCurrentUserAdmin() && adminSearchQuery
    ? accounts.filter(a => {
        const q = adminSearchQuery.toLowerCase();
        return a.label.toLowerCase().includes(q) ||
               (a.ownerEmail && a.ownerEmail.toLowerCase().includes(q));
      })
    : accounts;

  // Update count badge
  const countEl = document.getElementById('admin-search-count');
  if (countEl && isCurrentUserAdmin()) {
    countEl.textContent = adminSearchQuery
      ? `${visible.length} / ${accounts.length}`
      : `${accounts.length} okul`;
  }

  if (visible.length === 0) {
    accountListEl.style.display = 'none';
    emptyStateEl.style.display  = 'block';
    if (isCurrentUserAdmin() && adminSearchQuery) {
      emptyStateEl.innerHTML = `<p>"${escapeHtml(adminSearchQuery)}" ile eşleşen okul bulunamadı.</p>`;
    } else if (isCurrentUserAdmin()) {
      emptyStateEl.innerHTML = `
        <p>Sistemde kayıtlı sürücü kursu bulunamadı.</p>
        <p style="font-size:0.85em;color:#888;">Yönetici girişiyle bağlandınız. Sunucuya ulaşılamıyorsa konsol loglarını kontrol edin.</p>`;
    } else {
      emptyStateEl.innerHTML = `
        <p>Henüz hesap eklenmedi.</p>
        <p>Yukarıdaki "Hesap Ekle" butonuna tıklayarak başlayın.</p>`;
    }
    return;
  }
  accountListEl.style.display = 'flex';
  emptyStateEl.style.display  = 'none';

  accountListEl.innerHTML = visible.map(account => {
    const noSim = !account.simulatorType;
    const subActive = account.subscriptionActive !== false;
    const startDisabled = !subActive;
    const startTitle = !subActive
      ? 'Abonelik gerekli'
      : (noSim ? 'Simülasyon Makinesi seçilmedi' : 'Başlat');
    const startLabel = !subActive
      ? '🔒 Başlat'
      : (noSim ? '⚠ Başlat' : 'Başlat');
    const startClass = !subActive
      ? 'btn-secondary'
      : (noSim ? 'btn-warning' : 'btn-success');
    const deleteBtn = isCurrentUserAdmin()
      ? ''
      : `<button class="btn btn-sm btn-danger" data-action="remove" data-id="${account.id}" title="Sil">Sil</button>`;
    const localTestBtn = (account.ownerEmail === 'batuhan33mtsk@gmail.com')
      ? `<button class="btn btn-sm btn-info" data-action="local-test" data-id="${account.id}" title="Yerel test ortamını aç">Local test</button>`
      : '';
    return `
    <div class="account-card ${account.isRunning ? 'running' : ''} ${noSim ? 'no-simulator' : ''} ${!subActive ? 'disabled-subscription' : ''}" data-id="${account.id}">
      <div class="account-status"></div>
      <div class="account-info">
        <div class="account-label">${escapeHtml(account.label)}</div>
        <div class="account-username">${escapeHtml(account.username)}</div>
        ${isCurrentUserAdmin() && account.ownerEmail ? `<div class="account-owner-email">${escapeHtml(account.ownerEmail)}</div>` : ''}
        ${!subActive ? '<div class="sim-warning">🔒 Abonelik gerekli — bu okul için aktif abonelik bulunmuyor</div>' : ''}
        ${subActive && noSim ? '<div class="sim-warning">⚠ Simülasyon Makinesi seçilmedi — başlatmadan önce düzenleyin</div>' : ''}
      </div>
      <div class="account-actions">
        ${account.isRunning ? `
          <button class="btn btn-sm btn-success" data-action="focus" data-id="${account.id}" title="Pencereye Git">Göster</button>
          <button class="btn btn-sm btn-warning" data-action="stop"  data-id="${account.id}" title="Durdur">Durdur</button>
        ` : `
          <button class="btn btn-sm ${startClass}" data-action="start" data-id="${account.id}" title="${startTitle}" ${startDisabled ? 'disabled' : ''}>${startLabel}</button>
          ${localTestBtn}
        `}
        <button class="btn btn-sm btn-secondary" data-action="edit"   data-id="${account.id}" title="Düzenle">Düzenle</button>
        ${deleteBtn}
      </div>
    </div>
  `;
  }).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// --- Event Delegation ---
accountListEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id     = btn.dataset.id;

  switch (action) {
    case 'start':       await startAccount(id);      break;
    case 'stop':        await stopAccount(id);       break;
    case 'focus':       await focusAccount(id);      break;
    case 'edit':        await editAccount(id);       break;
    case 'remove':      await removeAccount(id);     break;
    case 'local-test':  await localTestAccount(id);  break;
  }
});

// --- Actions ---
async function refreshAccounts() {
  accounts = await api.listAccounts();
  renderAccounts();
}

async function startAccount(id) {
  try {
    await api.startAccount(id);
    const acc = accounts.find(a => a.id === id);
    if (acc) acc.isRunning = true;
    renderAccounts();
  } catch (err) {
    if (err?.message === 'NO_SIMULATOR_TYPE') {
      const account = accounts.find(a => a.id === id);
      if (account) openModal(account);
    } else if (err?.message === 'SUBSCRIPTION_INACTIVE') {
      alert('Bu okul için aktif abonelik bulunmuyor. Lütfen yöneticinizle iletişime geçin.');
    } else {
      console.error('Start error:', err);
    }
  }
}

async function stopAccount(id) {
  try {
    await api.stopAccount(id);
    const acc = accounts.find(a => a.id === id);
    if (acc) acc.isRunning = false;
    renderAccounts();
  } catch (err) {
    console.error('Stop error:', err);
  }
}

async function focusAccount(id) {
  try {
    await api.focusAccount(id);
  } catch (err) {
    console.error('Focus error:', err);
  }
}

async function localTestAccount(id) {
  try {
    await api.localTest(id);
  } catch (err) {
    console.error('Local test error:', err);
    alert('Yerel test açılamadı: ' + (err?.message || err));
  }
}

async function editAccount(id) {
  const account = accounts.find(a => a.id === id);
  if (account) openModal(account);
}

async function removeAccount(id) {
  const account = accounts.find(a => a.id === id);
  if (!account) return;
  if (!confirm(`"${account.label}" hesabını silmek istediğinize emin misiniz?\nOturum verileri de silinecektir.`)) return;
  try {
    await api.removeAccount(id);
    await refreshAccounts();
  } catch (err) {
    console.error('Remove error:', err);
  }
}

// Listen for account stopped events from main process
api.onAccountStopped((id) => {
  const acc = accounts.find(a => a.id === id);
  if (acc) {
    acc.isRunning = false;
    renderAccounts();
  }
});

// ── What's New ─────────────────────────────────────────────────
async function maybeShowWhatsNew() {
  try {
    const data = await api.whatsNewCheck();
    if (!data) return;
    const overlay = document.getElementById('whats-new-overlay');
    const title   = document.getElementById('whats-new-title');
    const list    = document.getElementById('whats-new-list');
    title.textContent = `🎉 v${data.version} — Yenilikler`;
    list.innerHTML = data.lines.map(l => `<li>${escapeHtml(l)}</li>`).join('');
    overlay.style.display = 'flex';
  } catch { /* non-critical */ }
}

document.getElementById('whats-new-ok').addEventListener('click', async () => {
  document.getElementById('whats-new-overlay').style.display = 'none';
  await api.whatsNewDismiss().catch(() => {});
});

// ── About / Hakkında Modal ──────────────────────────────────────
const aboutOverlay = document.getElementById('about-overlay');
let cachedAppVersion = null;
let cachedCodeVersion = null;

document.getElementById('btn-about').addEventListener('click', () => {
  document.getElementById('about-app-version').textContent =
    cachedAppVersion ? `v${cachedAppVersion}` : '—';
  document.getElementById('about-code-version').textContent =
    cachedCodeVersion ? `v${cachedCodeVersion}` : '—';
  aboutOverlay.style.display = 'flex';
});

function renderVersionBadge() {
  const badge = document.getElementById('code-version');
  if (!badge) return;
  const parts = [];
  if (cachedAppVersion) parts.push(`app v${cachedAppVersion}`);
  if (cachedCodeVersion && cachedCodeVersion !== cachedAppVersion) {
    parts.push(`code v${cachedCodeVersion}`);
  }
  badge.textContent = parts.join(' · ');
}

document.getElementById('btn-about-close').addEventListener('click', () => {
  aboutOverlay.style.display = 'none';
});

// ── Bootstrap: always show login first; user must click to proceed ──
(async () => {
  // Resolve dev mode before anything else so showMain can use it
  devMode = await api.isDev().catch(() => false);

  // Resolve app + remote code versions; surfaced via the Hakkında modal
  // and the fixed bottom-right badge.
  const [appVer, codeVer] = await Promise.all([
    api.getAppVersion().catch(() => null),
    api.getCodeVersion().catch(() => null),
  ]);
  cachedAppVersion = appVer;
  cachedCodeVersion = codeVer;
  renderVersionBadge();

  // Subscribe to live version updates from the main-process code loader.
  // Fires after first sync completes (if it lagged the renderer init) and
  // any time background polling detects a server-side bump.
  if (api.onCodeVersionUpdated) {
    api.onCodeVersionUpdated((newVersion) => {
      cachedCodeVersion = newVersion;
      renderVersionBadge();
    });
  }

  // Always start at the login screen — never bypass it with a cached token.
  // Pre-fill credentials from the encrypted store so the user only has to
  // click "Giriş Yap" (or do nothing if they ticked Otomatik giriş).
  const creds = await api.authGetSavedCredentials().catch(() => null);
  showLogin(creds || (await api.authGetSavedEmail().catch(() => null)));

  if (creds && creds.autoLogin && creds.email && creds.password) {
    attemptLogin(creds.email, creds.password, true);
  }
})();

