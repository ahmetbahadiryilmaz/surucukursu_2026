export declare enum MebbisErrorCode {
    MEBBIS_2FA_REQUIRED = "MEBBIS_2FA_REQUIRED",
    MEBBIS_INVALID_CREDENTIALS = "MEBBIS_INVALID_CREDENTIALS",
    MEBBIS_SESSION_EXPIRED = "MEBBIS_SESSION_EXPIRED",
    MEBBIS_UNAVAILABLE = "MEBBIS_UNAVAILABLE",
    MEBBIS_ERROR = "MEBBIS_ERROR",
    MEBBIS_NO_DATA = "MEBBIS_NO_DATA",
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
}
export interface MebbisErrorResponse {
    code: MebbisErrorCode;
    message: string;
    details?: Record<string, any>;
}
export interface StandardApiResponse<T = any> {
    success?: boolean;
    data?: T;
    error?: MebbisErrorResponse;
    code?: MebbisErrorCode;
    message?: string;
}
