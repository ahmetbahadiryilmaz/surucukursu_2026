import * as crypto from 'crypto';

const HMAC_ALGO = 'sha256';
const AES_ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

const TIMESTAMP_WINDOW_MS = 30_000;
const NONCE_TTL_MS = 60_000;

// In-memory replay protection. Sessions are short, single instance per service.
const seenNonces = new Map<string, number>();
let lastSweep = 0;

function sweepNoncesIfNeeded(now: number) {
  if (now - lastSweep < 30_000) return;
  lastSweep = now;
  for (const [n, ts] of seenNonces) {
    if (now - ts > NONCE_TTL_MS) seenNonces.delete(n);
  }
}

export interface VerifyParams {
  path: string;
  timestamp: number;
  nonce: string;
  signature: string;
  hmacSecret: string;
}

export function verifySignedRequest(p: VerifyParams): { ok: true } | { ok: false; reason: string } {
  if (!p.path || typeof p.timestamp !== 'number' || !p.nonce || !p.signature) {
    return { ok: false, reason: 'missing fields' };
  }

  const now = Date.now();
  if (Math.abs(now - p.timestamp) > TIMESTAMP_WINDOW_MS) {
    return { ok: false, reason: 'timestamp out of window' };
  }

  sweepNoncesIfNeeded(now);
  if (seenNonces.has(p.nonce)) {
    return { ok: false, reason: 'nonce reuse' };
  }

  const expected = crypto
    .createHmac(HMAC_ALGO, p.hmacSecret)
    .update(`${p.path}|${p.timestamp}|${p.nonce}`)
    .digest('hex');

  let sigBuf: Buffer;
  let expBuf: Buffer;
  try {
    sigBuf = Buffer.from(p.signature, 'hex');
    expBuf = Buffer.from(expected, 'hex');
  } catch {
    return { ok: false, reason: 'bad signature encoding' };
  }
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { ok: false, reason: 'signature mismatch' };
  }

  seenNonces.set(p.nonce, now);
  return { ok: true };
}

/**
 * AES-256-GCM encrypt.
 * Output layout: [IV (12 bytes)] [authTag (16 bytes)] [ciphertext]
 * Key must be 32 bytes (hex string of 64 chars).
 */
export function encryptPayload(plaintext: Buffer, keyHex: string): Buffer {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('DESKTOP_KEY must be 32 bytes (64 hex chars)');
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(AES_ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  if (tag.length !== TAG_LENGTH) {
    throw new Error(`Unexpected GCM tag length: ${tag.length}`);
  }
  return Buffer.concat([iv, tag, ciphertext]);
}
