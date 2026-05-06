/**
 * Custom Electron protocol that serves renderer files from the in-memory
 * remote-code cache without ever writing to disk.
 *
 *   URL form:   mtsk-ui://app/<path>
 *   Resolves:   renderer/<path>  in the loader's file map
 *
 * Registration requires two steps:
 *   1. Call `registerRendererSchemeAsPrivileged()` synchronously, BEFORE
 *      `app.whenReady()` (Electron requirement for privileged schemes).
 *   2. After whenReady, call `installRendererProtocol()` to attach the
 *      handler. From then on, BrowserWindow can `loadURL('mtsk-ui://...')`.
 *
 * If a request arrives before the bundle is loaded, the handler returns
 * 503 — the bootstrap should never call `loadURL` until sync resolves.
 */

import { protocol } from 'electron';
import { getCodeLoader } from './remote-code-loader';

export const RENDERER_SCHEME = 'mtsk-ui';
export const RENDERER_HOST = 'app';
export const RENDERER_ROOT_URL = `${RENDERER_SCHEME}://${RENDERER_HOST}`;
export const RENDERER_INDEX_URL = `${RENDERER_ROOT_URL}/index.html`;

const MIME_BY_EXT: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

function mimeFor(filename: string): string {
  const idx = filename.lastIndexOf('.');
  if (idx < 0) return 'application/octet-stream';
  return MIME_BY_EXT[filename.slice(idx).toLowerCase()] || 'application/octet-stream';
}

/**
 * Must be called BEFORE app.whenReady().
 * Marks the scheme as standard + secure so the renderer treats it like
 * https (cookies, fetch, service workers — though we only need basic
 * navigation + script/css loading).
 */
export function registerRendererSchemeAsPrivileged(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: RENDERER_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        bypassCSP: false,
        allowServiceWorkers: false,
        corsEnabled: true,
      },
    },
  ]);
}

/**
 * Attach the protocol handler. Call after app.whenReady().
 * Idempotent — safe to call once and only once per process.
 *
 * Uses the legacy registerBufferProtocol (Electron < 25). The modern
 * protocol.handle / Response API was added in Electron 25.
 */
export function installRendererProtocol(): void {
  protocol.registerBufferProtocol(RENDERER_SCHEME, (request, callback) => {
    let url: URL;
    try {
      url = new URL(request.url);
    } catch {
      callback({ statusCode: 400, mimeType: 'text/plain', data: Buffer.from('Bad URL') });
      return;
    }

    // Strip leading "/" — pathname is always absolute under a host.
    const rel = url.pathname.replace(/^\/+/, '') || 'index.html';

    // Reject path-traversal up front. The loader sanitizes too, but
    // returning 400 here avoids any chance of off-by-one.
    if (rel.includes('..')) {
      callback({ statusCode: 403, mimeType: 'text/plain', data: Buffer.from('Forbidden') });
      return;
    }

    const buf = getCodeLoader().getFileBuffer(`renderer/${rel}`);
    if (!buf) {
      callback({
        statusCode: 404,
        mimeType: 'text/plain',
        data: Buffer.from(`Not in bundle: renderer/${rel}`),
      });
      return;
    }

    callback({
      statusCode: 200,
      mimeType: mimeFor(rel),
      headers: { 'Cache-Control': 'no-store' },
      data: buf,
    });
  });
}
