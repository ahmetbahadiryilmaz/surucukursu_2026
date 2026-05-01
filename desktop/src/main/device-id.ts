/**
 * device-id.ts
 *
 * Generates a stable, hardware-bound device identifier for this machine.
 *
 * Strategy:
 *   1. Query three WMIC sources: System UUID, CPU ProcessorId, primary disk serial.
 *   2. Concatenate the trimmed values and hash with SHA-256.
 *   3. Cache the result to %AppData%/mebbis-desktop/device-id.txt so it survives
 *      minor hardware changes (e.g. RAM swap) and remains stable across reinstalls.
 *   4. If hardware queries fail AND no cache exists, fall back to a UUID written
 *      into the same cache file — guaranteeing an ID even in unusual environments.
 *
 * Usage:
 *   Call await initDeviceId() once at startup (after app.whenReady()).
 *   Then call getDeviceId() anywhere to get the cached string.
 */

import { app } from 'electron';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

const CACHE_FILE_NAME = 'device-id.txt';
const WMIC_TIMEOUT_MS = 5000;

let cachedDeviceId: string | null = null;

// ---------------------------------------------------------------------------
// WMIC helpers
// ---------------------------------------------------------------------------

function runWmic(query: string): string {
  try {
    const raw = execSync(`wmic ${query}`, {
      encoding: 'utf8',
      timeout: WMIC_TIMEOUT_MS,
      windowsHide: true,
    });
    // WMIC output format:  "Header\r\nValue\r\n\r\n"
    // We strip the header line and any blank lines, then trim.
    const lines = raw
      .split(/[\r\n]+/)
      .map(l => l.trim())
      .filter(l => l.length > 0);
    // First line is the column header — skip it.
    const value = lines.slice(1).join(' ').trim();
    return value;
  } catch {
    return '';
  }
}

function collectHardwareTokens(): string {
  // System UUID — most stable cross-call identifier (BIOS level)
  const systemUuid = runWmic('csproduct get UUID');
  // CPU ProcessorId
  const cpuId = runWmic('cpu get ProcessorId');
  // Primary disk serial (index 0)
  const diskSerial = runWmic("diskdrive where 'Index=0' get SerialNumber");

  return [systemUuid, cpuId, diskSerial]
    .map(v => v.replace(/\s+/g, '').toUpperCase())
    .filter(v => v.length > 0 && v !== 'TOFILLBYOEM' && v !== 'NONE' && v !== '0')
    .join('|');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function initDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  const cacheDir = app.getPath('userData');
  const cacheFile = path.join(cacheDir, CACHE_FILE_NAME);

  // 1. Try to read existing cached ID first.
  if (fs.existsSync(cacheFile)) {
    const stored = fs.readFileSync(cacheFile, 'utf-8').trim();
    if (/^[0-9a-f]{64}$/.test(stored) || /^[0-9a-f-]{36}$/.test(stored)) {
      cachedDeviceId = stored;
      return cachedDeviceId;
    }
  }

  // 2. Compute from hardware.
  const tokens = collectHardwareTokens();

  let deviceId: string;
  if (tokens.length > 0) {
    deviceId = crypto.createHash('sha256').update(tokens).digest('hex');
  } else {
    // 3. Fallback: generate a UUID and persist it (not hardware-bound, but stable).
    deviceId = uuidv4();
  }

  // 4. Persist for future launches.
  try {
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(cacheFile, deviceId, 'utf-8');
  } catch {
    // Non-fatal: we still have the in-memory value for this session.
  }

  cachedDeviceId = deviceId;
  return cachedDeviceId;
}

export function getDeviceId(): string {
  if (!cachedDeviceId) {
    throw new Error('getDeviceId() called before initDeviceId() completed');
  }
  return cachedDeviceId;
}
