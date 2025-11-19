const axios = require('axios');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const { AxiosError, SystemError } = require('../errors');
const { randomUUID } = require('crypto')

const cookiePath = path.join(__dirname, '/../../storage/cookies/');
const responsePath = path.join(__dirname, '/../../storage/responses/'); // Folder to save responses

class Axios {
  constructor(cookieName = false) {
    this.baseUrl = 'https://mebbisyd.meb.gov.tr';
    this.cookies = cookieName ? path.join(cookiePath, cookieName) : false;
  }

  setCookieName(cookieName) {
    this.cookies = path.join(cookiePath, cookieName);
  }

  enableDebug(instance) {
    instance.interceptors.request.use(
      config => {
        console.info('[Axios.Request] 🟡:', JSON.stringify({
          url: config.url,
          data: config.data,
          method: config.method,
        }));
        return config;
      },
      err => Promise.reject(err)
    );

    instance.interceptors.response.use(
      response => {
        console.info('[Axios.Response] 🟢:', JSON.stringify({
          url: response.config.url,
          method: response.config.method,
          "headers": response.headers,
          status: response.status,
        }));
        return response;
      },
      err => {
        if (err.response) {
          console.info('[Axios.Response] 🔴:', {
            url: err.response.config.url,
            method: err.response.config.method,
            body: err.response.data ?? null,
          });
        } else {
          console.error('no response', err);
        }
        return Promise.reject(err);
      }
    );
  }

  createInstance(config = {}) {
    const headers = config.headers || {};
    config.timeout = 120000;
    if (this.cookies) headers.Cookie = this.loadCookies();

    const instance = axios.create({
      baseURL: this.baseUrl,
      headers,
      withCredentials: true,
      rejectUnauthorized: false,
      ...config,
    });

    if (process.env.NODE_ENV === 'dev') {
      this.enableDebug(instance);
    }

    return instance;
  }

  static async request(method, endpoint, data = null, config = {}) {
    const axiosInstance = new Axios(config.cookieName);
    console.warn("2")

    return axiosInstance.executeAsync(async () => {
    console.warn("3")

      const instance = axiosInstance.createInstance(config);
      console.warn("4")

      // Check for responseType and handle streaming for oversized pages
      const isBuffering = config.buffering || false;
      if (isBuffering) {
        config.responseType = 'stream';
      }

      const response = await instance.request({ method, url: endpoint, data, ...config });
    console.warn("6")

      const setCookies = response.headers['set-cookie'];
    console.warn("7")

      if (setCookies) axiosInstance.saveCookies(setCookies);
      console.warn("80")

      if (config.headers?.referer) config.headers.referer = endpoint;

      let bufferedResponse = false;
      if (isBuffering) {
        bufferedResponse = await Axios.handleBufferedResponse(response);
        console.warn("81")

        //await Axios.saveResponseToFile(endpoint, bufferedResponse.data, 'buffered');
        console.warn("9")
      } else {
        //await Axios.saveResponseToFile(endpoint, response.data, 'normal');
        console.warn("10")
      }

      return isBuffering?bufferedResponse:response;
    });
  }

  static get(endpoint, config = {}) {
    return Axios.request('get', endpoint, null, config);
  }

  static post(endpoint, data, config = {}) {
    return Axios.request('post', endpoint, data, config);
  }

  static delete(endpoint, data, config = {}) {
    return Axios.request('delete', endpoint, data, config);
  }

  async executeAsync(promise) {
    try {
      return await promise();
    } catch (error) {
      if (error.response?.data) {
        console.error('Error executing axios request1:');
        throw new AxiosError({
          request: {
            url: error.config.url,
            method: error.config.method,
            headers: error.config.headers,
            data: error.config.data,
          },
          response: {
            data: error.response.data,
            status: error.response.status,
            headers: error.response.headers,
          },
          status: error.response?.status,
        });
      } else {
        console.error('Error executing axios request2:');
        throw new SystemError(JSON.stringify(error.stack));
      }
    }
  }

  saveCookies(cookies) {
    console.log("ts1", this.cookies)
    const tCookies= this.cookies
    return new Promise((resolve, reject) => {
    console.log("tsc",tCookies)

      if (tCookies) {
        try {
          // Create a writable stream with the default 'w' flag to overwrite the file
          const writableStream = fs.createWriteStream(tCookies, { encoding: 'utf8' });
          console.log("c0")
          // Convert cookies array to a single string separated by '; '
          const cookieString = cookies.join('; ');
          console.log("c1")
  
          // Write the cookie string to the file
          writableStream.write(cookieString);
          console.log("c2")
  
          // End the stream
          writableStream.end();
          console.log("c3")
  
          // Resolve the promise when the stream ends
          writableStream.on('finish', () => {
            resolve();
          });
  
          // Handle stream errors
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

  loadCookies() {
    if (this.cookies && fs.existsSync(this.cookies)) {
      return fs.readFileSync(this.cookies, 'utf8');
    }
    return '';
  }

  static async handleBufferedResponse(response) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      response.data.on('data', (chunk) => {
        chunks.push(chunk);
      });

      response.data.on('end', () => {
        const buffer = Buffer.concat(chunks);
       // console.log("buffer", buffer.toString())
        resolve({
          ...response,
          data: buffer.toString(), // Convert to string or keep as buffer depending on your need
        });
      });

      response.data.on('error', (err) => {
        reject(err);
      });
    });
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
  static async saveResponseToFile(endpoint, data, type) {
    try {
      const timestamp = Axios.getFormattedTimestamp();
      const fileName = `${endpoint.replace(/\//g, '_').replace(/\?/g, '_')}_${timestamp}.${type === 'buffered' ? 'bin' : 'json'}`;
      const filePath = path.join(responsePath, fileName);

      fs.writeFileSync(filePath, data);
      console.log(`Response saved to file: ${filePath}`);
    } catch (error) {
      console.error('Error saving response to file:', error);
    }
  }
}

if (!global.responseStore) global.responseStore = {}

function addMebbisInterceptor(instance) {
  instance.interceptors.response.use(
    response => {
      if (response.config.baseURL && response.config.baseURL.includes('mebbisyd.meb.gov.tr')) {
        const id = randomUUID()
        global.responseStore[id] = {
          html: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
          status: response.status,
          error: null
        }
        console.log(`Dynamic response route: /response/${id}`)
      }
      return response
    },
    error => {
      if (error.config && error.config.baseURL && error.config.baseURL.includes('mebbisyd.meb.gov.tr')) {
        const id = randomUUID()
        global.responseStore[id] = {
          html: error.response?.data ? (typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data)) : '',
          status: error.response?.status || 500,
          error: error.message
        }
        console.log(`Dynamic response route: /response/${id}`)
      }
      return Promise.reject(error)
    }
  )
}

// Patch createInstance to always add interceptor
const _createInstance = Axios.prototype.createInstance
Axios.prototype.createInstance = function(config = {}) {
  const instance = _createInstance.call(this, config)
  addMebbisInterceptor(instance)
  return instance
}

module.exports = Axios;
