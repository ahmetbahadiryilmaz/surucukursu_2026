export declare class EnvironmentVariables {
    DB_HOST: string;
    DB_PORT: number;
    DB_USERNAME: string;
    DB_PASSWORD: string;
    DB_NAME: string;
    ENCRYPTION_KEY: string;
    JWT_SECRET?: string;
    SESSION_EXPIRY?: number;
    PORT?: number;
    API_GATEWAY_PORT?: number;
    API_SERVER_PORT?: number;
    DATABASE_SERVICE_PORT?: number;
    FILE_SERVICE_PORT?: number;
    SOCKET_SERVICE_PORT?: number;
    WORKER_SERVICE_PORT?: number;
    NODE_ENV?: string;
    SLACK_NOTIFICATION_URL?: string;
    SLACK_NOTIFICATION_SECRET?: string;
    RABBITMQ_HOST?: string;
    RABBITMQ_PORT?: number;
    RABBITMQ_MANAGEMENT_PORT?: number;
    RABBITMQ_USER?: string;
    RABBITMQ_PASSWORD?: string;
    RABBITMQ_QUEUE_NAME?: string;
    BACKEND_URL?: string;
}
export declare function validate(config: Record<string, unknown>): EnvironmentVariables;
export declare function getEnv(): EnvironmentVariables;
export declare const env: {
    readonly database: {
        host: string;
        port: number;
        username: string;
        password: string;
        database: string;
    };
    readonly jwt: {
        secret: string;
        encryptionKey: string;
    };
    readonly app: {
        port: number;
        nodeEnv: string;
        isProduction: boolean;
        isDevelopment: boolean;
    };
    readonly slack: {
        notificationUrl: string;
        secretKey: string;
    };
    readonly session: {
        expiry: number;
    };
    readonly rabbitmq: {
        host: string;
        port: number;
        managementPort: number;
        user: string;
        password: string;
        queueName: string;
    };
    readonly backend: {
        url: string;
        apiBaseUrl: string;
    };
    readonly services: {
        apiGateway: {
            port: number;
        };
        apiServer: {
            port: number;
        };
        databaseService: {
            port: number;
        };
        fileService: {
            port: number;
        };
        socketService: {
            port: number;
        };
        workerService: {
            port: number;
        };
    };
    readonly all: EnvironmentVariables;
};
