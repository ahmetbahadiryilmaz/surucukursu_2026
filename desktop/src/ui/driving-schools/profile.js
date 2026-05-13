import { api, cleanError } from './utils.js';

const profileOverlay = document.getElementById('profile-overlay');
const profileForm    = document.getElementById('profile-form');
const profileNameEl  = document.getElementById('profile-name');
const profileEmailEl = document.getElementById('profile-email');
const profilePhoneEl = document.getElementById('profile-phone');
const profileErrorEl = document.getElementById('profile-error');

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
    profileErrorEl.textContent   = 'Profil yüklenemedi: ' + (cleanError(err) || 'Bilinmeyen hata');
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
    profileErrorEl.textContent   = 'Telefon 10 haneli ve 5 ile başlamalıdır (5XXXXXXXXX).';
    profileErrorEl.style.display = 'block';
    return;
  }
  const saveBtn = document.getElementById('btn-profile-save');
  saveBtn.disabled = true;
  try {
    await api.profileUpdate(phone);
    profileOverlay.style.display = 'none';
  } catch (err) {
    profileErrorEl.textContent   = cleanError(err) || 'Kaydetme başarısız. Lütfen tekrar deneyin.';
    profileErrorEl.style.display = 'block';
  } finally {
    saveBtn.disabled = false;
  }
});
