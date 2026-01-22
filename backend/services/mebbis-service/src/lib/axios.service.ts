import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { randomUUID } from 'crypto';

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
   * Set initial cookie data from database
   */
  setCookieData(cookies: string) {
    this.cookieData = cookies;
  }

  createInstance(config: any = {}): AxiosInstance {
    const headers = config.headers || {};
    config.timeout = 120000;
    if (this.cookieData) {
      headers.Cookie = this.cookieData;
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
    const response = await instance.request({
      method,
      url: endpoint,
      data,
      ...config,
    });

    // Handle cookie updates from response
    const setCookies = response.headers['set-cookie'];
    if (setCookies && setCookies.length > 0) {
      const cookieString = setCookies.join('; ');
      this.cookieData = cookieString;
      
      // Call callback to save to database
      if (this.onCookieUpdate) {
        await this.onCookieUpdate(cookieString);
      }
    }

    return response;
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
