import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { randomUUID } from 'crypto';
import { MebbisRequestLogger } from '../utils/mebbis-request-logger';

@Injectable()
export class AxiosService {
  private baseUrl = 'https://mebbisyd.meb.gov.tr';
  private tbMebbisId: number | null = null;
  private onCookieUpdate: ((cookies: string) => Promise<void>) | null = null;
  private cookieData: string = '';

  constructor(tbMebbisId?: number) {
    if (tbMebbisId) {
      this.tbMebbisId = tbMebbisId;
    }
  }

  setTbMebbisId(tbMebbisId: number) {
    this.tbMebbisId = tbMebbisId;
  }

  /**
   * Set callback function to handle cookie updates (for database storage)
   */
  setOnCookieUpdate(callback: (cookies: string) => Promise<void>) {
    this.onCookieUpdate = callback;
  }

  /**
   * Set initial cookie data from database.
   * Sanitizes the value in case it was stored with Set-Cookie attributes.
   */
  setCookieData(cookies: string) {
    this.cookieData = AxiosService.sanitizeCookieString(cookies);
  }

  /**
   * Clean a cookie string that may contain Set-Cookie attributes like
   * path=/, HttpOnly, SameSite=Lax. Keeps only name=value pairs.
   */
  private static sanitizeCookieString(raw: string): string {
    if (!raw) return raw;
    // If the string contains attributes, strip them
    const knownAttrs = ['path=', 'httponly', 'samesite=', 'secure', 'domain=', 'expires=', 'max-age='];
    const hasAttributes = knownAttrs.some((a) => raw.toLowerCase().includes(a));
    if (!hasAttributes) return raw;
    // Split by '; ' and keep only name=value pairs
    const parts = raw.split(';').map((p) => p.trim());
    const cleaned = parts.filter((p) => {
      if (!p.includes('=')) return false;
      const name = p.split('=')[0].trim().toLowerCase();
      return !['path', 'expires', 'domain', 'samesite', 'max-age'].includes(name) && name !== 'httponly' && name !== 'secure';
    });
    return cleaned.join('; ');
  }

  createInstance(config: any = {}): AxiosInstance {
    const headers = config.headers || {};
    config.timeout = 120000;
    if (this.cookieData) {
      headers.Cookie = this.cookieData;
      console.log(`[AxiosService] Sending cookie header - length: ${this.cookieData.length}`);
      console.log(`[AxiosService] Cookie (first 150 chars): ${this.cookieData.substring(0, 150)}`);
    } else {
      console.log(`[AxiosService] ⚠️  No cookie data to send!`);
    }

    const instance = axios.create({
      baseURL: this.baseUrl,
      headers,
      withCredentials: true,
      rejectUnauthorized: false,
      ...config,
    });

    // Add response interceptor for mebbis responses
    instance.interceptors.response.use(
      (response) => {
        if (
          response.config.baseURL &&
          response.config.baseURL.includes('mebbisyd.meb.gov.tr')
        ) {
          const id = randomUUID();
          if (!global.responseStore) global.responseStore = {};
          global.responseStore[id] = {
            html:
              typeof response.data === 'string'
                ? response.data
                : JSON.stringify(response.data),
            status: response.status,
            error: null,
          };
          console.log(`Dynamic response route: /response/${id}`);
        }
        return response;
      },
      (error) => {
        if (
          error.config &&
          error.config.baseURL &&
          error.config.baseURL.includes('mebbisyd.meb.gov.tr')
        ) {
          const id = randomUUID();
          if (!global.responseStore) global.responseStore = {};
          global.responseStore[id] = {
            html: error.response?.data
              ? typeof error.response.data === 'string'
                ? error.response.data
                : JSON.stringify(error.response.data)
              : '',
            status: error.response?.status || 500,
            error: error.message,
          };
          console.log(`Dynamic response route: /response/${id}`);
        }
        return Promise.reject(error);
      },
    );

    return instance;
  }

  async request(
    method: string,
    endpoint: string,
    data: any = null,
    config: any = {},
  ): Promise<AxiosResponse> {
    const instance = this.createInstance(config);
    const fullUrl = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint}`;
    const startTime = Date.now();
    let response: AxiosResponse | null = null;
    let requestError: string | null = null;

    try {
      response = await instance.request({
        method,
        url: endpoint,
        data,
        ...config,
      });

      // Handle cookie updates from response
      await this.processCookies(response);

      return response;
    } catch (error: any) {
      requestError = error.message || 'Unknown error';
      response = error.response || null;

      // CRITICAL: Also process cookies from error/redirect responses (e.g. 302 login success)
      if (response) {
        await this.processCookies(response);
      }

      throw error;
    } finally {
      // Log every outgoing request/response
      const durationMs = Date.now() - startTime;
      const responseHeaders = response?.headers
        ? (typeof response.headers.toJSON === 'function'
            ? response.headers.toJSON()
            : { ...response.headers })
        : {};
      const redirectUrl =
        responseHeaders?.location || responseHeaders?.Location || null;
      const responseBody =
        response?.data != null
          ? typeof response.data === 'string'
            ? response.data
            : JSON.stringify(response.data, null, 2)
          : null;

      MebbisRequestLogger.log({
        method,
        url: fullUrl,
        requestHeaders: {
          ...(config.headers || {}),
          Cookie: this.cookieData ? '[PRESENT]' : '[NONE]',
        },
        requestBody: data,
        responseStatusCode: response?.status ?? null,
        responseHeaders,
        responseBody,
        redirectUrl,
        durationMs,
        error: requestError,
        tbMebbisId: this.tbMebbisId,
      });
    }
  }

  /**
   * Extract name=value pairs from Set-Cookie headers, stripping attributes
   * like path=/, HttpOnly, SameSite=Lax, Secure, etc.
   */
  private static parseSetCookies(setCookies: string[]): string {
    const cookiePairs = setCookies.map((raw) => {
      // Each Set-Cookie header: "name=value; path=/; HttpOnly; ..."
      // We only want the first segment: "name=value"
      return raw.split(';')[0].trim();
    });
    return cookiePairs.join('; ');
  }

  /**
   * Process Set-Cookie headers from any response (success or error/redirect)
   */
  private async processCookies(response: AxiosResponse): Promise<void> {
    const setCookies = response.headers['set-cookie'];
    if (setCookies && setCookies.length > 0) {
      const cookieString = AxiosService.parseSetCookies(setCookies);
      this.cookieData = cookieString;

      if (this.onCookieUpdate) {
        await this.onCookieUpdate(cookieString);
      }
    }
  }

  get(endpoint: string, config: any = {}): Promise<AxiosResponse> {
    return this.request('get', endpoint, null, config);
  }

  post(endpoint: string, data: any, config: any = {}): Promise<AxiosResponse> {
    return this.request('post', endpoint, data, config);
  }

  delete(
    endpoint: string,
    data: any,
    config: any = {},
  ): Promise<AxiosResponse> {
    return this.request('delete', endpoint, data, config);
  }
}
