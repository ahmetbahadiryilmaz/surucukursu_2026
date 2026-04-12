import { Controller, Post, Body, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { VehiclesSimulatorsService } from '../mebbis/vehicles-simulators.service';
import { AuthService } from '../auth.service';
import { MebbisErrorCode } from '@surucukursu/shared';

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
    this.logger.log(`🔐 DEBUG username: ${body.username}, password: ${body.password}, ajandasKodu: ${body.ajandasKodu || 'N/A'}`);
    try {
      // Step 0: Check if existing session is still alive
      this.logger.log('🔍 Checking if existing session is alive...');
      const authCheck = await this.authService.checkAuth(body.drivingSchoolId);

      if (authCheck.isAlive) {
        this.logger.log(`✅ Session is alive (user: ${authCheck.userName}), skipping login`);
      } else {
        // Session expired or no cookie - need to login
        this.logger.log('🔒 Session expired, proceeding with login...');

        // Step 1: Validate credentials using auth service
        this.logger.log('🔑 Validating credentials...');
        const loginResult = await this.authService.tryLogin(
          body.username,
          body.password,
          body.drivingSchoolId,
        );

        if (loginResult.error) {
          this.logger.error('❌ Credential validation failed:', loginResult.error.message);
          
          if (loginResult.error.isWrongCredentials) {
            throw new HttpException(
              {
                code: MebbisErrorCode.MEBBIS_INVALID_CREDENTIALS,
                message: loginResult.error.message,
              },
              HttpStatus.BAD_REQUEST,
            );
          } else {
            this.logger.log('🔄 Login failed but not due to wrong credentials - may need AJANDA KODU');
            throw new HttpException(
              {
                code: MebbisErrorCode.MEBBIS_2FA_REQUIRED,
                message: 'AJANDA KODU gerekli. Lütfen MEBBIS\'ten aldığınız kodu giriniz.',
              },
              HttpStatus.BAD_REQUEST,
            );
          }
        }
        
        this.logger.log('✅ Credentials validated successfully');
        
        if (!body.ajandasKodu) {
          this.logger.log('📱 AJANDA KODU not provided - requesting code entry');
          throw new HttpException(
            {
              code: MebbisErrorCode.MEBBIS_2FA_REQUIRED,
              message: 'AJANDA KODU gerekli. Lütfen MEBBIS\'ten aldığınız kodu giriniz.',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Step 2: Get saved cookie for this driving school
      this.logger.log('📦 Retrieving saved session...');
      const cookie = await this.authService.getCookie(body.drivingSchoolId);
      
      if (!cookie) {
        this.logger.error('❌ No session cookie found after login');
        throw new HttpException(
          {
            code: MebbisErrorCode.MEBBIS_SESSION_EXPIRED,
            message: 'MEBBIS oturumu alınamadı',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(`🍪 DEBUG cookie (first 100 chars): ${cookie.substring(0, 100)}...`);
      this.logger.log(`🍪 DEBUG cookie length: ${cookie.length}`);

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
      
      // If it's already a HttpException with our error code structure, re-throw it
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          code: MebbisErrorCode.MEBBIS_ERROR,
          message: error instanceof Error
            ? error.message
            : 'MEBBIS araçları senkronize sırasında bir hata oluştu',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
