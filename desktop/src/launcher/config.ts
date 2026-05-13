import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export const IS_DEV = !app.isPackaged;

/**
 * Load a `.env` file from the desktop project root in dev mode only.
 * Packaged builds always use production defaults — env files are not bundled.
 *
 * Lookup order (first match wins):
 *   1. desktop/.env.local    (gitignored, personal overrides)
 *   2. desktop/.env          (committed defaults, e.g. demo backend)
 *
 * Format: KEY=VALUE per line. `#` comments and blank lines ignored.
 * Values are NOT quote-stripped beyond surrounding single/double quotes.
 */
function loadDevEnv(): Record<string, string> {
  if (!IS_DEV) return {};
  // __dirname in dev = desktop/dist/main → project root is two levels up
  const projectRoot = path.resolve(__dirname, '..', '..');
  const candidates = ['.env.local', '.env'].map(f => path.join(projectRoot, f));
  const out: Record<string, string> = {};
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in out)) out[key] = val;
    }
  }
  return out;
}

const devEnv = loadDevEnv();

function envOr(key: string, fallback: string): string {
  return process.env[key] || devEnv[key] || fallback;
}

const PROD_API_BASE = 'https://api.mtsk.app';
const PROD_UPDATES_BASE = 'https://mtsk.app';
const DEV_DEFAULT_API_BASE = 'http://127.0.0.1:9501';

/**
 * Base URL for the backend API.
 * Dev  → DESKTOP_API_BASE_URL env (or http://127.0.0.1:9501)
 * Prod → https://api.mtsk.app (hardcoded — never overridden)
 */
export const API_BASE_URL = IS_DEV
  ? envOr('DESKTOP_API_BASE_URL', DEV_DEFAULT_API_BASE)
  : PROD_API_BASE;

/**
 * Base URL for static update files (installer exe, latest.yml, minimum_version.json).
 * Dev  → DESKTOP_UPDATES_BASE_URL env (or falls back to API_BASE_URL)
 * Prod → https://mtsk.app
 */
export const UPDATES_BASE_URL = IS_DEV
  ? envOr('DESKTOP_UPDATES_BASE_URL', API_BASE_URL)
  : PROD_UPDATES_BASE;

/**
 * Shared desktop ↔ server secrets.
 * Must match DESKTOP_KEY / DESKTOP_HMAC_SECRET in backend/.env.
 *
 * Used for any AES-256-GCM payload + HMAC-SHA256 signed request between the
 * desktop app and the backend (encrypted templates today, plus any future
 * desktop-only encrypted endpoints). Rotating these requires shipping a new
 * desktop build AND updating the backend env at the same time.
 */
export const DESKTOP_KEY_HEX =
  '4a391941f894909f4d734e928468af71db7ef39576728068f5be8a4499472bab';
export const DESKTOP_HMAC_SECRET =
  'b8c44c162f5891a1b5fcb079fcb42189042f4a3c230906d57c361d5feedcb8d7';

/**
 * Endpoint that returns AES-256-GCM encrypted template bytes.
 * The API gateway proxies /desktop/* to the desktop service in both dev and
 * prod, so the path is the same in both environments.
 */
export const ENCRYPTED_TEMPLATE_URL = `${API_BASE_URL}/desktop/desktop-service/templates/encrypted`;

/**
 * Base for encrypted desktop-code endpoints (/manifest, /file).
 */
export const DESKTOP_CODE_BASE_URL = `${API_BASE_URL}/desktop/desktop-service/desktop-code`;

/**
 * Dev-mode opt-in: when true, the remote-code loader runs sync() even in dev.
 * Set DESKTOP_FORCE_REMOTE_CODE=1 in desktop/.env(.local) to test deploys
 * locally without packaging. Packaged builds always sync regardless.
 */
export const FORCE_REMOTE_CODE_IN_DEV = /^(1|true|yes)$/i.test(envOr('DESKTOP_FORCE_REMOTE_CODE', ''));

/**
 * Dev-mode opt-in: when true, the startup version gate and the periodic
 * version check run in dev too (instead of being skipped).
 * Set DESKTOP_FORCE_VERSION_CHECK=1 in desktop/.env(.local) to test the
 * splash / minimum_version.json flow locally. Packaged builds always check.
 */
export const FORCE_VERSION_CHECK_IN_DEV = /^(1|true|yes)$/i.test(envOr('DESKTOP_FORCE_VERSION_CHECK', ''));

/**
 * Dev-mode opt-in: when true, the main BrowserWindow opens DevTools
 * automatically on launch (detached window). No-op outside dev.
 * Set DESKTOP_OPEN_DEVTOOLS=1 in desktop/.env(.local).
 */
export const OPEN_DEVTOOLS_IN_DEV = /^(1|true|yes)$/i.test(envOr('DESKTOP_OPEN_DEVTOOLS', ''));

/**
 * How often (in seconds) the desktop polls /desktop-code/version to detect
 * new server-side deploys. On change, the user is prompted to restart.
 * Default 300s (5 min). Set DESKTOP_VERSION_POLL_SECONDS=10 in .env.local
 * for fast iteration during testing. Min clamp = 5s.
 */
export const VERSION_POLL_SECONDS = (() => {
  const raw = parseInt(envOr('DESKTOP_VERSION_POLL_SECONDS', '300'), 10);
  if (!Number.isFinite(raw) || raw < 5) return 300;
  return raw;
})();

if (IS_DEV) {
  // Helpful one-line confirmation of which backend dev mode is pointing at.
  // eslint-disable-next-line no-console
  console.log(`[config] dev mode → API_BASE_URL=${API_BASE_URL} UPDATES_BASE_URL=${UPDATES_BASE_URL}`);
}
