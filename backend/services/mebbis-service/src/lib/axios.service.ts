import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class AxiosService {
  private baseUrl = 'https://mebbisyd.meb.gov.tr';
  private cookiesPath: string | null = null;

  constructor(cookieName?: string) {
    if (cookieName) {
      this.cookiesPath = path.join(
        __dirname,
        '../../../storage/cookies/',
        cookieName,
      );
    }
  }

  setCookieName(cookieName: string) {
    this.cookiesPath = path.join(
      __dirname,
      '../../../storage/cookies/',
      cookieName,
    );
  }

  createInstance(config: any = {}): AxiosInstance {
    const headers = config.headers || {};
    config.timeout = 120000;
    if (this.cookiesPath) {
      headers.Cookie = this.loadCookies();
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

    const setCookies = response.headers['set-cookie'];
    if (setCookies && this.cookiesPath) {
      this.saveCookies(setCookies);
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

  private saveCookies(cookies: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.cookiesPath) {
        try {
          const writableStream = fs.createWriteStream(this.cookiesPath!, {
            encoding: 'utf8',
          });
          const cookieString = cookies.join('; ');

          writableStream.write(cookieString);
          writableStream.end();

          writableStream.on('finish', () => {
            resolve();
          });

          writableStream.on('error', (err) => {
            reject(err);
          });
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error('Cookie path not defined'));
      }
    });
  }

  private loadCookies(): string {
    if (this.cookiesPath && fs.existsSync(this.cookiesPath)) {
      return fs.readFileSync(this.cookiesPath, 'utf8');
    }
    return '';
  }
}
