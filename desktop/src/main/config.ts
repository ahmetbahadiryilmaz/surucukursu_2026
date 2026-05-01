import { app } from 'electron';

export const IS_DEV = !app.isPackaged;

/**
 * Base URL for the backend API.
 * Dev  → local API gateway (http://127.0.0.1:9501)
 * Prod → production API host (https://api.mtsk.app)
 */
export const API_BASE_URL = IS_DEV
  ? 'http://127.0.0.1:9501'
  : 'https://api.mtsk.app';

/**
 * Base URL for static update files (installer exe, latest.yml, minimum_version.json).
 * These are served by nginx from the main domain, NOT the API host.
 */
export const UPDATES_BASE_URL = IS_DEV
  ? 'http://127.0.0.1:9501'
  : 'https://mtsk.app';

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
 * In dev the API gateway proxies /desktop/desktop-service/* to the desktop service;
 * in prod the gateway exposes /templates/* directly.
 */
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
