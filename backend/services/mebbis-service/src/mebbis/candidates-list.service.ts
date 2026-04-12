import { Injectable } from '@nestjs/common';
import { AxiosService } from '../lib/axios.service';
import { parse } from 'node-html-parser';

@Injectable()
export class CandidatesListService {
  private axiosService: AxiosService;
  private tbMebbisId: number;

  // The two student statuses we care about
  private static readonly TARGET_STATUSES = [
    { value: '0', text: 'Kursa Başvuru Aşamasında' },
    { value: '2', text: 'Uygulama Sınav Aşamasında' },
  ];

  constructor(tbMebbisId: number, cookieData?: string) {
    this.tbMebbisId = tbMebbisId;
    this.axiosService = new AxiosService(tbMebbisId);
    if (cookieData) {
      this.axiosService.setCookieData(cookieData);
    }
  }

  /**
   * Encode an object as application/x-www-form-urlencoded string.
   */
  private encodeForm(data: Record<string, string>): string {
    const params = new URLSearchParams();
    for (const key of Object.keys(data)) {
      params.append(key, data[key]);
    }
    return params.toString();
  }

  async getCandidates(): Promise<{
    success: boolean;
    status: number;
    data: any[] | string;
  }> {
    try {
      // Step 1: Navigate to SKT home page to establish session context
      await this.axiosService.get('https://mebbisyd.meb.gov.tr/SKT/skt00001.aspx');

      // Step 2: GET skt02006.aspx to get the initial form
      const r2 = await this.axiosService.get(
        'https://mebbisyd.meb.gov.tr/SKT/skt02006.aspx',
      );

      const r2Html = r2.data;
      const r2Root = parse(r2Html);

      // Extract dönem options (skip -1 empty and 1 Tüm Dönemler)
      const egitimDonemleri = r2Root
        .querySelectorAll('#cmbEgitimDonemi option')
        .map((el) => ({
          value: el.getAttribute('value') || '',
          text: el.textContent?.trim() || '',
        }))
        .filter((opt) => opt.value !== '-1' && opt.value !== '1');

      if (egitimDonemleri.length === 0) {
        console.error('[CandidatesList] No dönem options found');
        return { success: false, status: r2.status, data: 'No dönem options found' };
      }

      console.log(`[CandidatesList] Found ${egitimDonemleri.length} dönem options`);

      // Step 3: Trigger cmbEgitimDonemi postback to get updated hidden fields
      const initialFormData = this.extractAllFormValues(r2Root);
      const postbackData = {
        ...initialFormData,
        '__EVENTTARGET': 'cmbEgitimDonemi',
        '__EVENTARGUMENT': '',
        'cmbEgitimDonemi': egitimDonemleri[0].value,
      };

      console.log(`[CandidatesList] Triggering cmbEgitimDonemi postback with dönem=${egitimDonemleri[0].value}...`);
      const postbackResponse = await this.axiosService.post(
        'https://mebbisyd.meb.gov.tr/SKT/skt02006.aspx',
        this.encodeForm(postbackData),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      let postbackRoot = parse(postbackResponse.data);
      console.log(`[CandidatesList] Postback response length: ${postbackResponse.data.length}`);

      // Step 4: Loop through each dönem × each target status
      const candidates: any[] = [];
      const targetStatuses = CandidatesListService.TARGET_STATUSES;

      for (const egitimDonemi of egitimDonemleri) {
        for (const durumu of targetStatuses) {
          console.log(`[CandidatesList] Fetching dönem=${egitimDonemi.text} (${egitimDonemi.value}), durum=${durumu.text} (${durumu.value})...`);

          // Use hidden fields from the postback response (updated __VIEWSTATE etc.)
          const updatedFormValues = this.extractAllFormValues(postbackRoot);
          const formData = {
            ...updatedFormValues,
            '__EVENTTARGET': '',
            '__EVENTARGUMENT': '',
            'cmbEgitimDonemi': egitimDonemi.value,
            'cmbGrubu': '-1',
            'cmbSubesi': '-1',
            'cmbDurumu': '4', // Döneme Kayıtlı Tüm Adaylar
            'cmbOgrenciDurumu': durumu.value,
            'txtTcKimlikNo': '',
            'btnListele': '.:: Listele ::.',
          };

          console.log(`[CandidatesList] POST fields count: ${Object.keys(formData).length}`);

          const r3 = await this.axiosService.post(
            'https://mebbisyd.meb.gov.tr/SKT/skt02006.aspx',
            this.encodeForm(formData),
            {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            },
          );
          const r3Data = r3.data;
          const r3Root = parse(r3Data);

          // Update postbackRoot for next iteration (keep hidden fields fresh)
          postbackRoot = r3Root;

          const id = r3Root
            .querySelector('#SktPageHeader1_lblKullaniciAdi')
            ?.textContent?.trim();

          console.log(`[CandidatesList] Response for dönem=${egitimDonemi.value}, durum=${durumu.value}: userId=${id || 'NOT FOUND'}, bodyLength=${r3Data.length}`);

          if (id) {
            const table = r3Root.querySelector('table#dgListele');

            const columnNames = this.processColumnNames(
              r3Root
                .querySelectorAll('.frmListBaslik td')
                .map((el) => el.textContent),
            );

            console.log(`[CandidatesList] Table found: ${!!table}, column count: ${columnNames.length}, columns: ${columnNames.join(', ')}`);

            if (!table) {
              console.log(`[CandidatesList] No table for dönem=${egitimDonemi.value}, durum=${durumu.value} - skipping`);
              continue;
            }
            
            table
              .querySelectorAll('tr')
              .slice(1)
              .forEach((row) => {
                const candidate: any = {};
                row.querySelectorAll('td').forEach((cell, j) => {
                  const columnName = columnNames[j];
                  if (columnName && columnName.includes('fotograf')) {
                    // Extract img src for any photo column (biyometrik_fotograf, kayit_fotografi, etc.)
                    candidate[columnName] = cell
                      .querySelector('img')
                      ?.getAttribute('src');
                  } else if (columnName) {
                    candidate[columnName] = cell.textContent?.trim() || '';
                  }
                });
                candidate.status = durumu.value;
                candidate.donem = egitimDonemi.value;
                candidate.donemText = egitimDonemi.text;
                candidates.push(candidate);
              });

            console.log(`[CandidatesList] Found ${table.querySelectorAll('tr').length - 1} candidates for dönem=${egitimDonemi.text}, durum=${durumu.text}`);
          } else {
            console.warn(`[CandidatesList] No userId found for dönem=${egitimDonemi.value}, durum=${durumu.value} - session may have expired`);
            throw new Error('No id found - session may have expired');
          }
        }
      }

      console.log(`[CandidatesList] Total candidates collected: ${candidates.length}`);
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

  /**
   * Extract ALL form values from parsed HTML root:
   * - hidden inputs (for __VIEWSTATE, __EVENTVALIDATION, etc.)
   * - select dropdowns (selected values)
   * - text inputs
   */
  private extractAllFormValues(root: any): { [key: string]: string } {
    const values: { [key: string]: string } = {};

    // Hidden inputs
    root.querySelectorAll('input[type="hidden"]').forEach((el: any) => {
      const name = el.getAttribute('name');
      if (name) {
        values[name] = el.getAttribute('value') || '';
      }
    });

    // Select dropdowns - get selected value
    root.querySelectorAll('select').forEach((el: any) => {
      const name = el.getAttribute('name');
      if (name) {
        const selectedOption = el.querySelector('option[selected]');
        if (selectedOption) {
          values[name] = selectedOption.getAttribute('value') || '';
        } else {
          const firstOption = el.querySelector('option');
          if (firstOption) {
            values[name] = firstOption.getAttribute('value') || '';
          }
        }
      }
    });

    // Text inputs
    root.querySelectorAll('input[type="text"]').forEach((el: any) => {
      const name = el.getAttribute('name');
      if (name) {
        values[name] = el.getAttribute('value') || '';
      }
    });

    return values;
  }
}
