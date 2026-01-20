import { DataSourceOptions } from 'typeorm';
import { env } from './env.config';
import { CustomTypeORMLogger } from './logging.config';

// Base database configuration with connection pooling and timeout settings
export const baseDatabaseConfig: Partial<DataSourceOptions> = {
  type: 'mysql',
  ...env.database,
  synchronize: false, // Enable synchronize to auto-create tables from entities
  // Connection Pool Configuration
  poolSize: 10,
  // Connection Timeout Settings
  connectTimeout: 30000,
  // Additional MySQL-specific options for connection management
  extra: {
    connectionLimit: 10,
    idleTimeoutMillis: 300000, // 5 minutes
    // Keep connections alive
    keepAliveInitialDelay: 0,
    enableKeepAlive: true,
    // Additional MySQL2 specific options
    charset: 'utf8mb4_unicode_ci',
    timezone: 'Z'
  }
};

// API Server specific configuration
export const getApiServerDatabaseConfig = (): DataSourceOptions => ({
  ...baseDatabaseConfig,
  autoLoadEntities: true,
  logger: new CustomTypeORMLogger(),
  logging: env.app.isDevelopment ? ['error', 'warn', 'migration'] : ['error']
} as DataSourceOptions);

// Database Service specific configuration  
export const getDatabaseServiceConfig = (entities: any[], migrations: string[]): DataSourceOptions => ({
  ...baseDatabaseConfig,
  entities,
  migrations,
  logging: env.app.isDevelopment ? ['error', 'warn', 'migration', 'schema'] : ['error']
} as DataSourceOptions);

// Development configuration with more verbose logging
export const getDevelopmentConfig = (): Partial<DataSourceOptions> => ({
  ...baseDatabaseConfig,
  logging: ['error', 'warn', 'info', 'migration', 'schema'],
  extra: {
    ...baseDatabaseConfig.extra,
    debug: true
  }
});

// Production configuration with minimal logging and optimized settings
export const getProductionConfig = (): Partial<DataSourceOptions> => ({
  ...baseDatabaseConfig,
  logging: ['error'],
  extra: {
    ...baseDatabaseConfig.extra,
    connectionLimit: 20, // Higher connection limit for production
    idleTimeoutMillis: 600000, // 10 minutes for production
    debug: false
  }
});

// Get configuration based on environment
export function getDatabaseConfig(options: {
  autoLoadEntities?: boolean;
  entities?: any[];
  migrations?: string[];
  customConfig?: Partial<DataSourceOptions>;
} = {}): DataSourceOptions {
  const { autoLoadEntities, entities, migrations, customConfig } = options;
  
  let baseConfig = env.app.isProduction ? getProductionConfig() : getDevelopmentConfig();
  
  const config: DataSourceOptions = {
    ...baseConfig,
    ...(autoLoadEntities && { autoLoadEntities: true }),
    ...(entities && { entities }),
    ...(migrations && { migrations }),
    ...customConfig
  } as DataSourceOptions;
  
  return config;
}