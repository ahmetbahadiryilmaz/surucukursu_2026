"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MebbisErrorCode = void 0;
/**
 * MEBBIS Error Codes
 * Used to standardize error reporting and frontend handling
 */
var MebbisErrorCode;
(function (MebbisErrorCode) {
    // 2FA / OTP Required
    MebbisErrorCode["MEBBIS_2FA_REQUIRED"] = "MEBBIS_2FA_REQUIRED";
    // Credential Errors
    MebbisErrorCode["MEBBIS_INVALID_CREDENTIALS"] = "MEBBIS_INVALID_CREDENTIALS";
    MebbisErrorCode["MEBBIS_SESSION_EXPIRED"] = "MEBBIS_SESSION_EXPIRED";
    // Server/Network Errors
    MebbisErrorCode["MEBBIS_UNAVAILABLE"] = "MEBBIS_UNAVAILABLE";
    MebbisErrorCode["MEBBIS_ERROR"] = "MEBBIS_ERROR";
    // Data Errors
    MebbisErrorCode["MEBBIS_NO_DATA"] = "MEBBIS_NO_DATA";
    // Generic
    MebbisErrorCode["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
})(MebbisErrorCode || (exports.MebbisErrorCode = MebbisErrorCode = {}));
