import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import FormData from 'form-data';
import { AxiosService } from '../lib/axios.service';

@Injectable()
export class PreloginService {
  private baseUrl: string;
  private cookieName: string;
  private axiosService: AxiosService;

  constructor(baseUrl: string, cookieName: string) {
    this.baseUrl = baseUrl;
    this.cookieName = cookieName;
    this.axiosService = new AxiosService(cookieName);
  }

  async getInputNamesAndValues(html: string) {
    const $ = cheerio.load(html);
    const inputs: { [key: string]: string } = {};

    const firstForm = $('form').first();
    if (!firstForm.length) {
      console.error('No forms found on the page.');
      return {};
    }

    firstForm.find('input').each((index, element) => {
      const name = $(element).attr('name');
      const value = $(element).attr('value') || '';
      if (name) {
        inputs[name] = value;
      }
    });

    return inputs;
  }

  async tryLogin(username: string, password: string) {
    try {
      const url = this.baseUrl + 'default.aspx?NoSession';
      const response = await this.axiosService.get(url);
      const formData = await this.getInputNamesAndValues(response.data);
      formData.txtKullaniciAd = username;
      formData.txtSifre = password;
      const formDataObj = new FormData();
      for (const key in formData) {
        formDataObj.append(key, formData[key]);
      }

      const postResponse = await this.axiosService.post(url, formDataObj, {
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
          'Content-Type': 'application/x-www-form-urlencoded',
          referer: this.baseUrl + 'default.aspx?NoSession',
          origin: this.baseUrl,
        },
        maxRedirects: 0,
      });

      console.log('#rstatus', postResponse.status);
      const $ = cheerio.load(postResponse.data);
      const errorMessage = $('#lblSorun').text();
      return {
        success: false,
        isRedirect: false,
        status: postResponse.status,
        data: errorMessage ?? 'undefined',
      };
    } catch (error: any) {
      if (
        error.status >= 300 &&
        error.status < 400 &&
        this.baseUrl + 'redirect.aspx' == error.response?.headers?.location
      ) {
        console.warn('Redirected to main page, login successful');
        return {
          success: true,
          data: error.data,
          isRedirect: true,
          redirectedTo: error.response.headers.location,
        };
      } else {
        const response = {
          success: false,
          location: error.response?.headers?.location,
          expected: this.baseUrl + 'redirect.aspx',
          data: error.data,
        };
        console.error('Login error:', error, response);
        return response;
      }
    }
  }

  async getSocketTokenAndInputs(): Promise<{
    token: string;
    inputs: { [key: string]: string };
  }> {
    const response = await this.axiosService.get(
      this.baseUrl + 'redirect.aspx',
      {
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
          'Content-Type': 'application/x-www-form-urlencoded',
          referer: this.baseUrl + 'redirect.aspx',
          origin: this.baseUrl,
        },
      },
    );
    const $ = cheerio.load(response.data);
    const tokenUrl = $('iframe').attr('src');
    const tokenPattern = /[?&]token=([^&]+)/;
    const match = tokenUrl?.match(tokenPattern);
    const token = match ? match[1] : tokenUrl;
    console.log('socket token', token);
    return {
      token,
      inputs: {
        token,
        ...(await this.getInputNamesAndValues(response.data)),
      },
    };
  }

  async login(username: string, password: string) {
    const loginResult = await this.tryLogin(username, password);
    console.log('loginResult', loginResult);
    if (loginResult.success) {
      const dataForSocket = await this.getSocketTokenAndInputs();

      return {
        success: true,
        data: {
          token: dataForSocket.token,
          inputs: dataForSocket.inputs,
          status: 'awaiting socket or confirm data',
        },
      };
    } else if (!loginResult.success) {
      const $ = cheerio.load(loginResult.data);
      const errorMessage = $('#lblSorun').text();
      throw new Error(errorMessage ?? 'Login failed Unknown error');
    }
  }

  async loginWithCode(code: string) {
    const dataForSocket = await this.getSocketTokenAndInputs();
    if (!dataForSocket.token) {
      return { success: false, message: 'Token not found1' };
    }

    dataForSocket.inputs.txtCode = code;
    dataForSocket.inputs.__EVENTTARGET = 'dogrula';
    const formData = dataForSocket.inputs;
    const formDataObj = new FormData();
    for (const key in formData) {
      formDataObj.append(key, formData[key]);
    }
    try {
      const url = this.baseUrl + '/redirect.aspx';
      const response = await this.axiosService.post(url, formDataObj, {
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
          'Content-Type': 'application/x-www-form-urlencoded',
          referer: this.baseUrl + '/default.aspx?NoSession',
          origin: this.baseUrl,
        },
        maxRedirects: 0,
      });
      console.log('#rstatus', response.status);
      const $ = cheerio.load(response.data);
      const errorMessage = $('.error').text();
      if (errorMessage) {
        console.log('error', errorMessage);
        return {
          success: false,
          isRedirect: false,
          status: response.status,
          data: errorMessage ?? 'undefined',
        };
      }
    } catch (error: any) {
      if (
        error.status >= 300 &&
        error.status < 400 &&
        error.response?.headers?.location?.includes('main.aspx')
      ) {
        return {
          success: true,
          data: error.data,
          isRedirect: true,
          redirectedTo: error.response.headers.location,
        };
      } else {
        return {
          success: false,
          location: error.response?.headers?.location,
          expected: this.baseUrl + 'redirect.aspx',
          data: error.data,
        };
      }
    }
  }
}
