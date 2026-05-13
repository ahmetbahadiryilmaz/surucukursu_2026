import { apiClient, RemoteCar } from './api-client';

type TokenGetter = () => string | null;

let _getToken: TokenGetter = () => null;

export function configureCarSync(getToken: TokenGetter) {
  _getToken = getToken;
}

function tokenOrNull(): string | null {
  try { return _getToken(); } catch { return null; }
}

export function fetchCars(): Promise<RemoteCar[] | null> {
  const token = tokenOrNull();
  if (!token) return Promise.resolve(null);
  return apiClient.listCars(token).catch((e) => {
    console.error('[CarSync] fetchCars failed:', e?.message || e);
    return null;
  });
}

export function updateCarRoute(carId: number, route: string): Promise<void> {
  const token = tokenOrNull();
  if (!token) return Promise.resolve();
  return apiClient.updateCarRoute(token, carId, route)
    .then(() => {})
    .catch((e) => { console.error('[CarSync] updateCarRoute failed:', e?.message || e); });
}
