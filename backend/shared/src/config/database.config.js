"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductionConfig = exports.getDevelopmentConfig = exports.getDatabaseServiceConfig = exports.getApiServerDatabaseConfig = exports.baseDatabaseConfig = void 0;
exports.getDatabaseConfig = getDatabaseConfig;
const env_config_1 = require("./env.config");
const logging_config_1 = require("./logging.config");
// Base database configuration with connection pooling and timeout settings
exports.baseDatabaseConfig = {
    type: 'mysql',
    ...env_config_1.env.database,
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
const getApiServerDatabaseConfig = () => ({
    ...exports.baseDatabaseConfig,
    autoLoadEntities: true,
    logger: new logging_config_1.CustomTypeORMLogger(),
    logging: env_config_1.env.app.isDevelopment ? ['error', 'warn', 'migration'] : ['error']
});
exports.getApiServerDatabaseConfig = getApiServerDatabaseConfig;
// Database Service specific configuration  
const getDatabaseServiceConfig = (entities, migrations) => ({
    ...exports.baseDatabaseConfig,
    entities,
    migrations,
    logging: env_config_1.env.app.isDevelopment ? ['error', 'warn', 'migration', 'schema'] : ['error']
});
exports.getDatabaseServiceConfig = getDatabaseServiceConfig;
// Development configuration with more verbose logging
const getDevelopmentConfig = () => ({
    ...exports.baseDatabaseConfig,
    logging: ['error', 'warn', 'info', 'migration', 'schema'],
    extra: {
        ...exports.baseDatabaseConfig.extra,
        debug: true
    }
});
exports.getDevelopmentConfig = getDevelopmentConfig;
// Production configuration with minimal logging and optimized settings
const getProductionConfig = () => ({
    ...exports.baseDatabaseConfig,
    logging: ['error'],
    extra: {
        ...exports.baseDatabaseConfig.extra,
        connectionLimit: 20, // Higher connection limit for production
        idleTimeoutMillis: 600000, // 10 minutes for production
        debug: false
    }
});
exports.getProductionConfig = getProductionConfig;
// Get configuration based on environment
function getDatabaseConfig(options = {}) {
    const { autoLoadEntities, entities, migrations, customConfig } = options;
    let baseConfig = env_config_1.env.app.isProduction ? (0, exports.getProductionConfig)() : (0, exports.getDevelopmentConfig)();
    const config = {
        ...baseConfig,
        ...(autoLoadEntities && { autoLoadEntities: true }),
        ...(entities && { entities }),
        ...(migrations && { migrations }),
        ...customConfig
    };
    return config;
}
