"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTP_PROCESS_STATES = exports.COMMON_ACTION_STATUSES = exports.ACTION_HISTORY_SERVICES = exports.PERMISSION_TYPES = exports.CarrierAccountTypes = exports.CommonBoolishes = exports.PageLimits = exports.VerificationTokenTypes = exports.CommonClientStatuses = exports.CodePrefixes = exports.RedisKeys = exports.CommonTableStatuses = exports.DB_TYPES = exports.Modes = exports.Languages = exports.DBS = exports.CLIENTS = exports.Performers = exports.Platforms = void 0;
var Modes;
(function (Modes) {
    Modes["DEV"] = "dev";
    Modes["PROD"] = "prod";
})(Modes || (exports.Modes = Modes = {}));
// Export system types
__exportStar(require("./system.types"), exports);
var DB_TYPES;
(function (DB_TYPES) {
    DB_TYPES["POSTGRES"] = "postgres";
})(DB_TYPES || (exports.DB_TYPES = DB_TYPES = {}));
var CommonTableStatuses;
(function (CommonTableStatuses) {
    CommonTableStatuses[CommonTableStatuses["ACTIVE"] = 1] = "ACTIVE";
    CommonTableStatuses[CommonTableStatuses["PASSIVE"] = 2] = "PASSIVE";
    CommonTableStatuses[CommonTableStatuses["DELETED"] = 3] = "DELETED";
})(CommonTableStatuses || (exports.CommonTableStatuses = CommonTableStatuses = {}));
var CommonClientStatuses;
(function (CommonClientStatuses) {
    CommonClientStatuses[CommonClientStatuses["ACTIVE"] = 1] = "ACTIVE";
    CommonClientStatuses[CommonClientStatuses["PASSIVE"] = 2] = "PASSIVE";
})(CommonClientStatuses || (exports.CommonClientStatuses = CommonClientStatuses = {}));
var RedisKeys;
(function (RedisKeys) {
    RedisKeys["EMAIL_TOKEN"] = "email_token";
    RedisKeys["ACCESS_TOKEN"] = "access_token";
    RedisKeys["USER_PERMISSIONS"] = "user_permissions";
    RedisKeys["STORE_PERMISSION"] = "store_permissions";
    RedisKeys["RESET_PASSWORD"] = "reset_password";
    RedisKeys["RESET_PASSWORD_ATTEMPT"] = "reset_password_attempt";
    RedisKeys["REGISTER_ATTEMPT"] = "register_attempt";
    RedisKeys["CONSENT_PERMISSION"] = "consent_permissions";
    RedisKeys["LOGIN_WITH_SHIPENTEGRA"] = "login_with_shipentegra";
    RedisKeys["CONNECT_SHIPENTEGRA_STORES"] = "connect_shipentegra_stores";
    RedisKeys["FCM_TOKENS"] = "fcm_tokens";
    RedisKeys["INCORRECT_LOGIN"] = "incorrect_login";
    RedisKeys["PHOTO_EXPLORER"] = "photo_explorer";
    RedisKeys["CAPTCHA_CONTROL"] = "captcha_control";
    RedisKeys["OTP_VERIFICATION"] = "otp_verification";
    RedisKeys["OTP_PROCESS"] = "otp_process";
    RedisKeys["OTP_LOGIN_BLOCKED"] = "otp_login_blocked";
    RedisKeys["TWO_STEP_VERIFICATION_STATE"] = "users_2fa";
})(RedisKeys || (exports.RedisKeys = RedisKeys = {}));
var CodePrefixes;
(function (CodePrefixes) {
    CodePrefixes["STORE"] = "ONE";
})(CodePrefixes || (exports.CodePrefixes = CodePrefixes = {}));
var VerificationTokenTypes;
(function (VerificationTokenTypes) {
    VerificationTokenTypes[VerificationTokenTypes["ACCESS_TOKEN"] = 1] = "ACCESS_TOKEN";
    VerificationTokenTypes[VerificationTokenTypes["CONSENT_PERMISSIONS"] = 2] = "CONSENT_PERMISSIONS";
})(VerificationTokenTypes || (exports.VerificationTokenTypes = VerificationTokenTypes = {}));
var PageLimits;
(function (PageLimits) {
    PageLimits[PageLimits["PAGE_100"] = 100] = "PAGE_100";
    PageLimits[PageLimits["PAGE_75"] = 75] = "PAGE_75";
    PageLimits[PageLimits["PAGE_50"] = 50] = "PAGE_50";
    PageLimits[PageLimits["PAGE_25"] = 25] = "PAGE_25";
    PageLimits[PageLimits["PAGE_10"] = 10] = "PAGE_10";
})(PageLimits || (exports.PageLimits = PageLimits = {}));
var CommonBoolishes;
(function (CommonBoolishes) {
    CommonBoolishes["yes"] = "yes";
    CommonBoolishes["no"] = "no";
})(CommonBoolishes || (exports.CommonBoolishes = CommonBoolishes = {}));
var CarrierAccountTypes;
(function (CarrierAccountTypes) {
    CarrierAccountTypes[CarrierAccountTypes["SHIPENTEGRA"] = 1] = "SHIPENTEGRA";
})(CarrierAccountTypes || (exports.CarrierAccountTypes = CarrierAccountTypes = {}));
var Languages;
(function (Languages) {
    Languages["TR"] = "en";
    Languages["EN"] = "tr";
})(Languages || (exports.Languages = Languages = {}));
var DBS;
(function (DBS) {
    DBS["MONGO"] = "mongo";
})(DBS || (exports.DBS = DBS = {}));
var CLIENTS;
(function (CLIENTS) {
    CLIENTS["RABBIT_MONGO"] = "rabbit_mongo";
    CLIENTS["STORE_NOTIFICATION"] = "store_notification";
})(CLIENTS || (exports.CLIENTS = CLIENTS = {}));
var Performers;
(function (Performers) {
    Performers[Performers["user"] = 1] = "user";
    Performers[Performers["authorized"] = 2] = "authorized";
    Performers[Performers["system"] = 3] = "system";
})(Performers || (exports.Performers = Performers = {}));
var Platforms;
(function (Platforms) {
    Platforms[Platforms["WEB"] = 1] = "WEB";
    Platforms[Platforms["MOBILE"] = 2] = "MOBILE";
})(Platforms || (exports.Platforms = Platforms = {}));
var PERMISSION_TYPES;
(function (PERMISSION_TYPES) {
    PERMISSION_TYPES[PERMISSION_TYPES["USER"] = 1] = "USER";
    PERMISSION_TYPES[PERMISSION_TYPES["STORE"] = 2] = "STORE";
})(PERMISSION_TYPES || (exports.PERMISSION_TYPES = PERMISSION_TYPES = {}));
// If a change is made, the same change must be made on the admin side!!!
var ACTION_HISTORY_SERVICES;
(function (ACTION_HISTORY_SERVICES) {
    ACTION_HISTORY_SERVICES["ADMIN"] = "ADMIN";
    ACTION_HISTORY_SERVICES["COUPON_CODE"] = "COUPON_CODE";
    ACTION_HISTORY_SERVICES["ENTERPRISE_CONTACT"] = "ENTERPRISE_CONTACT";
    ACTION_HISTORY_SERVICES["PACKAGE"] = "PACKAGE";
    ACTION_HISTORY_SERVICES["USER"] = "USER";
})(ACTION_HISTORY_SERVICES || (exports.ACTION_HISTORY_SERVICES = ACTION_HISTORY_SERVICES = {}));
// If a change is made, the same change must be made on the admin side!!!
var COMMON_ACTION_STATUSES;
(function (COMMON_ACTION_STATUSES) {
    COMMON_ACTION_STATUSES[COMMON_ACTION_STATUSES["CREATE"] = 1] = "CREATE";
    COMMON_ACTION_STATUSES[COMMON_ACTION_STATUSES["UPDATE"] = 2] = "UPDATE";
    COMMON_ACTION_STATUSES[COMMON_ACTION_STATUSES["DELETE"] = 3] = "DELETE";
    COMMON_ACTION_STATUSES[COMMON_ACTION_STATUSES["USER_ADD_NOTE"] = 4] = "USER_ADD_NOTE";
    COMMON_ACTION_STATUSES[COMMON_ACTION_STATUSES["USER_UPDATE_ADDRESS"] = 5] = "USER_UPDATE_ADDRESS";
})(COMMON_ACTION_STATUSES || (exports.COMMON_ACTION_STATUSES = COMMON_ACTION_STATUSES = {}));
var OTP_PROCESS_STATES;
(function (OTP_PROCESS_STATES) {
    OTP_PROCESS_STATES["ACTIVE"] = "ACTIVE";
    OTP_PROCESS_STATES["PASSIVE"] = "PASSIVE";
    OTP_PROCESS_STATES["COMPLETED"] = "COMPLETED";
})(OTP_PROCESS_STATES || (exports.OTP_PROCESS_STATES = OTP_PROCESS_STATES = {}));
