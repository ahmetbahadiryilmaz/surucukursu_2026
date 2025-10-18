import { plainToInstance } from 'class-transformer'
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  validateSync
} from 'class-validator'
import { DB_TYPES, Languages, Modes } from 'src/types/index.types'

class Config {
  @IsNumber()
  PORT: number

  @IsString()
  @IsEnum(Modes)
  NODE_ENV: Modes

  @IsString()
  @MinLength(2)
  MONGO_USERNAME: string

  @IsString()
  @MinLength(10)
  MONGO_PASSWORD: string

  @IsNumber()
  MONGO_SYNCHRONIZE: number

  @IsNumber()
  ACCESS_TOKEN_REMEMBER_ME_TTL: number

  @IsNumber()
  ACCESS_TOKEN_TTL: number

  @IsNumber()
  MONGO_LOGGING: number

  @IsNumber()
  MONGO_PORT: number

  @IsNumber()
  DB_PORT: number

  @IsString()
  @MinLength(2)
  DB_HOST: string

  @IsString()
  @MinLength(2)
  DB_DATABASE: string

  @IsString()
  @MinLength(2)
  DB_USERNAME: string

  @IsString()
  @MinLength(2)
  DB_PASSWORD: string

  @IsString()
  @MinLength(2)
  DB_SCHEMA: string

  @IsNumber()
  DB_SYNCHRONIZE: number

  @IsNumber()
  DB_LOGGING: number

  @IsEnum(DB_TYPES)
  DB_TYPE: string

  @IsInt()
  @Min(5)
  @Max(20)
  BCRYPT_SALT: number

  @IsNumber()
  EMAIL_TOKEN_TTL: number

  @IsString()
  @MinLength(10)
  EMAIL_VERIFICATION_KEY: string
  @IsString()
  EMAIL_HOST: string
  @IsInt()
  @Min(1)
  EMAIL_PORT: number
  @IsString()
  EMAIL_USERNAME: string
  @IsString()
  EMAIL_PASSWORD: string

  @IsString()
  @MinLength(3)
  BASE_URL: string

  @IsString()
  @MinLength(3)
  RABBIT_NOTIFICATION_QUEUE: string

  @IsString()
  @MinLength(10)
  ACCESS_TOKEN_SECRET: string

  @IsString()
  @MinLength(10)
  FILE_SERVER_SECRET: string

  @IsString()
  STRIPE_KEY: string

  @IsString()
  STRIPE_ENDPOINT_SECRET: string

  @IsString()
  FORGOT_PASSWORD_SERCRET: string

  @IsString()
  @IsEnum(Languages)
  FALLBACK_LANGUAGE: Languages

  @IsString()
  CONSENT_PERMISSION_SECRET: string

  @IsInt()
  FORGOT_PASSWORD_TTL: number

  @IsInt()
  CONSENT_PERMISSION_TTL: number

  @IsInt()
  MAX_RESET_PASSWORD_ATTEMPT_COUNT: number

  @IsInt()
  RESET_PASSWORD_ATTEMPT_TTL: number

  @IsInt()
  MAX_REGISTER_ATTEMPT_COUNT: number

  @IsInt()
  REGISTER_ATTEMPT_TTL: number

  @IsString()
  @MinLength(10)
  SHIPENTEGRA_URL: string

  @IsString()
  @MinLength(10)
  SHIPENTEGRA_API_URL: string

  @IsString()
  @MinLength(10)
  SHIPENTEGRA_KEY: string

  @IsString()
  @MinLength(10)
  SHIPENTEGRA_CONNECT_STORE_KEY: string

  @IsInt()
  SHIPENTEGRA_TOKEN_TTL: number

  @IsString()
  @MinLength(10)
  PRODUCT_MANAGEMENT_API_URL: string

  @IsInt()
  TRIAL_TTL: number

  @IsInt()
  MONTHLY_TTL: number

  @IsInt()
  ANNUALLY_TTL: number

  @IsString()
  REDIS_HOST: string

  @IsNumber()
  REDIS_PORT: number

  @IsString()
  @MinLength(5)
  REDIS_PASS: string

  @IsString()
  @MinLength(5)
  RABBIT_URL: string

  @IsString()
  @MinLength(5)
  RABBIT_MONGO_QUEUE: string

  @IsString()
  SLACK_SERVICES_URL: string

  @IsString()
  PAYMENT_CHANNEL: string

  @IsString()
  FRONTEND_ERROR_CHANNEL: string

  @IsString()
  WORKER_SOCKET_TOKEN: string

  @IsString()
  PEM_PRIVATE_KEY: string

  @IsString()
  FILE_SERVER_URL: string

  @IsString()
  SHIPENTEGRA_CREATE_ACCOUNT_SECRET: string

  @IsString()
  @MinLength(2)
  LIS_HIS_MONGO_USERNAME: string

  @IsString()
  @MinLength(2)
  LIS_HIS_MONGO_PASSWORD: string

  @IsNumber()
  LIS_HIS_MONGO_SYNCHRONIZE: number

  @IsNumber()
  LIS_HIS_MONGO_LOGGING: number

  @IsNumber()
  LIS_HIS_MONGO_PORT: number

  @IsString()
  LIS_HIS_MONGO_URL: string

  @IsString()
  LIS_HIS_DATABASE: string

  @IsString()
  LIS_AUTH_SOURCE: string

  @IsString()
  ETSY_BASE_URL: string

  @IsString()
  ETSY_CLIENT_ID: string

  @IsString()
  ETSY_CLIENT_SECRET: string

  @IsString()
  ETSY_REDIRECT_URL: string

  @IsUrl({ require_tld: false })
  AI_API_URL: string

  @IsString()
  AI_API_TOKEN: string

  @IsUrl({ require_tld: false })
  BG_REMOVER_API_URL: string

  @IsString()
  BG_REMOVER_API_TOKEN: string

  @IsString()
  PIXABAY_API_KEY: string

  @IsUrl()
  PIXABAY_API_URL: string
}
export const validateEnv = (config: Record<string, any>) => {
  const newConfig = plainToInstance(Config, config, {
    enableImplicitConversion: true
  })

  const errors = validateSync(newConfig)
  if (errors.length) {
    throw new Error(errors.toString())
  }

  const {
    PORT,
    NODE_ENV,
    DB_PORT,
    DB_SYNCHRONIZE,
    DB_LOGGING,
    DB_TYPE,
    BCRYPT_SALT,
    EMAIL_TOKEN_TTL,
    EMAIL_VERIFICATION_KEY,
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USERNAME,
    EMAIL_PASSWORD,
    ACCESS_TOKEN_SECRET,
    STRIPE_KEY,
    STRIPE_ENDPOINT_SECRET,
    BASE_URL,
    FORGOT_PASSWORD_SERCRET,
    FORGOT_PASSWORD_TTL,
    CONSENT_PERMISSION_SECRET,
    CONSENT_PERMISSION_TTL,
    FILE_SERVER_SECRET,
    SHIPENTEGRA_URL,
    SHIPENTEGRA_API_URL,
    SHIPENTEGRA_KEY,
    SHIPENTEGRA_CONNECT_STORE_KEY,
    SHIPENTEGRA_TOKEN_TTL,
    FALLBACK_LANGUAGE,
    PRODUCT_MANAGEMENT_API_URL,
    TRIAL_TTL,
    MONTHLY_TTL,
    ANNUALLY_TTL,
    MONGO_USERNAME,
    MONGO_PASSWORD,
    MONGO_SYNCHRONIZE,
    MONGO_LOGGING,
    MONGO_PORT,
    ACCESS_TOKEN_TTL,
    REDIS_HOST,
    REDIS_PORT,
    REDIS_PASS,
    RABBIT_URL,
    RABBIT_MONGO_QUEUE,
    SLACK_SERVICES_URL,
    PAYMENT_CHANNEL,
    FRONTEND_ERROR_CHANNEL,
    RABBIT_NOTIFICATION_QUEUE,
    WORKER_SOCKET_TOKEN,
    ACCESS_TOKEN_REMEMBER_ME_TTL,
    DB_HOST,
    DB_DATABASE,
    DB_USERNAME,
    DB_PASSWORD,
    DB_SCHEMA,
    MAX_RESET_PASSWORD_ATTEMPT_COUNT,
    MAX_REGISTER_ATTEMPT_COUNT,
    RESET_PASSWORD_ATTEMPT_TTL,
    REGISTER_ATTEMPT_TTL,
    PEM_PRIVATE_KEY,
    FILE_SERVER_URL,
    SHIPENTEGRA_CREATE_ACCOUNT_SECRET,
    LIS_HIS_MONGO_USERNAME,
    LIS_HIS_MONGO_PASSWORD,
    LIS_HIS_MONGO_SYNCHRONIZE,
    LIS_HIS_MONGO_LOGGING,
    LIS_HIS_MONGO_PORT,
    LIS_HIS_MONGO_URL,
    LIS_HIS_DATABASE,
    LIS_AUTH_SOURCE,
    ETSY_BASE_URL,
    ETSY_CLIENT_ID,
    ETSY_CLIENT_SECRET,
    ETSY_REDIRECT_URL,
    AI_API_URL,
    AI_API_TOKEN,
    BG_REMOVER_API_URL,
    BG_REMOVER_API_TOKEN,
    PIXABAY_API_KEY,
    PIXABAY_API_URL
  } = newConfig

  return {
    PORT,
    BASE_URL,
    MODE: NODE_ENV,
    BCRYPT_SALT,
    FALLBACK_LANGUAGE,
    RABBIT: {
      URL: RABBIT_URL,
      queues: {
        MONGO: RABBIT_MONGO_QUEUE,
        STORE_NOTIFICATIONS: RABBIT_NOTIFICATION_QUEUE
      }
    },
    TTL: {
      FORGOT_PASSWORD_TTL,
      CONSENT_PERMISSION_TTL,
      SHIPENTEGRA_TOKEN_TTL,
      TRIAL_TTL,
      MONTHLY_TTL,
      ANNUALLY_TTL,
      ACCESS_TOKEN_REMEMBER_ME_TTL,
      ACCESS_TOKEN_TTL,
      RESET_PASSWORD_ATTEMPT_TTL,
      REGISTER_ATTEMPT_TTL
    },
    LIMIT: {
      MAX_RESET_PASSWORD_ATTEMPT_COUNT,
      MAX_REGISTER_ATTEMPT_COUNT
    },
    DB: {
      DB_PORT,
      DB_SYNCHRONIZE: !!DB_SYNCHRONIZE,
      DB_LOGGING: !!DB_LOGGING,
      DB_TYPE,
      DB_HOST,
      DB_DATABASE,
      DB_USERNAME,
      DB_PASSWORD,
      DB_SCHEMA
    },
    MONGO: {
      USERNAME: MONGO_USERNAME,
      PASSWORD: MONGO_PASSWORD,
      SYNCHRONIZE: MONGO_SYNCHRONIZE,
      LOGGING: MONGO_LOGGING,
      PORT: MONGO_PORT
    },
    REDIS: {
      REDIS_HOST,
      REDIS_PORT,
      REDIS_PASS
    },
    EMAIL: {
      EMAIL_TOKEN_TTL,
      EMAIL_VERIFICATION_KEY,
      EMAIL_HOST,
      EMAIL_PORT,
      EMAIL_USERNAME,
      EMAIL_PASSWORD
    },
    SECRET: {
      ACCESS_TOKEN_SECRET,
      STRIPE_KEY,
      STRIPE_ENDPOINT_SECRET,
      FORGOT_PASSWORD_SERCRET,
      CONSENT_PERMISSION_SECRET,
      FILE_SERVER_SECRET,
      PEM_PRIVATE_KEY,
      SHIPENTEGRA_CREATE_ACCOUNT_SECRET
    },
    SHIP: {
      URL: SHIPENTEGRA_URL,
      API_URL: SHIPENTEGRA_API_URL,
      KEY: SHIPENTEGRA_KEY,
      CONNECT_STORE_KEY: SHIPENTEGRA_CONNECT_STORE_KEY
    },
    PRODUCT_MANAGEMENT: {
      URL: PRODUCT_MANAGEMENT_API_URL
    },
    SLACK: {
      BASE_URL: SLACK_SERVICES_URL,
      CHANNELS: {
        PAYMENT: PAYMENT_CHANNEL,
        FRONTEND_ERROR_CHANNEL: FRONTEND_ERROR_CHANNEL
      }
    },
    WORKER: {
      SOCKET_TOKEN: WORKER_SOCKET_TOKEN
    },
    FILE: {
      FILE_SERVER_URL: FILE_SERVER_URL
    },
    HISTORY_MONGO: {
      USERNAME: LIS_HIS_MONGO_USERNAME,
      PASSWORD: LIS_HIS_MONGO_PASSWORD,
      SYNCHRONIZE: LIS_HIS_MONGO_SYNCHRONIZE,
      LOGGING: LIS_HIS_MONGO_LOGGING,
      PORT: LIS_HIS_MONGO_PORT,
      URL: LIS_HIS_MONGO_URL,
      DB: LIS_HIS_DATABASE,
      AUTH_SOURCE: LIS_AUTH_SOURCE
    },
    ETSY: {
      BASE_URL: ETSY_BASE_URL,
      CLIENT_ID: ETSY_CLIENT_ID,
      CLIENT_SECRET: ETSY_CLIENT_SECRET,
      REDIRECT_URL: ETSY_REDIRECT_URL
    },
    AI_API: {
      URL: AI_API_URL,
      TOKEN: AI_API_TOKEN
    },
    BG_REMOVER_API: {
      URL: BG_REMOVER_API_URL,
      TOKEN: BG_REMOVER_API_TOKEN
    },
    PIXABAY_API: {
      PIXABAY_API_URL,
      PIXABAY_API_KEY
    }
  }
}
