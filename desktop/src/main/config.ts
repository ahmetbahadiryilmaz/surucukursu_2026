import { app } from 'electron';

export const IS_DEV = !app.isPackaged;

/**
 * Base URL for the backend API.
 * Dev  → local API gateway (http://localhost:3000)
 * Prod → production server (https://mtsk.app)
 */
export const API_BASE_URL = IS_DEV
  ? 'http://127.0.0.1:9501'
  : 'https://mtsk.app';
