import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MebbisClientService {
  private readonly logger = new Logger(MebbisClientService.name);
  private readonly mebbisServiceUrl = `http://localhost:${process.env.MEBBIS_SERVICE_PORT || '3000'}`;

  constructor(private readonly httpService: HttpService) {}

  /**
   * Validate MEBBIS credentials by checking login status
   * Uses existing tryLogin endpoint with a temporary tbMebbisId
   * @param username MEBBIS username
   * @param password MEBBIS password
   * @param drivingSchoolId Optional driving school ID to store cookies with
   * @returns { success: boolean; message: string }
   */
  async validateCredentials(username: string, password: string, drivingSchoolId?: number): Promise<{ success: boolean; message: string }> {
    try {
      const url = `${this.mebbisServiceUrl}/api/mebbis/login/trylogin`;
      this.logger.log(`[START] Making request to MEBBIS service: ${url}`);
      this.logger.debug(`Request body: { username: ${username}, password: ***, drivingSchoolId: ${drivingSchoolId || 0} }`);
      
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          {
            username,
            password,
            drivingSchoolId: drivingSchoolId || 0, // Use driving_school_id if provided
          },
          {
            timeout: 30000, // 30 second timeout
          }
        )
      );

      this.logger.log(`[RESPONSE] Received response from MEBBIS service:`, JSON.stringify(response.data));

      // Check if login was successful
      if (response.data && response.data.message === 'login success') {
        this.logger.log(`[SUCCESS] Credentials validated successfully for user: ${username}`);
        return {
          success: true,
          message: 'Credentials are valid',
        };
      } else {
        this.logger.warn(`[FAILED] Credentials validation failed for user: ${username}`);
        const errorMessage = response.data?.error?.message || response.data?.message || 'Invalid username or password';
        return {
          success: false,
          message: errorMessage,
        };
      }
    } catch (error) {
      this.logger.error(
        `[ERROR] Error validating credentials for user: ${username}`,
        error?.message
      );
      this.logger.error(`Error details:`, error);

      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Invalid username or password',
        };
      }

      // Handle network errors (ECONNREFUSED, ECONNRESET, ETIMEDOUT, etc.)
      if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        this.logger.error(`MEBBIS service at ${this.mebbisServiceUrl} is not reachable (${error.code})`);
        throw new HttpException(
          'MEBBIS service is temporarily unavailable',
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      throw new HttpException(
        'Error validating credentials with MEBBIS service',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
