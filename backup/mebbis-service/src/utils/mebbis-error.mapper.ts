import { MebbisErrorCode } from '@surucukursu/shared';

/**
 * Maps error messages/signatures to standardized MEBBIS error codes
 * Single source of truth for error handling across all controllers
 */
export class MebbisErrorMapper {
  /**
   * Detect error type from error message and return standardized error code + message
   * @param errorMessage The error message to detect
   * @returns { code: MebbisErrorCode, message: string }
   */
  static mapErrorMessage(
    errorMessage: string | null | undefined,
  ): { code: MebbisErrorCode; message: string } {
    if (!errorMessage) {
      return {
        code: MebbisErrorCode.MEBBIS_ERROR,
        message: 'Bilinmeyen bir hata oluştu',
      };
    }

    const lowerMsg = errorMessage.toLowerCase();

    // 2FA/AJANDA KODU Required (session expired)
    if (
      lowerMsg.includes('session') ||
      errorMessage === 'SESSION_EXPIRED' ||
      lowerMsg.includes('ajanda')
    ) {
      return {
        code: MebbisErrorCode.MEBBIS_2FA_REQUIRED,
        message:
          'AJANDA KODU gerekli. Lütfen MEBBIS\'ten aldığınız kodu giriniz.',
      };
    }

    // Invalid credentials
    if (
      lowerMsg.includes('credential') ||
      lowerMsg.includes('invalid') ||
      lowerMsg.includes('wrong') ||
      lowerMsg.includes('username') ||
      lowerMsg.includes('password') ||
      lowerMsg.includes('şifre')
    ) {
      return {
        code: MebbisErrorCode.MEBBIS_INVALID_CREDENTIALS,
        message: errorMessage,
      };
    }

    // MEBBIS Unavailable
    if (
      lowerMsg.includes('unavailable') ||
      lowerMsg.includes('unreachable') ||
      lowerMsg.includes('timeout') ||
      lowerMsg.includes('connection')
    ) {
      return {
        code: MebbisErrorCode.MEBBIS_UNAVAILABLE,
        message: 'MEBBIS şu anda hizmet dışı. Lütfen daha sonra tekrar deneyin.',
      };
    }

    // No data found
    if (
      lowerMsg.includes('no data') ||
      lowerMsg.includes('not found') ||
      lowerMsg.includes('empty')
    ) {
      return {
        code: MebbisErrorCode.MEBBIS_NO_DATA,
        message: errorMessage,
      };
    }

    // Generic MEBBIS error
    return {
      code: MebbisErrorCode.MEBBIS_ERROR,
      message: errorMessage,
    };
  }

  /**
   * Create a standardized MEBBIS error response object
   * @param errorMessage The error message to map
   * @returns { code: MebbisErrorCode, message: string }
   */
  static create(errorMessage: string | null | undefined) {
    return this.mapErrorMessage(errorMessage);
  }
}
