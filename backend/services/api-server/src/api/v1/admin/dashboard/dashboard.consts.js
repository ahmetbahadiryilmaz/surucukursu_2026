"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BYTES_TO_KB = exports.FILE_SIZE_UNITS = exports.TIMEOUTS = exports.DEFAULT_PORTS = void 0;
exports.DEFAULT_PORTS = {
    DB_PORT: 5432,
    REDIS_PORT: 6379,
    RABBITMQ_PORT: 5672,
    BACKEND_PORT: 3000,
    FRONTEND_PORT: 9011,
};
exports.TIMEOUTS = {
    PORT_CHECK: 3000,
    CPU_MEASURE_INTERVAL: 1000,
};
exports.FILE_SIZE_UNITS = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
exports.BYTES_TO_KB = 1024;
//# sourceMappingURL=dashboard.consts.js.map