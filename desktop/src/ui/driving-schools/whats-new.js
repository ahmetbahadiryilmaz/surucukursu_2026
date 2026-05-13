import { api, escapeHtml } from './utils.js';

export async function maybeShowWhatsNew() {
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
