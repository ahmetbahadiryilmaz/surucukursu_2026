const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { FetchError, SystemError } = require('../errors');
const https = require('node:https');
const http = require('node:http');
const cookiePath = path.join(__dirname, '/../../storage/cookies/');
const responsePath = path.join(__dirname, '/../../storage/responses/');
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

class Fetch {
  constructor(cookies = false) {
    this.baseUrl = 'https://mebbisyd.meb.gov.tr';
    this.cookies = cookies ? path.join(cookiePath, cookies) : false;
  }
   static agentSelector(_parsedURL) {
      if (_parsedURL.protocol == 'http:') {
          return httpAgent;
      } else {
          return httpsAgent;
      }
  }
  

  setCookieName(cookieName) {
    this.cookies = path.join(cookiePath, cookieName);
  }

  createHeaders(config = {}) {
    const headers = config.headers || {};
    if (this.cookies) headers.Cookie = this.loadCookies();

     
    /*if (!headers['Content-Type'] && config.method !== 'get') {
      headers['Content-Type'] = 'application/json';
    }*/
    return headers;
  }

  static async request(method, endpoint, data = null, config = {}) {
    await new Promise((resolve) => setTimeout(resolve, 0))
    const fetchInstance = new Fetch(config.cookieName);

    return fetchInstance.executeAsync(async () => {
      // Request logging (yellow circle)
      console.info('[Fetch.Request] 🟡:', JSON.stringify({
        url: endpoint,
        method: method.toUpperCase(),
      }));
      const _data = new URLSearchParams(data).toString();
      const headers = fetchInstance.createHeaders(config);
      const url = `${endpoint}`;
       const options = {
        method: method.toUpperCase(),
        headers: headers,
        body: method != 'get'  ? (_data) : null, // Ensure JSON serialization
        timeout: 120000,
        ...config
       };
      
      

      const response = await fetch(url, options);
   
      if (response.headers.get('set-cookie')) {
        fetchInstance.saveCookies(response.headers.get('set-cookie'));
      }

      let responseData = await response.text(); // Capture response data

      // Response logging (green circle)
      console.info('[Fetch.Response] 🟢:', JSON.stringify({
        url: endpoint,
        method: method.toUpperCase(),
        status: response.status,
      }));

     // await Fetch.saveResponseToFile(endpoint + method, responseData, 'normal');

      return {
        status: response.status,
        data: responseData,
      };
    });
  }

  static async get(endpoint, config = {}) {
    return Fetch.request('get', endpoint, {}, config);
  }

  static async post(endpoint, data, config = {}) {
    config.agent = Fetch.agentSelector;
    return Fetch.request('post', endpoint, data, config);
  }

  async executeAsync(promise) {
    try {
      return await promise();
    } catch (error) {
      if (error instanceof fetch.FetchError) {
        console.error('Error executing fetch request1:', error);
        throw new FetchError({
          request: {
            url: error.url,
            method: error.method,
            headers: error.headers,
            data: error.body,
          },
          response: {
            data: error.response ? error.response.data : null,
            status: error.response ? error.response.status : null,
            headers: error.response ? error.response.headers : null,
          },
          status: error.response?.status,
        });
      } else {
        console.error('Error executing fetch request2:', error);
        throw new SystemError(JSON.stringify(error.stack));
      }
    }
  }

  saveCookies(cookies) {
    if (this.cookies) {
      try {
        const writableStream = fs.createWriteStream(this.cookies, { encoding: 'utf8' });
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
    if (this.cookies && fs.existsSync(this.cookies)) {
      return fs.readFileSync(this.cookies, 'utf8');
    }
    return '';
  }

  static async saveResponseToFile(endpoint, data, type) {
    try {
      const timestamp = Fetch.getFormattedTimestamp();
      const fileName = `${endpoint.replace(/\//g, '_').replace(/\?/g, '_')}_${timestamp}.${type === 'buffered' ? 'bin' : 'html'}`;
      const filePath = path.join(responsePath, fileName);

      fs.writeFileSync(filePath, data);
    } catch (error) {
      console.error('Error saving response to file:', error);
    }
  }

  static getFormattedTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = String(hours % 12 || 12).padStart(2, '0');

    return `${year}${month}${day}${formattedHours}${minutes}${seconds}${period}`;
  }
}

module.exports = Fetch;
