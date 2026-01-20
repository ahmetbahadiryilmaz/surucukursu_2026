import { Logger, QueryRunner } from 'typeorm';
import * as winston from 'winston';
import * as path from 'path';
import { env } from './env.config';

// Define log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose'
}

// Logging configuration interface
export interface LoggingConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableDatabase: boolean;
  typeorm: {
    logging: boolean | string[];
    maxQueryExecutionTime?: number;
  };
  categories: {
    database: boolean;
    http: boolean;
    auth: boolean;
    socket: boolean;
    business: boolean;
    performance: boolean;
  };
}

// Development logging configuration
const developmentConfig: LoggingConfig = {
  level: LogLevel.DEBUG,
  enableConsole: true,
  enableFile: true,
  enableDatabase: false,
  typeorm: {
    logging: [
      'error',    // Log all errors
      'warn',     // Log warnings
      'info',     // Log info messages
      'query',    // Log all queries (for debugging)
      'schema'    // Log schema operations
    ],
    maxQueryExecutionTime: 1000 // Log slow queries (>1 second)
  },
  categories: {
    database: true,
    http: true,
    auth: true,
    socket: true,
    business: true,
    performance: true
  }
};

// Production logging configuration
const productionConfig: LoggingConfig = {
  level: LogLevel.INFO,
  enableConsole: false, // Don't log to console in production
  enableFile: true,
  enableDatabase: false,
  typeorm: {
    logging: [
      'error',    // Only log errors
      'warn'      // Log warnings
      // No 'query', 'info', 'schema' in production for performance
    ],
    maxQueryExecutionTime: 5000 // Log very slow queries (>5 seconds)
  },
  categories: {
    database: false,     // Don't log normal database operations
    http: false,         // Don't log normal HTTP requests
    auth: true,          // Log authentication events
    socket: false,       // Don't log normal socket operations
    business: true,      // Log important business logic
    performance: true    // Log performance issues
  }
};

// Get current logging configuration based on environment
export function getLoggingConfig(): LoggingConfig {
  return env.app.isProduction ? productionConfig : developmentConfig;
}

// Winston logger configuration
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

// Create winston logger
export const logger = winston.createLogger({
  level: getLoggingConfig().level,
  format: logFormat,
  transports: [
    // Error log file (always enabled)
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error' as const,
      format: logFormat
    } as any),

    // Combined log file
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      format: logFormat
    } as any)
  ]
});

// Add console transport for development
if (getLoggingConfig().enableConsole) {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  } as any));
}

// Custom TypeORM logger
export class CustomTypeORMLogger implements Logger {
  private config = getLoggingConfig();

  log(level: 'log' | 'info' | 'warn' | 'error', message: any, queryRunner?: QueryRunner): void {
    const shouldLog = this.shouldLogTypeORM(level);

    if (!shouldLog) return;

    const logData = {
      type: 'typeorm',
      level,
      message,
      query: queryRunner?.data?.query || 'N/A',
      parameters: queryRunner?.data?.parameters || [],
      executionTime: queryRunner?.data?.executionTime || 0
    };

    switch (level) {
      case 'error':
        logger.error('TypeORM Error', logData);
        break;
      case 'warn':
        logger.warn('TypeORM Warning', logData);
        break;
      case 'info':
        logger.info('TypeORM Info', logData);
        break;
      case 'log':
        logger.debug('TypeORM Log', logData);
        break;
    }
  }

  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner): void {
    if (!this.shouldLogTypeORM('query')) return;

    const executionTime = queryRunner?.data?.executionTime || 0;
    const isSlowQuery = executionTime > (this.config.typeorm.maxQueryExecutionTime || 1000);

    const logData = {
      type: 'typeorm-query',
      query: query.substring(0, 500), // Truncate long queries
      parameters: parameters || [],
      executionTime,
      isSlowQuery
    };

    if (isSlowQuery) {
      logger.warn('Slow Query Detected', logData);
    } else {
      logger.debug('Database Query', logData);
    }
  }

  logQueryError(error: string, query: string, parameters?: any[], queryRunner?: QueryRunner): void {
    logger.error('Query Error', {
      type: 'typeorm-query-error',
      error,
      query: query.substring(0, 500),
      parameters: parameters || [],
      executionTime: queryRunner?.data?.executionTime || 0
    });
  }

  logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner): void {
    logger.warn('Slow Query', {
      type: 'typeorm-slow-query',
      executionTime: time,
      query: query.substring(0, 500),
      parameters: parameters || []
    });
  }

  logSchemaBuild(message: string, queryRunner?: QueryRunner): void {
    if (!this.shouldLogTypeORM('schema')) return;

    logger.info('Schema Build', {
      type: 'typeorm-schema',
      message,
      query: queryRunner?.data?.query || 'N/A'
    });
  }

  logMigration(message: string, queryRunner?: QueryRunner): void {
    logger.info('Migration', {
      type: 'typeorm-migration',
      message,
      query: queryRunner?.data?.query || 'N/A'
    });
  }

  private shouldLogTypeORM(type: string): boolean {
    const typeormConfig = this.config.typeorm;

    if (typeof typeormConfig.logging === 'boolean') {
      return typeormConfig.logging;
    }

    return typeormConfig.logging.includes(type);
  }
}

// Application logging helpers
export class AppLogger {
  private config = getLoggingConfig();

  error(message: string, meta?: any): void {
    logger.error(message, meta);
  }

  warn(message: string, meta?: any): void {
    logger.warn(message, meta);
  }

  info(message: string, meta?: any): void {
    logger.info(message, meta);
  }

  debug(message: string, meta?: any): void {
    logger.debug(message, meta);
  }

  // Category-specific logging methods
  database(message: string, meta?: any): void {
    if (this.config.categories.database) {
      this.info(`[DATABASE] ${message}`, meta);
    }
  }

  http(message: string, meta?: any): void {
    if (this.config.categories.http) {
      this.info(`[HTTP] ${message}`, meta);
    }
  }

  auth(message: string, meta?: any): void {
    if (this.config.categories.auth) {
      this.info(`[AUTH] ${message}`, meta);
    }
  }

  socket(message: string, meta?: any): void {
    if (this.config.categories.socket) {
      this.info(`[SOCKET] ${message}`, meta);
    }
  }

  business(message: string, meta?: any): void {
    if (this.config.categories.business) {
      this.info(`[BUSINESS] ${message}`, meta);
    }
  }

  performance(message: string, meta?: any): void {
    if (this.config.categories.performance) {
      this.info(`[PERFORMANCE] ${message}`, meta);
    }
  }
}

// Export singleton instance
export const appLogger = new AppLogger();