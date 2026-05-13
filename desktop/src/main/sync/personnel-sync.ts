import { apiClient, PersonnelListIngestRow, PersonnelDetailIngestPayload } from '../api/api-client';

/**
 * Write-through bridge for personnel: every local PersonnelDb ingest fires a
 * background POST to the backend. Same shape as student-sync.ts.
 *
 *   - Local DB always wins on UX (write first, push later).
 *   - On push failure, the local copy is the only record; nothing flagged.
 */

type TokenGetter = () => string | null;

let _getToken: TokenGetter = () => null;

export function configurePersonnelSync(getToken: TokenGetter) {
  _getToken = getToken;
}

function tokenOrNull(): string | null {
  try { return _getToken(); } catch { return null; }
}

export function pushPersonnelList(mebbisAccountId: string, rows: PersonnelListIngestRow[]): void {
  const token = tokenOrNull();
  if (!token) {
    console.log('[PersonnelSync] No auth token, skipping list push');
    return;
  }
  if (!rows.length) return;
  apiClient.ingestPersonnelList(token, mebbisAccountId, rows)
    .then((r) => {
      console.log(`[PersonnelSync] List pushed (account=${mebbisAccountId}): created=${r.created}, updated=${r.updated}, linked=${r.linked}`);
    })
    .catch((e) => {
      console.error('[PersonnelSync] List push failed (kept locally):', e?.message || e);
    });
}

export function pushPersonnelDetail(mebbisAccountId: string, payload: PersonnelDetailIngestPayload): void {
  const token = tokenOrNull();
  if (!token) {
    console.log('[PersonnelSync] No auth token, skipping detail push');
    return;
  }
  apiClient.ingestPersonnelDetail(token, mebbisAccountId, payload)
    .then((r) => {
      console.log(`[PersonnelSync] Detail pushed: tc=${payload.tc} personnel_id=${r.personnel_id}`);
    })
    .catch((e) => {
      console.error('[PersonnelSync] Detail push failed (kept locally):', e?.message || e);
    });
}
