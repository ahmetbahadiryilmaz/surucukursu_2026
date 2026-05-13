import { api, cleanError } from './utils.js';

const aboutOverlay = document.getElementById('about-overlay');

export const versionState = { app: null, code: null };

export function renderVersionBadge() {
  const badge = document.getElementById('code-version');
  if (!badge) return;
  const parts = [];
  if (versionState.app) parts.push(`app v${versionState.app}`);
  if (versionState.code && versionState.code !== versionState.app) parts.push(`code v${versionState.code}`);
  badge.textContent = parts.join(' · ');
}

// ── About modal ────────────────────────────────────────────────
document.getElementById('btn-about').addEventListener('click', () => {
  document.getElementById('about-app-version').textContent  = versionState.app  ? `v${versionState.app}`  : '—';
  document.getElementById('about-code-version').textContent = versionState.code ? `v${versionState.code}` : '—';
  aboutOverlay.style.display = 'flex';
});

document.getElementById('btn-about-close').addEventListener('click', () => {
  aboutOverlay.style.display = 'none';
});

if (api.onCodeVersionUpdated) {
  api.onCodeVersionUpdated((newVersion) => {
    versionState.code = newVersion;
    renderVersionBadge();
  });
}

// ── Dev test panel ─────────────────────────────────────────────
document.getElementById('btn-dev-test').addEventListener('click', () => {
  const panel = document.getElementById('dev-test-panel');
  const btn   = document.getElementById('btn-dev-test');
  const open  = panel.style.display !== 'none';
  panel.style.display = open ? 'none' : 'block';
  btn.classList.toggle('active', !open);
});

document.getElementById('dev-btn-direksiyon').addEventListener('click', async () => {
  const sinif    = document.getElementById('dev-sinif-select').value;
  const statusEl = document.getElementById('dev-direksiyon-status');
  const btn      = document.getElementById('dev-btn-direksiyon');
  btn.disabled = true;
  statusEl.className   = 'dev-status';
  statusEl.textContent = 'PDF oluşturuluyor…';
  try {
    await api.devTestDireksiyonPdf(sinif);
    statusEl.className   = 'dev-status ok';
    statusEl.textContent = '✓ PDF oluşturuldu ve açıldı.';
  } catch (err) {
    statusEl.className   = 'dev-status err';
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
  statusEl.className   = 'dev-status';
  statusEl.textContent = 'PDF oluşturuluyor…';
  try {
    await api.devTestSimulatorPdf(simType);
    statusEl.className   = 'dev-status ok';
    statusEl.textContent = '✓ PDF(ler) oluşturuldu, klasör açıldı.';
  } catch (err) {
    statusEl.className   = 'dev-status err';
    statusEl.textContent = '✗ ' + (cleanError(err) || 'Hata oluştu.');
  } finally {
    btn.disabled = false;
  }
});
