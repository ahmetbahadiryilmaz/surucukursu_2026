import { useCallback } from 'react';

export enum MebbisErrorCode {
  MEBBIS_2FA_REQUIRED = 'MEBBIS_2FA_REQUIRED',
  MEBBIS_INVALID_CREDENTIALS = 'MEBBIS_INVALID_CREDENTIALS',
  MEBBIS_SESSION_EXPIRED = 'MEBBIS_SESSION_EXPIRED',
  MEBBIS_UNAVAILABLE = 'MEBBIS_UNAVAILABLE',
  MEBBIS_ERROR = 'MEBBIS_ERROR',
  MEBBIS_NO_DATA = 'MEBBIS_NO_DATA',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export type MebbisModalType = '2fa' | 'credentials' | 'error' | 'none';

export interface MebbisErrorAction {
  modalType: MebbisModalType;
  message: string;
  code: MebbisErrorCode;
}

/**
 * Hook to centralize MEBBIS error handling
 * Detects error type and returns appropriate action to show modal
 * 
 * Usage:
 * ```tsx
 * const { handleMebbisError } = useMebbisErrorHandler();
 * 
 * try {
 *   // API call
 * } catch (err) {
 *   const action = handleMebbisError(err);
 *   if (action.modalType === '2fa') {
 *     setShowCodeModal(true);
 *   } else if (action.modalType === 'credentials') {
 *     setShowCredentialsModal(true);
 *   }
 * }
 * ```
 */
export const useMebbisErrorHandler = () => {
  /**
   * Extract error message from various error formats
   */
  const extractErrorMessage = useCallback((err: any): string => {
    // Try to extract error message from AxiosError
    if (err?.response?.data?.message) {
      return err.response.data.message;
    }
    if (err?.response?.data?.error?.message) {
      return err.response.data.error.message;
    }
    if (err instanceof Error) {
      return err.message;
    }
    if (typeof err === 'string') {
      return err;
    }
    if (typeof err === 'object' && err !== null) {
      return err.message || JSON.stringify(err);
    }
    return 'Bilinmeyen bir hata oluştu';
  }, []);

  /**
   * Determine error code from error message or response
   */
  const getErrorCode = useCallback((err: any, errorMessage: string): MebbisErrorCode => {
    // Check for explicit error code in response
    if (err?.response?.data?.code) {
      return err.response.data.code as MebbisErrorCode;
    }

    // Fall back to keyword-based detection for backwards compatibility
    const msg = errorMessage.toLowerCase();

    if (msg.includes('ajanda kodu') || msg.includes('ajanda') || msg.includes('2fa') || msg.includes('doğrulama kodu')) {
      return MebbisErrorCode.MEBBIS_2FA_REQUIRED;
    }

    if (msg.includes('kimlik') || msg.includes('şifre') || msg.includes('kullanıcı adı') || 
        msg.includes('hatalı') || msg.includes('başarısız')) {
      return MebbisErrorCode.MEBBIS_INVALID_CREDENTIALS;
    }

    if (msg.includes('session') || msg.includes('oturum')) {
      return MebbisErrorCode.MEBBIS_SESSION_EXPIRED;
    }

    if (msg.includes('unavailable') || msg.includes('temporarily')) {
      return MebbisErrorCode.MEBBIS_UNAVAILABLE;
    }

    return MebbisErrorCode.MEBBIS_ERROR;
  }, []);

  /**
   * Determine which modal to show based on error code
   */
  const getModalType = useCallback((errorCode: MebbisErrorCode): MebbisModalType => {
    switch (errorCode) {
      case MebbisErrorCode.MEBBIS_2FA_REQUIRED:
        return '2fa';
      case MebbisErrorCode.MEBBIS_INVALID_CREDENTIALS:
      case MebbisErrorCode.MEBBIS_SESSION_EXPIRED:
        return 'credentials';
      case MebbisErrorCode.MEBBIS_UNAVAILABLE:
      case MebbisErrorCode.MEBBIS_ERROR:
      case MebbisErrorCode.MEBBIS_NO_DATA:
      case MebbisErrorCode.UNKNOWN_ERROR:
      default:
        return 'none';
    }
  }, []);

  /**
   * Main error handler function
   * @param err The caught error
   * @returns Action object with modal type and message
   */
  const handleMebbisError = useCallback((err: any): MebbisErrorAction => {
    console.error('❌ MEBBIS Error:', err);

    const errorMessage = extractErrorMessage(err);
    const errorCode = getErrorCode(err, errorMessage);
    const modalType = getModalType(errorCode);

    console.log(`📋 Error Code: ${errorCode}, Modal: ${modalType}, Message: ${errorMessage}`);

    return {
      code: errorCode,
      message: errorMessage,
      modalType,
    };
  }, [extractErrorMessage, getErrorCode, getModalType]);

  return {
    handleMebbisError,
    MebbisErrorCode,
  };
};
