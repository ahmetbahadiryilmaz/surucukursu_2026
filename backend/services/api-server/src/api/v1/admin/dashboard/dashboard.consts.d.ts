export declare const DEFAULT_PORTS: {
    readonly DB_PORT: 5432;
    readonly REDIS_PORT: 6379;
    readonly RABBITMQ_PORT: 5672;
    readonly BACKEND_PORT: 3000;
    readonly FRONTEND_PORT: 9011;
};
export declare const TIMEOUTS: {
    readonly PORT_CHECK: 3000;
    readonly CPU_MEASURE_INTERVAL: 1000;
};
export declare const FILE_SIZE_UNITS: readonly ["Bytes", "KB", "MB", "GB", "TB"];
export declare const BYTES_TO_KB = 1024;
