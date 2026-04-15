"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductionConfig = exports.getDevelopmentConfig = exports.getDatabaseServiceConfig = exports.getApiServerDatabaseConfig = exports.baseDatabaseConfig = void 0;
exports.getDatabaseConfig = getDatabaseConfig;
const env_config_1 = require("./env.config");
const logging_config_1 = require("./logging.config");
exports.baseDatabaseConfig = Object.assign(Object.assign({ type: 'mysql' }, env_config_1.env.database), { synchronize: false, poolSize: 10, connectTimeout: 30000, extra: {
        connectionLimit: 10,
        idleTimeoutMillis: 300000,
        keepAliveInitialDelay: 0,
        enableKeepAlive: true,
        charset: 'utf8mb4_unicode_ci',
        timezone: 'Z'
    } });
const getApiServerDatabaseConfig = () => (Object.assign(Object.assign({}, exports.baseDatabaseConfig), { autoLoadEntities: true, logger: new logging_config_1.CustomTypeORMLogger(), logging: env_config_1.env.app.isDevelopment ? ['error', 'warn', 'migration'] : ['error'] }));
exports.getApiServerDatabaseConfig = getApiServerDatabaseConfig;
const getDatabaseServiceConfig = (entities, migrations) => (Object.assign(Object.assign({}, exports.baseDatabaseConfig), { entities,
    migrations, logging: env_config_1.env.app.isDevelopment ? ['error', 'warn', 'migration', 'schema'] : ['error'] }));
exports.getDatabaseServiceConfig = getDatabaseServiceConfig;
const getDevelopmentConfig = () => (Object.assign(Object.assign({}, exports.baseDatabaseConfig), { logging: ['error', 'warn', 'info', 'migration', 'schema'], extra: Object.assign(Object.assign({}, exports.baseDatabaseConfig.extra), { debug: true }) }));
exports.getDevelopmentConfig = getDevelopmentConfig;
const getProductionConfig = () => (Object.assign(Object.assign({}, exports.baseDatabaseConfig), { logging: ['error'], extra: Object.assign(Object.assign({}, exports.baseDatabaseConfig.extra), { connectionLimit: 20, idleTimeoutMillis: 600000, debug: false }) }));
exports.getProductionConfig = getProductionConfig;
function getDatabaseConfig(options = {}) {
    const { autoLoadEntities, entities, migrations, customConfig } = options;
    let baseConfig = env_config_1.env.app.isProduction ? (0, exports.getProductionConfig)() : (0, exports.getDevelopmentConfig)();
    const config = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, baseConfig), (autoLoadEntities && { autoLoadEntities: true })), (entities && { entities })), (migrations && { migrations })), customConfig);
    return config;
}
//# sourceMappingURL=database.config.js.map