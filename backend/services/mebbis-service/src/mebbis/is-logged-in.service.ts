import { Injectable } from '@nestjs/common';
import { AxiosService } from '../lib/axios.service';
import * as cheerio from 'cheerio';

@Injectable()
export class IsLoggedInService {
  private axiosService: AxiosService;
  private tbMebbisId: number;

  constructor(tbMebbisId: number) {
    this.tbMebbisId = tbMebbisId;
    this.axiosService = new AxiosService(tbMebbisId);
  }

  async isLoggedIn(): Promise<{
    success: boolean;
    status: number;
    data: string;
  }> {
    const response = await this.axiosService.get(
      'https://mebbisyd.meb.gov.tr/main.aspx?ntk=1',
      {
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
          'Content-Type': 'application/x-www-form-urlencoded',
          referer: 'https://mebasistan.meb.gov.tr/',
          origin: 'https://mebbisyd.meb.gov.tr',
        },
      },
    );

    if (response.status == 200) {
      const $ = cheerio.load(response.data);
      const id = $('#ModulPageHeader1_lblKisi')?.text();
      if (id.length > 0) {
        console.error('Login TRUE', id);
        return { success: true, status: response.status, data: id };
      }
      console.error('Login False');
    }
    return { success: false, status: response.status, data: response.data };
  }
}
