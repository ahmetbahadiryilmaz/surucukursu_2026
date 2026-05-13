import { apiClient, KurumInfoIngestPayload, RemoteKurumInfo } from '../api/api-client';

type TokenGetter = () => string | null;

let _getToken: TokenGetter = () => null;

export function configureKurumInfoSync(getToken: TokenGetter) {
  _getToken = getToken;
}

function tokenOrNull(): string | null {
  try { return _getToken(); } catch { return null; }
}

export function pushKurumInfo(
  mebbisAccountId: string,
  payload: KurumInfoIngestPayload,
): Promise<{ kurum_info_id: number; programs: number; vehicles: number } | null> {
  const token = tokenOrNull();
  if (!token) {
    console.log('[KurumInfoSync] No auth token, skipping push');
    return Promise.resolve(null);
  }
  return apiClient.ingestKurumInfo(token, mebbisAccountId, payload)
    .then((r) => {
      console.log(`[KurumInfoSync] Pushed (account=${mebbisAccountId}): info_id=${r.kurum_info_id}, programs=${r.programs}, vehicles=${r.vehicles}`);
      return r;
    })
    .catch((e) => {
      console.error('[KurumInfoSync] Push failed:', e?.message || e);
      return null;
    });
}

export function updateKurumRoute(route: string): Promise<{ id: number; kurum_route: string } | null> {
  const token = tokenOrNull();
  if (!token) return Promise.resolve(null);
  return apiClient.updateKurumRoute(token, route)
    .then((r) => r)
    .catch((e) => { console.error('[KurumInfoSync] updateKurumRoute failed:', e?.message || e); return null; });
}

export function fetchKurumInfo(): Promise<RemoteKurumInfo | null> {
  const token = tokenOrNull();
  if (!token) {
    console.log('[KurumInfoSync] No auth token, skipping fetch');
    return Promise.resolve(null);
  }
  return apiClient.getKurumInfo(token).catch((e) => {
    console.error('[KurumInfoSync] Fetch failed:', e?.message || e);
    return null;
  });
}
