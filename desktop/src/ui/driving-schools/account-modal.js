import { api, cleanError } from './utils.js';
import { refreshAccounts } from './accounts.js';

const modalOverlay  = document.getElementById('modal-overlay');
const modalTitle    = document.getElementById('modal-title');
const accountForm   = document.getElementById('account-form');
const formId        = document.getElementById('form-id');
const formLabel     = document.getElementById('form-label');
const formUsername  = document.getElementById('form-username');
const formPassword  = document.getElementById('form-password');
const togglePasswordBtn = document.getElementById('toggle-password');
const btnCancel     = document.getElementById('btn-cancel');
const formSimulator = document.getElementById('form-simulator');
const modalSimError = document.getElementById('modal-sim-error');

togglePasswordBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const isPassword = formPassword.type === 'password';
  formPassword.type = isPassword ? 'text' : 'password';
  togglePasswordBtn.querySelector('.eye-icon').style.display    = isPassword ? 'none'  : 'block';
  togglePasswordBtn.querySelector('.eye-off-icon').style.display = isPassword ? 'block' : 'none';
});

export function openModal(editAccount) {
  const subscriptionInfo = document.getElementById('subscription-info');
  const subType          = document.getElementById('sub-type');
  const subEndsAt        = document.getElementById('sub-ends-at');
  const subPdfUsed       = document.getElementById('sub-pdf-used');

  if (editAccount) {
    modalTitle.textContent  = 'Hesap Düzenle';
    formId.value            = editAccount.id;
    formLabel.value         = editAccount.label;
    formUsername.value      = editAccount.username;
    formPassword.value      = editAccount.password;
    formSimulator.value     = editAccount.simulatorType || '';

    const sub = editAccount.subscription;
    if (sub) {
      const typeMap = { paid: 'Ücretli', demo: 'Demo', unlimited: 'Limitsiz' };
      subType.textContent = typeMap[sub.type] || sub.type || '-';
      subType.className   = 'subscription-info-value';

      if (sub.endsAt) {
        const d   = new Date(sub.endsAt * 1000);
        const now = Date.now() / 1000;
        const formatted = d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        subEndsAt.textContent = formatted;
        subEndsAt.className   = sub.endsAt < now ? 'subscription-info-value expired' : 'subscription-info-value active';
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
      subType.textContent = subEndsAt.textContent = subPdfUsed.textContent = '-';
      subType.className = subEndsAt.className = subPdfUsed.className = 'subscription-info-value';
    }
    subscriptionInfo.style.display = 'block';
  } else {
    modalTitle.textContent  = 'Hesap Ekle';
    formId.value            = '';
    formLabel.value         = '';
    formUsername.value      = '';
    formPassword.value      = '';
    formSimulator.value     = '';
    subscriptionInfo.style.display = 'none';
  }
  modalOverlay.style.display = 'flex';
  formLabel.focus();
}

export function closeModal() {
  modalOverlay.style.display = 'none';
  document.getElementById('subscription-info').style.display  = 'none';
  document.getElementById('modal-save-error').style.display   = 'none';
  accountForm.reset();
}

document.getElementById('btn-add').addEventListener('click', () => openModal(null));
btnCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

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
    const saveErrorEl = document.getElementById('modal-save-error');
    saveErrorEl.textContent   = cleanError(err) || 'Bir hata oluştu. Lütfen tekrar deneyin.';
    saveErrorEl.style.display = 'block';
  }
});
