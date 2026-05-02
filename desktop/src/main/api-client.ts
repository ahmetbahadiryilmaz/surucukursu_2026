import http from 'http';
import https from 'https';
import { API_BASE_URL } from './config';

function request<T>(
  method: string,
  urlPath: string,
  body?: Record<string, unknown>,
  token?: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(API_BASE_URL + urlPath);
    const isHttps = fullUrl.protocol === 'https:';
    const transport = isHttps ? https : http;

    const bodyStr = body ? JSON.stringify(body) : undefined;

    const options: http.RequestOptions = {
      hostname: fullUrl.hostname,
      port: fullUrl.port || (isHttps ? '443' : '80'),
      path: fullUrl.pathname + fullUrl.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(bodyStr ? { 'Content-Length': String(Buffer.byteLength(bodyStr)) } : {}),
      },
    };

    // Strip any URLs from an error message before it reaches the renderer.
    const sanitize = (msg: string): string =>
      msg.replace(/https?:\/\/[^\s"')]+/g, '[server]').replace(/[^\s"')]+\.mtsk\.app[^\s"')]*/g, '[server]');

    const req = transport.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const status = res.statusCode ?? 0;
          if (status >= 200 && status < 300) {
            resolve(parsed as T);
          } else {
            reject(new Error(sanitize(parsed?.message || `HTTP ${status}`)));
          }
        } catch {
          reject(new Error('Sunucudan geçersiz yanıt alındı.'));
        }
      });
    });

    req.on('error', (err) => {
      const msg = (err as NodeJS.ErrnoException).code === 'ECONNREFUSED' ||
                  (err as NodeJS.ErrnoException).code === 'ENOTFOUND' ||
                  (err as NodeJS.ErrnoException).code === 'ETIMEDOUT' ||
                  (err as NodeJS.ErrnoException).code === 'ECONNRESET'
        ? 'Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.'
        : sanitize((err as Error).message || 'Bağlantı hatası.');
      reject(new Error(msg));
    });
    req.setTimeout(10_000, () => {
      req.destroy();
      reject(new Error('Sunucu yanıt vermedi (zaman aşımı).'));
    });

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    userType: number;
  };
}

export interface SchoolResponse {
  id: number;
  name: string;
  address: string;
  phone: string;
  settings: { simulator_type: string } | null;
}

export interface MebbisAccount {
  id: number;
  label: string;
  ownerEmail?: string | null;
  username: string | null;
  password: string | null;
  simulatorType: string | null;
  subscriptionActive: boolean;
  subscription: {
    type: string | null;
    endsAt: number | null;
    pdfPrintUsed: number;
    pdfPrintLimit: number | null;
  } | null;
}

export interface ActivityLogBody {
  event: 'school_login' | 'pdf_download';
  school_id: number;
  pdf_type?: 'direksiyon_takip' | 'simulator_raporu';
  count?: number;
}

export const apiClient = {
  login: (email: string, password: string) =>
    request<LoginResponse>('POST', '/desktop/desktop-service/auth/login', { email, password }),

  logout: (token: string) =>
    request<{ message: string }>('POST', '/desktop/desktop-service/auth/logout', undefined, token),

  getMySchool: (token: string) =>
    request<SchoolResponse>('GET', '/desktop/desktop-service/driving-school/me', undefined, token),

  getMebbisAccounts: (token: string) =>
    request<MebbisAccount[]>('GET', '/desktop/desktop-service/driving-school/me/mebbis-accounts', undefined, token),

  getAllSchools: (token: string) =>
    request<MebbisAccount[]>('GET', '/desktop/desktop-service/driving-school/all', undefined, token),

  upsertMebbisAccount: (
    token: string,
    schoolId: number,
    data: { username: string; password: string; simulatorType?: string },
  ) =>
    request<MebbisAccount>('POST', `/desktop/desktop-service/driving-school/me/mebbis-accounts/${schoolId}`, data as Record<string, unknown>, token),

  removeMebbisAccount: (token: string, schoolId: number) =>
    request<{ success: boolean }>('DELETE', `/desktop/desktop-service/driving-school/me/mebbis-accounts/${schoolId}`, undefined, token),

  setupSchool: (token: string, name: string) =>
    request<MebbisAccount>('POST', '/desktop/desktop-service/driving-school/me/setup', { name } as Record<string, unknown>, token),

  forgotPassword: (email: string, phone: string) =>
    request<{ message: string }>('POST', '/desktop/desktop-service/auth/forgot-password', { email, phone }),

  verifyResetCode: (email: string, code: string) =>
    request<{ valid: boolean }>('POST', '/desktop/desktop-service/auth/verify-reset-code', { email, code }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    request<{ message: string }>('POST', '/desktop/desktop-service/auth/reset-password', { email, code, newPassword }),

  logActivity: (token: string, body: ActivityLogBody) =>
    request<{ success: boolean }>('POST', '/desktop/desktop-service/activity-log', body as unknown as Record<string, unknown>, token),

  getProfile: (token: string) =>
    request<{ name: string; email: string; phone: string }>('GET', '/desktop/desktop-service/auth/profile', undefined, token),

  updateProfile: (token: string, phone: string) =>
    request<{ name: string; email: string; phone: string }>('PATCH', '/desktop/desktop-service/auth/profile', { phone } as Record<string, unknown>, token),
};
