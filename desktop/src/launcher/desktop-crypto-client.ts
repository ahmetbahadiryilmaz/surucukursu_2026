/**
 * Shared client-side helpers for talking to the encrypted desktop endpoints.
 *
 *   - postSignedBinary(url, payload): POSTs an HMAC-signed JSON body and returns
 *     the raw binary response body.
 *   - decryptPayload(buf): AES-256-GCM decrypts a [IV|tag|ciphertext] buffer
 *     using DESKTOP_KEY_HEX.
 *   - signBody(payloadFields): builds the signed request body for a given
 *     "path" string (the same string the server uses inside its HMAC).
 *
 * Wire format:
 *   request body (JSON):  { path, timestamp, nonce, signature, ...extra }
 *   response body (bin):  [IV (12)] [GCM authTag (16)] [ciphertext]
 */

import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import { DESKTOP_KEY_HEX, DESKTOP_HMAC_SECRET } from './config';

const AES_ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const REQUEST_TIMEOUT_MS = 15_000;

export function signRequestBody(pathToken: string, extra?: Record<string, unknown>): string {
  const timestamp = Date.now();
  const nonce = crypto.randomUUID();
  const signature = crypto
    .createHmac('sha256', DESKTOP_HMAC_SECRET)
    .update(`${pathToken}|${timestamp}|${nonce}`)
    .digest('hex');
  return JSON.stringify({
    ...(extra || {}),
    path: pathToken === '__manifest__' ? undefined : pathToken,
    timestamp,
    nonce,
    signature,
  });
}

export function postSignedBinary(
  url: string,
  body: string,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const client = u.protocol === 'https:' ? https : http;
    const req = client.request(
      {
        method: 'POST',
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Accept: 'application/octet-stream',
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (res.statusCode !== 200) {
            const errorDetail = buf.toString('utf-8').slice(0, 300);
            const friendlyMessage = res.statusCode === 429
              ? 'Çok fazla istek yapıldı, lütfen daha sonra tekrar deneyiniz'
              : res.statusCode === 404
              ? 'Şablon bulunamadı'
              : res.statusCode === 400
              ? 'Geçersiz istek'
              : `Sunucu hatası (${res.statusCode})`;
            const err = new Error(friendlyMessage);
            (err as any).statusCode = res.statusCode;
            (err as any).detail = errorDetail;
            reject(err);
            return;
          }
          resolve(buf);
        });
      },
    );
    req.on('error', (e) => {
      const friendly = new Error('Sunucuya bağlanılamadı');
      (friendly as any).detail = (e as any)?.message || String(e);
      reject(friendly);
    });
    req.on('timeout', () => {
      req.destroy();
      const friendly = new Error('İstek zaman aşımına uğradı');
      (friendly as any).detail = url;
      reject(friendly);
    });
    req.write(body);
    req.end();
  });
}

export function decryptPayload(payload: Buffer): Buffer {
  if (payload.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error(`Encrypted payload too short: ${payload.length} bytes`);
  }
  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = payload.subarray(IV_LENGTH + TAG_LENGTH);
  const key = Buffer.from(DESKTOP_KEY_HEX, 'hex');
  if (key.length !== 32) {
    throw new Error('Embedded DESKTOP_KEY has wrong length');
  }
  const decipher = crypto.createDecipheriv(AES_ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
