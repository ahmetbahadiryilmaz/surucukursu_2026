/**
 * Fetches HTML templates from the desktop-service via an encrypted channel.
 * See `desktop-crypto-client.ts` for the wire format.
 *
 * Allowed paths (validated server-side):
 *   - direksiyon-takip/<file>.html
 *   - simulator/sesim/<file>.html
 *   - simulator/anagrup/<scenario>/<file>.html
 *   - ek4/<file>.html
 *
 * Errors thrown here always include the **requested template path** in the
 * message ("[template:foo/bar.html]") and never the API hostname. The same
 * incident is fire-and-forget reported to the backend activity-log so a 400
 * "Invalid template path" surfaces as something we can diagnose, not just a
 * blank "Geçersiz istek" the user sees.
 */

import { ENCRYPTED_TEMPLATE_URL } from '../launcher/config';
import {
  postSignedBinary,
  decryptPayload,
  signRequestBody,
} from '../launcher/desktop-crypto-client';
import { apiClient, sanitizeErrorMessage } from './api-client';

let _getToken: () => string | null = () => null;
let _getSchoolId: () => number = () => 0;

export function configureTemplateErrorReporter(
  getToken: () => string | null,
  getSchoolId: () => number,
): void {
  _getToken = getToken;
  _getSchoolId = getSchoolId;
}

function reportTemplateError(relativePath: string, status: number | undefined, message: string) {
  try {
    const token = _getToken();
    if (!token) return;
    apiClient
      .logActivity(token, {
        event: 'desktop_error',
        school_id: _getSchoolId(),
        error_source: 'template_fetch',
        error_path: relativePath,
        error_status: status,
        error_message: sanitizeErrorMessage(message).slice(0, 500),
      })
      .catch(() => {
        /* fire-and-forget; nothing useful we can do here */
      });
  } catch {
    /* never let logging break the calling flow */
  }
}

export async function fetchEncryptedTemplate(relativePath: string): Promise<string> {
  const cleanPath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  try {
    const body = signRequestBody(cleanPath);
    const encrypted = await postSignedBinary(ENCRYPTED_TEMPLATE_URL, body);
    return decryptPayload(encrypted).toString('utf-8');
  } catch (e: any) {
    const status: number | undefined = e?.statusCode;
    const detail = sanitizeErrorMessage(String(e?.detail || ''));
    const friendly = sanitizeErrorMessage(String(e?.message || 'Bilinmeyen şablon hatası'));
    reportTemplateError(cleanPath, status, `${friendly} | detail=${detail}`);
    // User-facing error: never leak the host. Include path + status so a
    // screenshot is enough for support to identify which template failed.
    const userMsg = status
      ? `${friendly} [template:${cleanPath}] (HTTP ${status})`
      : `${friendly} [template:${cleanPath}]`;
    const wrapped = new Error(userMsg);
    (wrapped as any).statusCode = status;
    (wrapped as any).templatePath = cleanPath;
    throw wrapped;
  }
}
