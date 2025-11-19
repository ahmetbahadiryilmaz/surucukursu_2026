import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUrl, validateSync } from 'class-validator';
import { plainToClass, Type } from 'class-transformer';
import { config } from 'dotenv';
import * as path from 'path';

export class EnvironmentVariables {
  // Database
  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  DB_PORT: number;

  @IsString()
  @IsNotEmpty()
  DB_USERNAME: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DB_NAME: string;

  // JWT & Encryption
  @IsString()
  @IsNotEmpty()
  ENCRYPTION_KEY: string;

  @IsString()
  @IsOptional()
  JWT_SECRET?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  SESSION_EXPIRY?: number = 86400;

  // Application
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  PORT?: number = 3000;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  API_GATEWAY_PORT?: number = 3000;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  API_SERVER_PORT?: number = 3001;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  DATABASE_SERVICE_PORT?: number = 3002;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  FILE_SERVICE_PORT?: number = 3002;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  SOCKET_SERVICE_PORT?: number = 3003;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  WORKER_SERVICE_PORT?: number = 3004;

  @IsString()
  @IsOptional()
  NODE_ENV?: string = 'development';

  // Slack Notifications
  @IsUrl()
  @IsOptional()
  SLACK_NOTIFICATION_URL?: string = 'http://your-slack-notification-url';

  @IsString()
  @IsOptional()
  SLACK_NOTIFICATION_SECRET?: string = '';

  // RabbitMQ
  @IsString()
  @IsOptional()
  RABBITMQ_HOST?: string = 'localhost';

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  RABBITMQ_PORT?: number = 5672;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  RABBITMQ_MANAGEMENT_PORT?: number = 15672;

  @IsString()
  @IsOptional()
  RABBITMQ_USER?: string = 'guest';

  @IsString()
  @IsOptional()
  RABBITMQ_PASSWORD?: string = 'guest';

  // Worker specific
  @IsString()
  @IsOptional()
  RABBITMQ_QUEUE_NAME?: string = 'pdf_generation_queue';

  @IsString()
  @IsOptional()
  BACKEND_URL?: string = 'http://localhost:3000';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    whitelist: true,
    forbidNonWhitelisted: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors.map(error => {
      const constraints = error.constraints;
      if (constraints) {
        return `${error.property}: ${Object.values(constraints).join(', ')}`;
      }
      return `${error.property}: validation failed`;
    });

    throw new Error(`Environment validation failed:\n${errorMessages.join('\n')}`);
  }

  return validatedConfig;
}

// Export a singleton instance
let envInstance: EnvironmentVariables | null = null;

export function getEnv(): EnvironmentVariables {
  if (!envInstance) {
    try {
      // Try multiple possible .env file locations to handle both dev and build scenarios
      const possiblePaths = [
        path.resolve(process.cwd(), '.env'),                        // From backend folder (cwd)
        path.resolve(process.cwd(), '..', '..', '.env'),            // From services/*/* folder (two levels up)
        path.resolve(process.cwd(), '..', '.env'),                  // From services/* folder (one level up)
        path.resolve(process.cwd(), '..', '..', 'backend', '.env'), // From workspace root
        path.resolve(process.cwd(), 'backend', '.env'),             // From workspace root (alternative)
        path.resolve(__dirname, '../../../.env'),                   // From source shared/src/config (dev)
        path.resolve(__dirname, '../../.env'),                      // From dist/shared/config (build) -> backend/.env
      ];

      let result = null;
      let envPath = '';
      
      // Try each path until we find the .env file
      for (const tryPath of possiblePaths) {
        result = config({ path: tryPath });
        if (!result.error) {
          envPath = tryPath;
          break;
        }
      }
      
      console.log('Env file path:', envPath || 'not found');
      
      if (result?.error) {
        console.warn('.env file not found in any expected location, using environment variables');
        console.warn('Tried paths:', possiblePaths);
      } else if (result) {
        console.log('Parsed .env config:', Object.keys(result.parsed || {}));
      }
      
      envInstance = validate(process.env);
      console.log('Environment variables validated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      console.error('Failed to validate environment variables:', errorMessage);
      throw error;
    }
  }
  return envInstance;
}

// Individual getters for convenience
export const env = {
  get database() {
    const config = getEnv();
    return {
      host: config.DB_HOST,
      port: config.DB_PORT,
      username: config.DB_USERNAME,
      password: config.DB_PASSWORD,
      database: config.DB_NAME,
    };
  },

  get jwt() {
    const config = getEnv();
    return {
      secret: config.JWT_SECRET || config.ENCRYPTION_KEY,
      encryptionKey: config.ENCRYPTION_KEY,
    };
  },

  get app() {
    const config = getEnv();
    return {
      port: config.PORT || 3000,
      nodeEnv: config.NODE_ENV || 'development',
      isProduction: config.NODE_ENV === 'production',
      isDevelopment: config.NODE_ENV === 'development',
    };
  },

  get slack() {
    const config = getEnv();
    return {
      notificationUrl: config.SLACK_NOTIFICATION_URL || 'http://your-slack-notification-url',
      secretKey: config.SLACK_NOTIFICATION_SECRET || '',
    };
  },

  get session() {
    const config = getEnv();
    return {
      expiry: config.SESSION_EXPIRY || 100,
    };
  },

  get rabbitmq() {
    const config = getEnv();
    return {
      host: config.RABBITMQ_HOST,
      port: config.RABBITMQ_PORT,
      managementPort: config.RABBITMQ_MANAGEMENT_PORT,
      user: config.RABBITMQ_USER,
      password: config.RABBITMQ_PASSWORD,
      queueName: config.RABBITMQ_QUEUE_NAME || 'pdf_generation_queue',
    };
  },

  get backend() {
    const config = getEnv();
    return {
      url: config.BACKEND_URL || 'http://localhost:3000',
      apiBaseUrl: `http://localhost:${config.API_SERVER_PORT || 3001}/api/v1`,
    };
  },

  get services() {
    const config = getEnv();
    return {
      apiGateway: {
        port: config.API_GATEWAY_PORT || 3000,
      },
      apiServer: {
        port: config.API_SERVER_PORT || 3001,
      },
      databaseService: {
        port: config.DATABASE_SERVICE_PORT || 3002,
      },
      fileService: {
        port: config.FILE_SERVICE_PORT || 3002,
      },
      socketService: {
        port: config.SOCKET_SERVICE_PORT || 3003,
      },
      workerService: {
        port: config.WORKER_SERVICE_PORT || 3004,
      },
    };
  },

 

  // Direct access to all env variables
  get all(): EnvironmentVariables {
    return getEnv();
  },
};
 