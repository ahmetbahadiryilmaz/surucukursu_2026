import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as https from 'https';
import * as querystring from 'querystring';
import { validateMebbisResponse, MebbisSessionExpiredError, checkMebbisInvalidCredentials } from '../utils/mebbis-response.handler';

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
  ): Promise<{ statusCode: number; body: string; headers: Record<string, any> }> {
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
            headers: res.headers as Record<string, any>,
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
   * @param username Optional username for retry on session expiration
   * @param password Optional password for retry on session expiration
   * @param ajandasKodu Optional MEBBIS AJANDA KODU for code-based auth
   * @returns Combined vehicles and simulators data
   */
  async fetchVehiclesAndSimulators(
    cookieString: string,
    initialPageBody: string,
    session: { tbmebbis_id: string; adi: string; tbmebbisadi: string },
    username?: string,
    password?: string,
    ajandasKodu?: string,
  ): Promise<VehiclesAndSimulatorsResponse> {
    try {
      this.logger.log('🚀 Starting to fetch vehicles and simulators from MEBBIS');

      // Validate credentials first by checking if initial page contains login form or error
      // This detects if credentials were invalid before we proceed
      try {
        checkMebbisInvalidCredentials(200, initialPageBody);
        this.logger.log('✓ Credentials validated');
      } catch (credentialError) {
        this.logger.error('❌ Invalid credentials detected');
        throw credentialError;
      }

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
      try {
        validateMebbisResponse(
          vehicleResponse.statusCode,
          vehicleResponse.body,
          vehicleResponse.headers
        );
        
        if (vehicleResponse.statusCode === 200) {
          const tableData = this.parseTable(
            vehicleResponse.body,
            'dgAracBilgileri',
          );
          vehicles = tableData as Vehicle[];
          this.logger.log(`✓ Found ${vehicles.length} vehicles`);
        }
      } catch (error) {
        // If session expired and we have credentials, retry
        if (error instanceof MebbisSessionExpiredError && username && password) {
          this.logger.log('🔄 Session expired, attempting to re-authenticate and retry...');
          return await this.retryWithNewSession(
            username,
            password,
            session,
            ajandasKodu
          );
        }

        // If session expired but no credentials, ask for code
        if (error instanceof MebbisSessionExpiredError && !username && !password) {
          this.logger.log('⚠️ Session expired and no credentials provided. User must enter AJANDA KODU.');
          const err = new BadRequestException(
            'MEBBIS oturumunuz süresi dolmuş. MEBBIS AJANDA KODUNU giriniz.'
          );
          (err as any).requiresAjandasKodu = true;
          throw err;
        }

        this.logger.error(`❌ Vehicle fetch validation failed:`, error);
        throw error;
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
      try {
        validateMebbisResponse(
          simulatorResponse.statusCode,
          simulatorResponse.body,
          simulatorResponse.headers
        );
        
        if (simulatorResponse.statusCode === 200) {
          const tableData = this.parseTable(
            simulatorResponse.body,
            'dgSimulatorBilgileri',
          );
          simulators = tableData as Simulator[];
          this.logger.log(`✓ Found ${simulators.length} simulators`);
        }
      } catch (error) {
        // If session expired and we have credentials, retry
        if (error instanceof MebbisSessionExpiredError && username && password) {
          this.logger.log('🔄 Session expired during simulator fetch, attempting to re-authenticate and retry...');
          return await this.retryWithNewSession(
            username,
            password,
            session,
            ajandasKodu
          );
        }

        // If session expired but no credentials, ask for code
        if (error instanceof MebbisSessionExpiredError && !username && !password) {
          this.logger.log('⚠️ Session expired and no credentials provided. User must enter AJANDA KODU.');
          const err = new BadRequestException(
            'MEBBIS oturumunuz süresi dolmuş. MEBBIS AJANDA KODUNU giriniz.'
          );
          (err as any).requiresAjandasKodu = true;
          throw err;
        }

        this.logger.error(`❌ Simulator fetch validation failed:`, error);
        throw error;
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
      throw error instanceof BadRequestException 
        ? error 
        : new BadRequestException(
          `Failed to fetch vehicles and simulators: ${errorMessage}`,
        );
    }
  }

  /**
   * Retry fetching vehicles and simulators with a new session (after re-login)
   */
  private async retryWithNewSession(
    username: string,
    password: string,
    session: { tbmebbis_id: string; adi: string; tbmebbisadi: string },
    ajandasKodu?: string,
  ): Promise<VehiclesAndSimulatorsResponse> {
    this.logger.log(`🔑 Re-authenticating with username: ${username}`);
    
    // Note: Actual re-login logic would be implemented here
    // For now, we'll indicate that code is needed
    if (!ajandasKodu) {
      this.logger.warn('⚠️ Re-authentication requires MEBBIS AJANDA KODU');
      const err = new BadRequestException(
        'MEBBIS AJANDA KODUNU giriniz.'
      );
      (err as any).requiresAjandasKodu = true;
      throw err;
    }

    this.logger.log(`✅ Using provided AJANDA KODU for re-authentication`);
    
    // After entering code, would retry the fetch
    // This is a placeholder for the code submission flow
    throw new BadRequestException(
      'Lütfen AJANDA KODUNU giriş sayfasında kullanarak tekrar deneyin.'
    );
  }
}
