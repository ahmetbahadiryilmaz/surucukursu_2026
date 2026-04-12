import {
  Controller,
  Post,
  Body,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CandidatesListService } from '../mebbis/candidates-list.service';
import { AuthService } from '../auth.service';
import { MebbisErrorCode } from '@surucukursu/shared';

interface SyncStudentsRequest {
  drivingSchoolId: number;
  username: string;
  password: string;
}

@Controller('api/mebbis/students')
export class CandidatesController {
  private readonly logger = new Logger(CandidatesController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Sync students - handles authentication and fetching candidates in one call
   * This is the main endpoint for frontend/api-server to use
   * mebbis-service handles all credential validation and session management
   */
  @Post('sync')
  async syncStudents(@Body() body: SyncStudentsRequest): Promise<any> {
    this.logger.log(
      `📡 Received sync request for driving school ${body.drivingSchoolId}`,
    );
    this.logger.log(
      `🔐 DEBUG username: ${body.username}, password: ${body.password}`,
    );

    try {
      // Step 0: Check if existing session is still alive
      this.logger.log('🔍 Checking if existing session is alive...');
      const authCheck = await this.authService.checkAuth(body.drivingSchoolId);

      if (authCheck.isAlive) {
        this.logger.log(
          `✅ Session is alive (user: ${authCheck.userName}), skipping login`,
        );
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
      }

      // Step 2: Get the cookie and fetch students
      this.logger.log('📡 Fetching students from MEBBIS...');
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

      this.logger.log(
        `🍪 DEBUG cookie (first 100 chars): ${cookie.substring(0, 100)}...`,
      );
      this.logger.log(`🍪 DEBUG cookie length: ${cookie.length}`);

      // Fetch candidates - pass cookie so AxiosService can authenticate
      const candidatesService = new CandidatesListService(
        body.drivingSchoolId,
        cookie,
      );
      const result = await candidatesService.getCandidates();

      if (!result.success) {
        const errorMsg =
          typeof result.data === 'string'
            ? result.data
            : 'Öğrencileri alırken bir hata oluştu';
        this.logger.error('❌ Failed to fetch candidates:', errorMsg);
        
        // Detect error type from message for appropriate error code
        let errorCode = MebbisErrorCode.MEBBIS_ERROR;
        if (errorMsg === 'SESSION_EXPIRED' || errorMsg.toLowerCase().includes('session')) {
          errorCode = MebbisErrorCode.MEBBIS_SESSION_EXPIRED;
        }
        
        throw new HttpException(
          {
            code: errorCode,
            message: errorMsg,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(
        `✅ Students sync completed successfully. Found ${result.data.length} students`,
      );
      return {
        success: true,
        students: result.data,
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('❌ Error syncing students:', error);
      
      // If it's already a HttpException with our error code structure, re-throw it
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          code: MebbisErrorCode.MEBBIS_ERROR,
          message: error instanceof Error
            ? error.message
            : 'Öğrencileri senkronize sırasında bir hata oluştu',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
