"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appLogger = exports.AppLogger = exports.CustomTypeORMLogger = exports.logger = exports.LogLevel = void 0;
exports.getLoggingConfig = getLoggingConfig;
const winston = require("winston");
const path = require("path");
const env_config_1 = require("./env.config");
var LogLevel;
(function (LogLevel) {
    LogLevel["ERROR"] = "error";
    LogLevel["WARN"] = "warn";
    LogLevel["INFO"] = "info";
    LogLevel["DEBUG"] = "debug";
    LogLevel["VERBOSE"] = "verbose";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
const developmentConfig = {
    level: LogLevel.DEBUG,
    enableConsole: true,
    enableFile: true,
    enableDatabase: false,
    typeorm: {
        logging: [
            'error',
            'warn',
            'info',
            'query',
            'schema'
        ],
        maxQueryExecutionTime: 1000
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
const productionConfig = {
    level: LogLevel.INFO,
    enableConsole: false,
    enableFile: true,
    enableDatabase: false,
    typeorm: {
        logging: [
            'error',
            'warn'
        ],
        maxQueryExecutionTime: 5000
    },
    categories: {
        database: false,
        http: false,
        auth: true,
        socket: false,
        business: true,
        performance: true
    }
};
function getLoggingConfig() {
    return env_config_1.env.app.isProduction ? productionConfig : developmentConfig;
}
const logFormat = winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.errors({ stack: true }), winston.format.json());
const consoleFormat = winston.format.combine(winston.format.colorize(), winston.format.timestamp({ format: 'HH:mm:ss' }), winston.format.printf((_a) => {
    var { timestamp, level, message } = _a, meta = __rest(_a, ["timestamp", "level", "message"]);
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
}));
exports.logger = winston.createLogger({
    level: getLoggingConfig().level,
    format: logFormat,
    transports: [
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'error.log'),
            level: 'error',
            format: logFormat
        }),
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'combined.log'),
            format: logFormat
        })
    ]
});
if (getLoggingConfig().enableConsole) {
    exports.logger.add(new winston.transports.Console({
        format: consoleFormat
    }));
}
class CustomTypeORMLogger {
    constructor() {
        this.config = getLoggingConfig();
    }
    log(level, message, queryRunner) {
        var _a, _b, _c;
        const shouldLog = this.shouldLogTypeORM(level);
        if (!shouldLog)
            return;
        const logData = {
            type: 'typeorm',
            level,
            message,
            query: ((_a = queryRunner === null || queryRunner === void 0 ? void 0 : queryRunner.data) === null || _a === void 0 ? void 0 : _a.query) || 'N/A',
            parameters: ((_b = queryRunner === null || queryRunner === void 0 ? void 0 : queryRunner.data) === null || _b === void 0 ? void 0 : _b.parameters) || [],
            executionTime: ((_c = queryRunner === null || queryRunner === void 0 ? void 0 : queryRunner.data) === null || _c === void 0 ? void 0 : _c.executionTime) || 0
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
        var _a;
        if (!this.shouldLogTypeORM('query'))
            return;
        const executionTime = ((_a = queryRunner === null || queryRunner === void 0 ? void 0 : queryRunner.data) === null || _a === void 0 ? void 0 : _a.executionTime) || 0;
        const isSlowQuery = executionTime > (this.config.typeorm.maxQueryExecutionTime || 1000);
        const logData = {
            type: 'typeorm-query',
            query: query.substring(0, 500),
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
        var _a;
        exports.logger.error('Query Error', {
            type: 'typeorm-query-error',
            error,
            query: query.substring(0, 500),
            parameters: parameters || [],
            executionTime: ((_a = queryRunner === null || queryRunner === void 0 ? void 0 : queryRunner.data) === null || _a === void 0 ? void 0 : _a.executionTime) || 0
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
        var _a;
        if (!this.shouldLogTypeORM('schema'))
            return;
        exports.logger.info('Schema Build', {
            type: 'typeorm-schema',
            message,
            query: ((_a = queryRunner === null || queryRunner === void 0 ? void 0 : queryRunner.data) === null || _a === void 0 ? void 0 : _a.query) || 'N/A'
        });
    }
    logMigration(message, queryRunner) {
        var _a;
        exports.logger.info('Migration', {
            type: 'typeorm-migration',
            message,
            query: ((_a = queryRunner === null || queryRunner === void 0 ? void 0 : queryRunner.data) === null || _a === void 0 ? void 0 : _a.query) || 'N/A'
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
exports.appLogger = new AppLogger();
//# sourceMappingURL=logging.config.js.map