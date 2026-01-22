import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as https from 'https';
import * as querystring from 'querystring';

interface Vehicle {
  Plaka: string;
  Marka: string;
  Model: string;
  'Satın Alma Tarihi': string;
  'Son Muayene Tarihi': string;
  'Muayene Geçerlilik Tarihi': string;
  Durum: string;
  'Sürücü Sayısı': string;
  'Ders Sayısı': string;
  'Özür Günü': string;
  [key: string]: string;
}

interface Simulator {
  'Seri No': string;
  Model: string;
  'Başlangıç Tarihi': string;
  'Son Bakım Tarihi': string;
  Durum: string;
  'Kullanım Saati': string;
  'Lisans Geçerlilik': string;
  [key: string]: string;
}

interface VehiclesAndSimulatorsResponse {
  session: {
    id: string;
    name: string;
    userId: string;
  };
  vehicles: Vehicle[];
  simulators: Simulator[];
  fetchedAt: string;
}

@Injectable()
export class VehiclesSimulatorsService {
  private readonly logger = new Logger(VehiclesSimulatorsService.name);
  private readonly MEBBIS_HOST = 'mebbisyd.meb.gov.tr';
  private readonly REQUEST_TIMEOUT = 10000;

  /**
   * Extract hidden form inputs from HTML
   */
  private extractFormFields(html: string): Record<string, string> {
    const fields: Record<string, string> = {};
    const inputRegex = /<input[^>]*>/gi;
    let match;

    while ((match = inputRegex.exec(html)) !== null) {
      const inputTag = match[0];
      const nameMatch = inputTag.match(/name\s*=\s*["']([^"']+)["']/i);
      const valueMatch = inputTag.match(/value\s*=\s*["']([^"']*)["']/i);

      if (nameMatch) {
        const name = nameMatch[1];
        const value = valueMatch ? valueMatch[1] : '';
        fields[name] = value;
      }
    }

    return fields;
  }

  /**
   * Post page with form data
   */
  private postPage(
    cookieString: string,
    pagePath: string,
    formData: Record<string, string>,
  ): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
      const postData = querystring.stringify(formData);

      const options = {
        hostname: this.MEBBIS_HOST,
        path: pagePath,
        method: 'POST',
        headers: {
          Cookie: cookieString,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: this.REQUEST_TIMEOUT,
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 500,
            body: data,
          });
        });
      });

      req.on('error', (e) => {
        reject(e);
      });

      req.on('timeout', () => {
        req.abort();
        reject(new Error('Request timeout'));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Decode HTML entities
   */
  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&nbsp;/g, ' ')
      .replace(/&#231;/g, 'ç')
      .replace(/&#252;/g, 'ü')
      .replace(/&#246;/g, 'ö')
      .replace(/&#220;/g, 'Ü')
      .replace(/&#199;/g, 'Ç')
      .replace(/&#214;/g, 'Ö')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  /**
   * Parse HTML table from response
   */
  private parseTable(html: string, tableId: string): Record<string, string>[] {
    const tableRegex = new RegExp(
      `<table[^>]*id="${tableId}"[^>]*>([\\s\\S]*?)<\\/table>`,
      'i',
    );
    const tableMatch = html.match(tableRegex);

    if (!tableMatch) {
      return [];
    }

    const tableHtml = tableMatch[1];
    const rows: Record<string, string>[] = [];

    // Find header row
    const headerRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/i;
    const headerRowMatch = tableHtml.match(headerRowRegex);
    const headers: string[] = [];

    if (headerRowMatch) {
      const cellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
      let cellMatch;

      while ((cellMatch = cellRegex.exec(headerRowMatch[1])) !== null) {
        const cellText = this.decodeHtmlEntities(
          cellMatch[1].replace(/<[^>]*>/g, ''),
        );

        if (cellText) {
          headers.push(cellText);
        }
      }
    }

    // Find all data rows
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    let firstRow = true;

    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      if (firstRow) {
        firstRow = false;
        continue;
      }

      const rowContent = rowMatch[1];
      const cellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
      const cells: string[] = [];
      let cellMatch;

      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        const cellText = this.decodeHtmlEntities(
          cellMatch[1].replace(/<[^>]*>/g, ''),
        );
        cells.push(cellText);
      }

      if (cells.length > 0 && cells.some((c) => c.length > 0)) {
        const rowObj: Record<string, string> = {};
        headers.forEach((header, idx) => {
          rowObj[header] = cells[idx] || '';
        });
        rows.push(rowObj);
      }
    }

    return rows;
  }

  /**
   * Fetch vehicles and simulators from MEBBIS
   * @param cookieString Session cookie from MEBBIS
   * @param initialPageBody Initial page HTML response
   * @param session Session data
   * @returns Combined vehicles and simulators data
   */
  async fetchVehiclesAndSimulators(
    cookieString: string,
    initialPageBody: string,
    session: { tbmebbis_id: string; adi: string; tbmebbisadi: string },
  ): Promise<VehiclesAndSimulatorsResponse> {
    try {
      this.logger.log('🚀 Starting to fetch vehicles and simulators from MEBBIS');

      // Extract hidden inputs from initial response
      const hiddenInputs = this.extractFormFields(initialPageBody);
      this.logger.debug('✓ Extracted form fields');

      // Fetch vehicles (dropTurSecim = 1)
      this.logger.log('📡 Fetching VEHICLES (Eğitim Aracı)...');
      const vehicleData = {
        ...hiddenInputs,
        '__EVENTTARGET': 'dropTurSecim',
        '__EVENTARGUMENT': '',
        'dropTurSecim': '1',
      };

      const vehicleResponse = await this.postPage(
        cookieString,
        '/SKT/skt01002.aspx',
        vehicleData,
      );

      let vehicles: Vehicle[] = [];
      if (vehicleResponse.statusCode === 200) {
        const tableData = this.parseTable(
          vehicleResponse.body,
          'dgAracBilgileri',
        );
        vehicles = tableData as Vehicle[];
        this.logger.log(`✓ Found ${vehicles.length} vehicles`);
      } else {
        this.logger.warn(
          `❌ Vehicle fetch failed. Status: ${vehicleResponse.statusCode}`,
        );
      }

      // Fetch simulators (dropTurSecim = 2)
      this.logger.log('📡 Fetching SIMULATORS (Simülatör)...');
      const simulatorData = {
        ...hiddenInputs,
        '__EVENTTARGET': 'dropTurSecim',
        '__EVENTARGUMENT': '',
        'dropTurSecim': '2',
      };

      const simulatorResponse = await this.postPage(
        cookieString,
        '/SKT/skt01002.aspx',
        simulatorData,
      );

      let simulators: Simulator[] = [];
      if (simulatorResponse.statusCode === 200) {
        const tableData = this.parseTable(
          simulatorResponse.body,
          'dgSimulatorBilgileri',
        );
        simulators = tableData as Simulator[];
        this.logger.log(`✓ Found ${simulators.length} simulators`);
      } else {
        this.logger.warn(
          `❌ Simulator fetch failed. Status: ${simulatorResponse.statusCode}`,
        );
      }

      // Create combined response
      const combinedData: VehiclesAndSimulatorsResponse = {
        session: {
          id: session.tbmebbis_id,
          name: session.adi,
          userId: session.tbmebbisadi,
        },
        vehicles,
        simulators,
        fetchedAt: new Date().toISOString(),
      };

      this.logger.log(
        `✅ Successfully fetched ${vehicles.length} vehicles and ${simulators.length} simulators`,
      );

      return combinedData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `❌ Error fetching vehicles and simulators: ${errorMessage}`,
      );
      throw new BadRequestException(
        `Failed to fetch vehicles and simulators: ${errorMessage}`,
      );
    }
  }
}
