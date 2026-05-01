enum Modes {
  DEV = 'dev',
  PROD = 'prod'
}

enum DB_TYPES {
  POSTGRES = 'postgres'
}

enum CommonTableStatuses {
  ACTIVE = 1,
  PASSIVE,
  DELETED
}

enum CommonClientStatuses {
  ACTIVE = 1,
  PASSIVE
}

enum RedisKeys {
  EMAIL_TOKEN = 'email_token',
  ACCESS_TOKEN = 'access_token',
  USER_PERMISSIONS = 'user_permissions',
  STORE_PERMISSION = 'store_permissions',
  RESET_PASSWORD = 'reset_password',
  RESET_PASSWORD_ATTEMPT = 'reset_password_attempt',
  REGISTER_ATTEMPT = 'register_attempt',
  CONSENT_PERMISSION = 'consent_permissions',
  LOGIN_WITH_SHIPENTEGRA = 'login_with_shipentegra',
  CONNECT_SHIPENTEGRA_STORES = 'connect_shipentegra_stores',
  FCM_TOKENS = 'fcm_tokens',
  INCORRECT_LOGIN = 'incorrect_login',
  PHOTO_EXPLORER = 'photo_explorer',
  CAPTCHA_CONTROL = 'captcha_control',
  OTP_VERIFICATION = 'otp_verification',
  OTP_PROCESS = 'otp_process',
  OTP_LOGIN_BLOCKED = 'otp_login_blocked',
  TWO_STEP_VERIFICATION_STATE = 'users_2fa'
}

enum CodePrefixes {
  STORE = 'ONE'
}
interface Perms {
  [key: string]: number
}

enum VerificationTokenTypes {
  ACCESS_TOKEN = 1,
  CONSENT_PERMISSIONS
}

enum PageLimits {
  PAGE_100 = 100,
  PAGE_75 = 75,
  PAGE_50 = 50,
  PAGE_25 = 25,
  PAGE_10 = 10
}

enum CommonBoolishes {
  yes = 'yes',
  no = 'no'
}

enum CarrierAccountTypes {
  SHIPENTEGRA = 1
}

enum Languages {
  TR = 'en',
  EN = 'tr'
}

enum DBS {
  MONGO = 'mongo'
}

enum CLIENTS {
  RABBIT_MONGO = 'rabbit_mongo',
  STORE_NOTIFICATION = 'store_notification'
}

enum Performers {
  user = 1,
  authorized,
  system
}

enum Platforms {
  WEB = 1,
  MOBILE
}

enum PERMISSION_TYPES {
  USER = 1,
  STORE = 2
}

// If a change is made, the same change must be made on the admin side!!!
enum ACTION_HISTORY_SERVICES {
  ADMIN = 'ADMIN',
  COUPON_CODE = 'COUPON_CODE',
  ENTERPRISE_CONTACT = 'ENTERPRISE_CONTACT',
  PACKAGE = 'PACKAGE',
  USER = 'USER'
}

// If a change is made, the same change must be made on the admin side!!!
enum COMMON_ACTION_STATUSES {
  CREATE = 1,
  UPDATE,
  DELETE,
  USER_ADD_NOTE,
  USER_UPDATE_ADDRESS
}

enum OTP_PROCESS_STATES {
  ACTIVE = 'ACTIVE',
  PASSIVE = 'PASSIVE',
  COMPLETED = 'COMPLETED'
}

export {
  Platforms,
  Performers,
  CLIENTS,
  DBS,
  Languages,
  Modes,
  DB_TYPES,
  CommonTableStatuses,
  RedisKeys,
  Perms,
  CodePrefixes,
  CommonClientStatuses,
  VerificationTokenTypes,
  PageLimits,
  CommonBoolishes,
  CarrierAccountTypes,
  PERMISSION_TYPES,
  ACTION_HISTORY_SERVICES,
  COMMON_ACTION_STATUSES,
  OTP_PROCESS_STATES
}
