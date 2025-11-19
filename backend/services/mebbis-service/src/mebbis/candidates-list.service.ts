import { Injectable } from '@nestjs/common';
import { AxiosService } from '../lib/axios.service';
import { FetchService } from '../lib/fetch.service';
import { parse } from 'node-html-parser';

@Injectable()
export class CandidatesListService {
  private axiosService: AxiosService;

  constructor(cookieName: string) {
    this.axiosService = new AxiosService(cookieName);
  }

  async getCandidates(cookieName: string): Promise<{
    success: boolean;
    status: number;
    data: any[] | string;
  }> {
    try {
      // Fetch the first page
      await FetchService.get('https://mebbisyd.meb.gov.tr/SKT/skt00001.aspx', {
        cookieName,
      });

      // Fetch the second page
      const r2 = await FetchService.get(
        'https://mebbisyd.meb.gov.tr/SKT/skt02006.aspx',
        { cookieName },
      );

      const r2Html = r2.data;
      const r2Root = parse(r2Html);

      // Extract durumlar options
      const durumlar = r2Root
        .querySelectorAll('#cmbOgrenciDurumu option')
        .map((el) => ({
          value: el.getAttribute('value'),
          text: el.textContent,
        }));
      // Don't take -1 and 1, limit with 10
      const egitimDonemleri = r2Root
        .querySelectorAll('#cmbEgitimDonemi option')
        .map((el) => ({
          value: el.getAttribute('value'),
          text: el.textContent,
        }))
        .filter((el) => el.value !== '-1' && el.value !== '1')
        .slice(0, 10);

      if (durumlar.length === 0) {
        console.error('No durumlar found');
        return { success: false, status: r2.status, data: 'No durumlar found' };
      }
      if (egitimDonemleri.length === 0) {
        console.error('No egitimDonemleri found');
        return {
          success: false,
          status: r2.status,
          data: 'No egitimDonemleri found',
        };
      }

      // Process candidates
      const candidates: any[] = [];
      for (const egitimDonemi of egitimDonemleri) {
        for (const durumu of durumlar) {
          const formData = this.getFormdata(
            r2Root,
            durumu.value,
            egitimDonemi.value,
          );

          const r3 = await FetchService.post(
            'https://mebbisyd.meb.gov.tr/SKT/skt02006.aspx',
            formData,
            { cookieName },
          );
          const r3Data = r3.data;
          const r3Root = parse(r3Data);

          const id = r3Root
            .querySelector('#SktPageHeader1_lblKullaniciAdi')
            ?.textContent?.trim();
          if (id) {
            const table = r3Root.querySelector('table#dgListele');

            const columnNames = this.processColumnNames(
              r3Root
                .querySelectorAll('.frmListBaslik td')
                .map((el) => el.textContent),
            );

            if (!table) continue;
            table
              .querySelectorAll('tr')
              .slice(1)
              .forEach((row) => {
                const candidate: any = {};
                row.querySelectorAll('td').forEach((cell, j) => {
                  const columnName = columnNames[j];
                  if (columnName === 'fotograf') {
                    candidate[columnName] = cell
                      .querySelector('img')
                      ?.getAttribute('src');
                  } else {
                    candidate[columnName] = cell.innerHTML;
                  }
                });
                candidate.status = durumu.value;
                candidates.push(candidate);
              });
          } else {
            throw new Error('No id found');
          }
        }
      }

      return { success: true, status: 200, data: candidates };
    } catch (error: any) {
      console.error('Error getting candidates:', error);
      return { success: false, status: 400, data: error.message };
    }
  }

  private processColumnNames(columnNames: string[]) {
    return columnNames.map((col) =>
      col
        .replace(/\s/g, '_')
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/İ/g, 'i')
        .replace(/[^a-zA-Z0-9_]/g, '')
        .toLowerCase(),
    );
  }

  private getFormdata(r2Root: any, durum: string, egitimDonemi: string) {
    const formData: { [key: string]: string } = {};

    r2Root.querySelectorAll('#FRM_SKT02006 input').forEach((el: any) => {
      formData[el.getAttribute('name')] = el.getAttribute('value') ?? '';
    });

    formData['cmbEgitimDonemi'] = egitimDonemi;
    formData['cmbGrubu'] = '-1';
    formData['cmbSubesi'] = '-1';
    formData['cmbDurumu'] = '4';
    formData['cmbOgrenciDurumu'] = durum;
    formData['btnListele'] = '.:: Listele ::.';

    return formData;
  }
}
