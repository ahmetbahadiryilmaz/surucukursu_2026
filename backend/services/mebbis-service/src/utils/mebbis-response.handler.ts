import { BadRequestException } from '@nestjs/common';
import { Logger } from '@nestjs/common';

const logger = new Logger('MebbisResponseHandler');

export class MebbisSessionExpiredError extends BadRequestException {
  constructor(message: string = 'MEBBIS oturumunuz süresi dolmuş') {
    super(message);
    this.name = 'MebbisSessionExpiredError';
  }
}

export class MebbisInvalidCredentialsError extends BadRequestException {
  constructor(message: string = 'Kullanıcı adı veya şifre hatalı') {
    super(message);
    this.name = 'MebbisInvalidCredentialsError';
  }
}

/**
 * Check if response indicates a session redirect (expired or not authenticated)
 * Status 302 with redirect to login page indicates session expiration
 */
export function checkMebbisSessionExpired(statusCode: number, headers?: Record<string, any>): void {
  // Check for 302/303 status codes indicating redirect
  if (statusCode >= 300 && statusCode < 400) {
    const location = headers?.location || headers?.Location || '';
    
    logger.warn(`⚠️ MEBBIS returned redirect status: ${statusCode}`);
    logger.warn(`📍 Redirect location: ${location}`);
    
    // Check if redirecting to login or default page (indicates session expired)
    if (
      location.includes('default.aspx') ||
      location.includes('login') ||
      location.includes('oturum') ||
      !location.includes('SKT') ||
      !location.includes('skt01')
    ) {
      logger.error('❌ MEBBIS session expired or redirecting to login page');
      throw new MebbisSessionExpiredError(
        'MEBBIS oturumunuz süresi dolmuş. Lütfen MEBBIS AJANDA KODUNU giriniz.'
      );
    }
  }
}

/**
 * Check if MEBBIS response indicates invalid credentials (login page returned after POST)
 * Used when login fails or when API response redirects back to login
 * @param statusCode HTTP status code from MEBBIS
 * @param responseBody Response body content
 * @param headers Response headers
 * @throws MebbisInvalidCredentialsError if credentials are invalid
 */
export function checkMebbisInvalidCredentials(
  statusCode: number,
  responseBody?: string,
  headers?: Record<string, any>,
): void {
  // Check for redirect to login page
  if (statusCode === 302 || statusCode === 301) {
    const location = headers?.location || headers?.Location || '';
    if (location.includes('skt01001.aspx') || location.includes('login')) {
      logger.error('❌ MEBBIS redirected to login page - credentials invalid');
      throw new MebbisInvalidCredentialsError('Kullanıcı adı veya şifre hatalı');
    }
  }

  // Check if response contains login form (indicates login page was returned)
  if (responseBody) {
    const bodyLower = responseBody.toLowerCase();
    if (
      bodyLower.includes('txtusernameoremail') ||
      (bodyLower.includes('skt01001.aspx') && bodyLower.includes('form'))
    ) {
      logger.error('❌ MEBBIS returned login form - credentials invalid or session expired');
      throw new MebbisInvalidCredentialsError('Kullanıcı adı veya şifre hatalı');
    }
  }
}

/**
 * Validate MEBBIS response and throw error if session is expired
 * @param statusCode HTTP status code from MEBBIS
 * @param responseBody Response body content
 * @param headers Response headers
 * @throws MebbisSessionExpiredError if session is expired
 * @throws BadRequestException if other errors occur
 */
export function validateMebbisResponse(
  statusCode: number,
  responseBody?: string,
  headers?: Record<string, any>,
): void {
  // First check for redirect responses
  checkMebbisSessionExpired(statusCode, headers);

  // Check for error status codes
  if (statusCode >= 400) {
    logger.error(`❌ MEBBIS returned error status: ${statusCode}`);
    throw new BadRequestException(
      `MEBBIS hizmeti bir hata döndürdü: ${statusCode}`
    );
  }

  // Check response body for error messages
  if (responseBody) {
    const bodyLower = responseBody.toLowerCase();
    if (
      bodyLower.includes('oturum') ||
      bodyLower.includes('session') ||
      bodyLower.includes('expired') ||
      bodyLower.includes('giriş yap') ||
      bodyLower.includes('login required')
    ) {
      logger.error('❌ MEBBIS response indicates session issue');
      throw new MebbisSessionExpiredError(
        'MEBBIS oturumunuz süresi dolmuş. Lütfen MEBBIS AJANDA KODUNU giriniz.'
      );
    }
  }
}
