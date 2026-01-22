import * as https from 'https';
import * as http from 'http';

export class FetchService {
  private baseUrl = 'https://mebbisyd.meb.gov.tr';
  private cookieData: string = '';
  private tbMebbisId: number | null = null;
  private onCookieUpdate: ((cookies: string) => Promise<void>) | null = null;

  constructor(tbMebbisId?: number) {
    if (tbMebbisId) {
      this.tbMebbisId = tbMebbisId;
    }
  }

  setTbMebbisId(tbMebbisId: number) {
    this.tbMebbisId = tbMebbisId;
  }

  setCookieData(cookies: string) {
    this.cookieData = cookies;
  }

  setOnCookieUpdate(callback: (cookies: string) => Promise<void>) {
    this.onCookieUpdate = callback;
  }

  static agentSelector(_parsedURL: any) {
    if (_parsedURL.protocol == 'http:') {
      return http.Agent;
    } else {
      return https.Agent;
    }
  }

  createHeaders(config: any = {}) {
    const headers = config.headers || {};
    if (this.cookieData) headers.Cookie = this.cookieData;
    return headers;
  }

  static async request(
    method: string,
    endpoint: string,
    data: any = null,
    config: any = {},
  ) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    const fetchInstance = new FetchService(config.tbMebbisId);
    fetchInstance.setCookieData(config.cookieData || '');
    fetchInstance.setOnCookieUpdate(config.onCookieUpdate);

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

    const setCookies = response.headers.get('set-cookie');
    if (setCookies) {
      await fetchInstance.handleCookieUpdate(setCookies);
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

  private async handleCookieUpdate(cookies: string) {
    this.cookieData = cookies;
    if (this.onCookieUpdate) {
      try {
        await this.onCookieUpdate(cookies);
        console.log('Cookies updated in database successfully');
      } catch (error) {
        console.error('Error updating cookies in database:', error);
      }
    }
  }
}
