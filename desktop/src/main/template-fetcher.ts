/**
 * Fetches HTML templates from the desktop-service via an encrypted channel.
 * See `desktop-crypto-client.ts` for the wire format.
 *
 * Allowed paths (validated server-side):
 *   - direksiyon-takip/<file>.html
 *   - simulator/sesim/<file>.html
 *   - simulator/anagrup/<scenario>/<file>.html
 *   - ek4/<file>.html
 */

import { ENCRYPTED_TEMPLATE_URL } from '../launcher/config';
import {
  postSignedBinary,
  decryptPayload,
  signRequestBody,
} from '../launcher/desktop-crypto-client';

export async function fetchEncryptedTemplate(relativePath: string): Promise<string> {
  const path = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const body = signRequestBody(path);
  const encrypted = await postSignedBinary(ENCRYPTED_TEMPLATE_URL, body);
  return decryptPayload(encrypted).toString('utf-8');
}
