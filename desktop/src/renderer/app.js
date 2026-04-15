// @ts-check

/** @type {typeof window.mebbisAPI} */
const api = /** @type {any} */ (window).mebbisAPI;

const accountListEl = document.getElementById('account-list');
const emptyStateEl = document.getElementById('empty-state');
const btnAdd = document.getElementById('btn-add');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const accountForm = document.getElementById('account-form');
const formId = document.getElementById('form-id');
const formLabel = document.getElementById('form-label');
const formUsername = document.getElementById('form-username');
const formPassword = document.getElementById('form-password');
const togglePasswordBtn = document.getElementById('toggle-password');
const btnCancel = document.getElementById('btn-cancel');

let accounts = [];

// --- Password Toggle ---
togglePasswordBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const isPassword = formPassword.type === 'password';
  formPassword.type = isPassword ? 'text' : 'password';
  
  const eyeIcon = togglePasswordBtn.querySelector('.eye-icon');
  const eyeOffIcon = togglePasswordBtn.querySelector('.eye-off-icon');
  
  if (isPassword) {
    eyeIcon.style.display = 'none';
    eyeOffIcon.style.display = 'block';
  } else {
    eyeIcon.style.display = 'block';
    eyeOffIcon.style.display = 'none';
  }
});

// --- Modal ---
function openModal(editAccount) {
  if (editAccount) {
    modalTitle.textContent = 'Hesap Düzenle';
    formId.value = editAccount.id;
    formLabel.value = editAccount.label;
    formUsername.value = editAccount.username;
    formPassword.value = editAccount.password;
  } else {
    modalTitle.textContent = 'Hesap Ekle';
    formId.value = '';
    formLabel.value = '';
    formUsername.value = '';
    formPassword.value = '';
  }
  modalOverlay.style.display = 'flex';
  formLabel.focus();
}

function closeModal() {
  modalOverlay.style.display = 'none';
  accountForm.reset();
}

btnAdd.addEventListener('click', () => openModal(null));
btnCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

accountForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = formId.value;
  const label = formLabel.value.trim();
  const username = formUsername.value.trim();
  const password = formPassword.value;

  if (!label || !username || !password) return;

  try {
    if (id) {
      await api.updateAccount(id, { label, username, password });
    } else {
      await api.addAccount(username, password, label);
    }
    closeModal();
    await refreshAccounts();
  } catch (err) {
    console.error('Save error:', err);
  }
});

// --- Rendering ---
function renderAccounts() {
  if (accounts.length === 0) {
    accountListEl.style.display = 'none';
    emptyStateEl.style.display = 'block';
    return;
  }
  accountListEl.style.display = 'flex';
  emptyStateEl.style.display = 'none';

  accountListEl.innerHTML = accounts.map(account => `
    <div class="account-card ${account.isRunning ? 'running' : ''}" data-id="${account.id}">
      <div class="account-status"></div>
      <div class="account-info">
        <div class="account-label">${escapeHtml(account.label)}</div>
        <div class="account-username">${escapeHtml(account.username)}</div>
      </div>
      <div class="account-actions">
        ${account.isRunning ? `
          <button class="btn btn-sm btn-success" data-action="focus" data-id="${account.id}" title="Pencereye Git">Göster</button>
          <button class="btn btn-sm btn-warning" data-action="stop" data-id="${account.id}" title="Durdur">Durdur</button>
        ` : `
          <button class="btn btn-sm btn-success" data-action="start" data-id="${account.id}" title="Başlat">Başlat</button>
        `}
        <button class="btn btn-sm btn-secondary" data-action="edit" data-id="${account.id}" title="Düzenle">Düzenle</button>
        <button class="btn btn-sm btn-danger" data-action="remove" data-id="${account.id}" title="Sil">Sil</button>
      </div>
    </div>
  `).join('');
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
  const id = btn.dataset.id;
  
  switch (action) {
    case 'start': await startAccount(id); break;
    case 'stop': await stopAccount(id); break;
    case 'focus': await focusAccount(id); break;
    case 'edit': await editAccount(id); break;
    case 'remove': await removeAccount(id); break;
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
    console.error('Start error:', err);
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

// Initial load
refreshAccounts();
