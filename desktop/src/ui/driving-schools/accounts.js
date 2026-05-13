import { api, escapeHtml } from './utils.js';
import { state, isCurrentUserAdmin } from './state.js';
import { openModal } from './account-modal.js';

const accountListEl = document.getElementById('account-list');
const emptyStateEl  = document.getElementById('empty-state');

// ── Render ─────────────────────────────────────────────────────
export function renderAccounts() {
  const visible = isCurrentUserAdmin() && state.adminSearchQuery
    ? state.accounts.filter(a => {
        const q = state.adminSearchQuery.toLowerCase();
        return a.label.toLowerCase().includes(q) ||
               (a.ownerEmail && a.ownerEmail.toLowerCase().includes(q));
      })
    : state.accounts;

  const countEl = document.getElementById('admin-search-count');
  if (countEl && isCurrentUserAdmin()) {
    countEl.textContent = state.adminSearchQuery
      ? `${visible.length} / ${state.accounts.length}`
      : `${state.accounts.length} okul`;
  }

  if (visible.length === 0) {
    accountListEl.style.display = 'none';
    emptyStateEl.style.display  = 'block';
    if (isCurrentUserAdmin() && state.adminSearchQuery) {
      emptyStateEl.innerHTML = `<p>"${escapeHtml(state.adminSearchQuery)}" ile eşleşen okul bulunamadı.</p>`;
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
    const noSim        = !account.simulatorType;
    const subActive    = account.subscriptionActive !== false;
    const startDisabled = !subActive;
    const startTitle   = !subActive ? 'Abonelik gerekli' : (noSim ? 'Simülasyon Makinesi seçilmedi' : 'Başlat');
    const startLabel   = !subActive ? '🔒 Başlat' : (noSim ? '⚠ Başlat' : 'Başlat');
    const startClass   = !subActive ? 'btn-secondary' : (noSim ? 'btn-warning' : 'btn-success');
    const deleteBtn    = isCurrentUserAdmin()
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
        <button class="btn btn-sm btn-secondary" data-action="edit" data-id="${account.id}" title="Düzenle">Düzenle</button>
        ${deleteBtn}
      </div>
    </div>`;
  }).join('');
}

export async function refreshAccounts() {
  state.accounts = await api.listAccounts();
  renderAccounts();
}

// ── Admin Search ────────────────────────────────────────────────
document.getElementById('admin-search-input').addEventListener('input', (e) => {
  state.adminSearchQuery = e.target.value.trim();
  renderAccounts();
});

// ── Event Delegation ────────────────────────────────────────────
accountListEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  switch (action) {
    case 'start':      await startAccount(id);     break;
    case 'stop':       await stopAccount(id);      break;
    case 'focus':      await focusAccount(id);     break;
    case 'edit':       editAccount(id);            break;
    case 'remove':     await removeAccount(id);    break;
    case 'local-test': await localTestAccount(id); break;
  }
});

// ── Account stopped listener ────────────────────────────────────
api.onAccountStopped((id) => {
  const acc = state.accounts.find(a => a.id === id);
  if (acc) { acc.isRunning = false; renderAccounts(); }
});

// ── Actions ────────────────────────────────────────────────────
async function startAccount(id) {
  try {
    await api.startAccount(id);
    const acc = state.accounts.find(a => a.id === id);
    if (acc) acc.isRunning = true;
    renderAccounts();
  } catch (err) {
    if (err?.message === 'NO_SIMULATOR_TYPE') {
      const account = state.accounts.find(a => a.id === id);
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
    const acc = state.accounts.find(a => a.id === id);
    if (acc) acc.isRunning = false;
    renderAccounts();
  } catch (err) { console.error('Stop error:', err); }
}

async function focusAccount(id) {
  try { await api.focusAccount(id); }
  catch (err) { console.error('Focus error:', err); }
}

async function localTestAccount(id) {
  try { await api.localTest(id); }
  catch (err) {
    console.error('Local test error:', err);
    alert('Yerel test açılamadı: ' + (err?.message || err));
  }
}

function editAccount(id) {
  const account = state.accounts.find(a => a.id === id);
  if (account) openModal(account);
}

async function removeAccount(id) {
  const account = state.accounts.find(a => a.id === id);
  if (!account) return;
  if (!confirm(`"${account.label}" hesabını silmek istediğinize emin misiniz?\nOturum verileri de silinecektir.`)) return;
  try {
    await api.removeAccount(id);
    await refreshAccounts();
  } catch (err) { console.error('Remove error:', err); }
}
