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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.appLogger = exports.AppLogger = exports.CustomTypeORMLogger = exports.logger = exports.LogLevel = void 0;
exports.getLoggingConfig = getLoggingConfig;
const winston = __importStar(require("winston"));
const path = __importStar(require("path"));
const env_config_1 = require("./env.config");
// Define log levels
var LogLevel;
(function (LogLevel) {
    LogLevel["ERROR"] = "error";
    LogLevel["WARN"] = "warn";
    LogLevel["INFO"] = "info";
    LogLevel["DEBUG"] = "debug";
    LogLevel["VERBOSE"] = "verbose";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
// Development logging configuration
const developmentConfig = {
    level: LogLevel.DEBUG,
    enableConsole: true,
    enableFile: true,
    enableDatabase: false,
    typeorm: {
        logging: [
            'error', // Log all errors
            'warn', // Log warnings
            'info', // Log info messages
            'query', // Log all queries (for debugging)
            'schema' // Log schema operations
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
const productionConfig = {
    level: LogLevel.INFO,
    enableConsole: false, // Don't log to console in production
    enableFile: true,
    enableDatabase: false,
    typeorm: {
        logging: [
            'error', // Only log errors
            'warn' // Log warnings
            // No 'query', 'info', 'schema' in production for performance
        ],
        maxQueryExecutionTime: 5000 // Log very slow queries (>5 seconds)
    },
    categories: {
        database: false, // Don't log normal database operations
        http: false, // Don't log normal HTTP requests
        auth: true, // Log authentication events
        socket: false, // Don't log normal socket operations
        business: true, // Log important business logic
        performance: true // Log performance issues
    }
};
// Get current logging configuration based on environment
function getLoggingConfig() {
    return env_config_1.env.app.isProduction ? productionConfig : developmentConfig;
}
// Winston logger configuration
const logFormat = winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.errors({ stack: true }), winston.format.json());
// Console format for development
const consoleFormat = winston.format.combine(winston.format.colorize(), winston.format.timestamp({ format: 'HH:mm:ss' }), winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
}));
// Create winston logger
exports.logger = winston.createLogger({
    level: getLoggingConfig().level,
    format: logFormat,
    transports: [
        // Error log file (always enabled)
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'error.log'),
            level: 'error',
            format: logFormat
        }),
        // Combined log file
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'combined.log'),
            format: logFormat
        })
    ]
});
// Add console transport for development
if (getLoggingConfig().enableConsole) {
    exports.logger.add(new winston.transports.Console({
        format: consoleFormat
    }));
}
// Custom TypeORM logger
class CustomTypeORMLogger {
    constructor() {
        this.config = getLoggingConfig();
    }
    log(level, message, queryRunner) {
        const shouldLog = this.shouldLogTypeORM(level);
        if (!shouldLog)
            return;
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
                exports.logger.error('TypeORM Error', logData);
                break;
            case 'warn':
                exports.logger.warn('TypeORM Warning', logData);
                break;
            case 'info':
                exports.logger.info('TypeORM Info', logData);
                break;
            case 'log':
                exports.logger.debug('TypeORM Log', logData);
                break;
        }
    }
    logQuery(query, parameters, queryRunner) {
        if (!this.shouldLogTypeORM('query'))
            return;
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
            exports.logger.warn('Slow Query Detected', logData);
        }
        else {
            exports.logger.debug('Database Query', logData);
        }
    }
    logQueryError(error, query, parameters, queryRunner) {
        exports.logger.error('Query Error', {
            type: 'typeorm-query-error',
            error,
            query: query.substring(0, 500),
            parameters: parameters || [],
            executionTime: queryRunner?.data?.executionTime || 0
        });
    }
    logQuerySlow(time, query, parameters, queryRunner) {
        exports.logger.warn('Slow Query', {
            type: 'typeorm-slow-query',
            executionTime: time,
            query: query.substring(0, 500),
            parameters: parameters || []
        });
    }
    logSchemaBuild(message, queryRunner) {
        if (!this.shouldLogTypeORM('schema'))
            return;
        exports.logger.info('Schema Build', {
            type: 'typeorm-schema',
            message,
            query: queryRunner?.data?.query || 'N/A'
        });
    }
    logMigration(message, queryRunner) {
        exports.logger.info('Migration', {
            type: 'typeorm-migration',
            message,
            query: queryRunner?.data?.query || 'N/A'
        });
    }
    shouldLogTypeORM(type) {
        const typeormConfig = this.config.typeorm;
        if (typeof typeormConfig.logging === 'boolean') {
            return typeormConfig.logging;
        }
        return typeormConfig.logging.includes(type);
    }
}
exports.CustomTypeORMLogger = CustomTypeORMLogger;
// Application logging helpers
class AppLogger {
    constructor() {
        this.config = getLoggingConfig();
    }
    error(message, meta) {
        exports.logger.error(message, meta);
    }
    warn(message, meta) {
        exports.logger.warn(message, meta);
    }
    info(message, meta) {
        exports.logger.info(message, meta);
    }
    debug(message, meta) {
        exports.logger.debug(message, meta);
    }
    // Category-specific logging methods
    database(message, meta) {
        if (this.config.categories.database) {
            this.info(`[DATABASE] ${message}`, meta);
        }
    }
    http(message, meta) {
        if (this.config.categories.http) {
            this.info(`[HTTP] ${message}`, meta);
        }
    }
    auth(message, meta) {
        if (this.config.categories.auth) {
            this.info(`[AUTH] ${message}`, meta);
        }
    }
    socket(message, meta) {
        if (this.config.categories.socket) {
            this.info(`[SOCKET] ${message}`, meta);
        }
    }
    business(message, meta) {
        if (this.config.categories.business) {
            this.info(`[BUSINESS] ${message}`, meta);
        }
    }
    performance(message, meta) {
        if (this.config.categories.performance) {
            this.info(`[PERFORMANCE] ${message}`, meta);
        }
    }
}
exports.AppLogger = AppLogger;
// Export singleton instance
exports.appLogger = new AppLogger();
