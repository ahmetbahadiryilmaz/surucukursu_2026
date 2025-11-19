import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

export class FetchService {
  private baseUrl = 'https://mebbisyd.meb.gov.tr';
  private cookies: string | false = false;

  constructor(cookies: string | false = false) {
    this.cookies = cookies
      ? path.join(__dirname, '../../../storage/cookies/', cookies)
      : false;
  }

  static agentSelector(_parsedURL: any) {
    if (_parsedURL.protocol == 'http:') {
      return http.Agent;
    } else {
      return https.Agent;
    }
  }

  setCookieName(cookieName: string) {
    this.cookies = path.join(
      __dirname,
      '../../../storage/cookies/',
      cookieName,
    );
  }

  createHeaders(config: any = {}) {
    const headers = config.headers || {};
    if (this.cookies) headers.Cookie = this.loadCookies();
    return headers;
  }

  static async request(
    method: string,
    endpoint: string,
    data: any = null,
    config: any = {},
  ) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    const fetchInstance = new FetchService(config.cookieName);

    // Request logging
    console.info(
      '[Fetch.Request] 🟡:',
      JSON.stringify({
        url: endpoint,
        method: method.toUpperCase(),
      }),
    );

    const _data = new URLSearchParams(data).toString();
    const headers = fetchInstance.createHeaders(config);
    const url = `${endpoint}`;
    const options = {
      method: method.toUpperCase(),
      headers: headers,
      body: method != 'get' ? _data : null,
      timeout: 120000,
      ...config,
    };

    const response = await fetch(url, options);

    if (response.headers.get('set-cookie')) {
      fetchInstance.saveCookies(response.headers.get('set-cookie'));
    }

    const responseData = await response.text();

    // Response logging
    console.info(
      '[Fetch.Response] 🟢:',
      JSON.stringify({
        url: endpoint,
        method: method.toUpperCase(),
        status: response.status,
      }),
    );

    return {
      status: response.status,
      data: responseData,
    };
  }

  static async get(endpoint: string, config: any = {}) {
    return FetchService.request('get', endpoint, {}, config);
  }

  static async post(endpoint: string, data: any, config: any = {}) {
    config.agent = FetchService.agentSelector;
    return FetchService.request('post', endpoint, data, config);
  }

  saveCookies(cookies: any) {
    if (this.cookies) {
      try {
        const writableStream = fs.createWriteStream(this.cookies as string, {
          encoding: 'utf8',
        });
        const cookieString = cookies.join('; ');
        writableStream.write(cookieString);
        writableStream.end();
        writableStream.on('finish', () => {
          console.log('Cookies saved successfully');
        });
        writableStream.on('error', (err) => {
          console.error('Error saving cookies:', err);
        });
      } catch (error) {
        console.error('Error saving cookies:', error);
      }
    } else {
      console.error('Cookie path not defined');
    }
  }

  loadCookies() {
    if (this.cookies && fs.existsSync(this.cookies as string)) {
      return fs.readFileSync(this.cookies as string, 'utf8');
    }
    return '';
  }
}
