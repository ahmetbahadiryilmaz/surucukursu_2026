/**
 * MEBBIS Error Codes
 * Used to standardize error reporting and frontend handling
 */
export enum MebbisErrorCode {
  // 2FA / OTP Required
  MEBBIS_2FA_REQUIRED = 'MEBBIS_2FA_REQUIRED',
  
  // Credential Errors
  MEBBIS_INVALID_CREDENTIALS = 'MEBBIS_INVALID_CREDENTIALS',
  MEBBIS_SESSION_EXPIRED = 'MEBBIS_SESSION_EXPIRED',
  
  // Server/Network Errors
  MEBBIS_UNAVAILABLE = 'MEBBIS_UNAVAILABLE',
  MEBBIS_ERROR = 'MEBBIS_ERROR',
  
  // Data Errors
  MEBBIS_NO_DATA = 'MEBBIS_NO_DATA',
  
  // Generic
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * MEBBIS Error Response Structure
 * All MEBBIS-related errors should follow this format
 */
export interface MebbisErrorResponse {
  code: MebbisErrorCode;
  message: string;
  details?: Record<string, any>;
}

/**
 * Standardized API Response that includes error code
 */
export interface StandardApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: MebbisErrorResponse;
  code?: MebbisErrorCode;
  message?: string;
}
