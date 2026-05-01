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
