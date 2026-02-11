import { Controller, Post, Body, Logger, BadRequestException } from '@nestjs/common';
import { VehiclesSimulatorsService } from '../mebbis/vehicles-simulators.service';
import { AuthService } from '../auth.service';

interface FetchVehiclesRequest {
  cookieString: string;
  initialPageBody: string;
  session: {
    tbmebbis_id: string;
    adi: string;
    tbmebbisadi: string;
  };
  // Optional: for retry with credentials
  username?: string;
  password?: string;
  // Optional: MEBBIS AJANDA KODU for manual entry
  ajandasKodu?: string;
}

interface SyncVehiclesRequest {
  drivingSchoolId: number;
  username: string;
  password: string;
  ajandasKodu?: string;
}

@Controller('api/mebbis/vehicles')
export class VehiclesController {
  private readonly logger = new Logger(VehiclesController.name);

  constructor(
    private readonly vehiclesService: VehiclesSimulatorsService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Fetch vehicles with pre-authenticated session
   * Used when cookie and initial page are already available
   */
  @Post('fetch')
  async fetchVehiclesAndSimulators(@Body() body: FetchVehiclesRequest): Promise<any> {
    this.logger.log('📡 Received request to fetch vehicles and simulators');
    try {
      const result = await this.vehiclesService.fetchVehiclesAndSimulators(
        body.cookieString,
        body.initialPageBody,
        body.session,
        body.username,
        body.password,
        body.ajandasKodu,
      );
      this.logger.log('✅ Vehicles and simulators fetched successfully');
      return result;
    } catch (error) {
      this.logger.error('❌ Error fetching vehicles:', error);
      throw error;
    }
  }

  /**
   * Sync vehicles - handles authentication and fetching in one call
   * This is the main endpoint for frontend/api-server to use
   * mebbis-service handles all credential validation and session management
   */
  @Post('sync')
  async syncVehicles(@Body() body: SyncVehiclesRequest): Promise<any> {
    this.logger.log(`📡 Received sync request for driving school ${body.drivingSchoolId}`);
    try {
      // Step 1: Validate credentials using auth service
      this.logger.log('🔑 Validating credentials...');
      const loginResult = await this.authService.tryLogin(
        body.username,
        body.password,
        body.drivingSchoolId,
      );

      if (loginResult.error) {
        // Check if it's actually wrong credentials or just needs AJANDA KODU
        this.logger.error('❌ Credential validation failed:', loginResult.error.message);
        
        if (loginResult.error.isWrongCredentials) {
          throw new BadRequestException(loginResult.error.message);
        } else {
          // Not wrong credentials - might need AJANDA KODU
          this.logger.log('🔄 Login failed but not due to wrong credentials - may need AJANDA KODU');
          throw new BadRequestException('AJANDA KODU gerekli. Lütfen MEBBIS\'ten aldığınız kodu giriniz.');
        }
      }
      
      // Login successful - credentials are valid
      this.logger.log('✅ Credentials validated successfully');
      
      // Check if AJANDA KODU was provided
      if (!body.ajandasKodu) {
        // No code provided - need to request it
        this.logger.log('📱 AJANDA KODU not provided - requesting code entry');
        throw new BadRequestException('AJANDA KODU gerekli. Lütfen MEBBIS\'ten aldığınız kodu giriniz.');
      }

      // Step 2: Get saved cookie for this driving school
      this.logger.log('📦 Retrieving saved session...');
      const cookie = await this.authService.getCookie(body.drivingSchoolId);
      
      if (!cookie) {
        this.logger.error('❌ No session cookie found after login');
        throw new BadRequestException('MEBBIS oturumu alınamadı');
      }

      // Step 3: Fetch initial page content to get form fields
      // We'll do a GET request to SKT/skt01002.aspx which is the vehicles page
      this.logger.log('📄 Fetching vehicles page for form fields...');
      const https = require('https');
      const initialPageBody = await new Promise<string>((resolve, reject) => {
        const options = {
          hostname: 'mebbisyd.meb.gov.tr',
          path: '/SKT/skt01002.aspx',
          method: 'GET',
          headers: {
            'Cookie': cookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 10000,
        };

        const req = https.get(options, (res: any) => {
          let data = '';
          res.on('data', (chunk: any) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve(data);
            } else {
              reject(new Error(`Failed to fetch initial page: ${res.statusCode}`));
            }
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.abort();
          reject(new Error('Request timeout'));
        });
      });

      // Step 4: Fetch vehicles and simulators
      this.logger.log('🚗 Fetching vehicles and simulators...');
      const result = await this.vehiclesService.fetchVehiclesAndSimulators(
        cookie,
        initialPageBody,
        {
          tbmebbis_id: body.drivingSchoolId.toString(),
          adi: '',
          tbmebbisadi: body.username,
        },
        body.username,
        body.password,
        body.ajandasKodu,
      );

      this.logger.log('✅ Vehicles sync completed successfully');
      return result;
    } catch (error) {
      this.logger.error('❌ Error syncing vehicles:', error);
      // If it's already a BadRequestException, re-throw it
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Otherwise wrap it as a BadRequestException
      throw new BadRequestException(
        error instanceof Error ? error.message : 'MEBBIS araçları senkronize sırasında bir hata oluştu'
      );
    }
  }
}
