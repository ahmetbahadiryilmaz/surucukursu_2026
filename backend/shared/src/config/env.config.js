"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = exports.EnvironmentVariables = void 0;
exports.validate = validate;
exports.getEnv = getEnv;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const dotenv_1 = require("dotenv");
const path = require("path");
class EnvironmentVariables {
    constructor() {
        this.SESSION_EXPIRY = 86400;
        this.PORT = 3000;
        this.API_GATEWAY_PORT = 3000;
        this.API_SERVER_PORT = 3001;
        this.DATABASE_SERVICE_PORT = 3002;
        this.FILE_SERVICE_PORT = 9504;
        this.SOCKET_SERVICE_PORT = 3003;
        this.WORKER_SERVICE_PORT = 3004;
        this.NODE_ENV = 'development';
        this.SLACK_NOTIFICATION_URL = 'http://your-slack-notification-url';
        this.SLACK_NOTIFICATION_SECRET = '';
        this.RABBITMQ_HOST = 'localhost';
        this.RABBITMQ_PORT = 5672;
        this.RABBITMQ_MANAGEMENT_PORT = 15672;
        this.RABBITMQ_USER = 'guest';
        this.RABBITMQ_PASSWORD = 'guest';
        this.RABBITMQ_QUEUE_NAME = 'pdf_generation_queue';
        this.BACKEND_URL = 'http://localhost:3000';
    }
}
exports.EnvironmentVariables = EnvironmentVariables;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "DB_HOST", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "DB_PORT", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "DB_USERNAME", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "DB_PASSWORD", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "DB_NAME", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "ENCRYPTION_KEY", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "JWT_SECRET", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "SESSION_EXPIRY", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "PORT", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "API_GATEWAY_PORT", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "API_SERVER_PORT", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "DATABASE_SERVICE_PORT", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "FILE_SERVICE_PORT", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "SOCKET_SERVICE_PORT", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "WORKER_SERVICE_PORT", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "NODE_ENV", void 0);
__decorate([
    (0, class_validator_1.IsUrl)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "SLACK_NOTIFICATION_URL", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "SLACK_NOTIFICATION_SECRET", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "RABBITMQ_HOST", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "RABBITMQ_PORT", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "RABBITMQ_MANAGEMENT_PORT", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "RABBITMQ_USER", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "RABBITMQ_PASSWORD", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "RABBITMQ_QUEUE_NAME", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "BACKEND_URL", void 0);
function validate(config) {
    const validatedConfig = (0, class_transformer_1.plainToClass)(EnvironmentVariables, config, {
        enableImplicitConversion: true,
    });
    const errors = (0, class_validator_1.validateSync)(validatedConfig, {
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
let envInstance = null;
function getEnv() {
    if (!envInstance) {
        try {
            const possiblePaths = [
                path.resolve(process.cwd(), '.env'),
                path.resolve(process.cwd(), '..', '..', '.env'),
                path.resolve(process.cwd(), '..', '.env'),
                path.resolve(process.cwd(), '..', '..', 'backend', '.env'),
                path.resolve(process.cwd(), 'backend', '.env'),
                path.resolve(__dirname, '../../../.env'),
                path.resolve(__dirname, '../../.env'),
            ];
            let result = null;
            let envPath = '';
            for (const tryPath of possiblePaths) {
                result = (0, dotenv_1.config)({ path: tryPath });
                if (!result.error) {
                    envPath = tryPath;
                    break;
                }
            }
            console.log('Env file path:', envPath || 'not found');
            if (result === null || result === void 0 ? void 0 : result.error) {
                console.warn('.env file not found in any expected location, using environment variables');
                console.warn('Tried paths:', possiblePaths);
            }
            else if (result) {
                console.log('Parsed .env config:', Object.keys(result.parsed || {}));
            }
            envInstance = validate(process.env);
            console.log('Environment variables validated successfully');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
            console.error('Failed to validate environment variables:', errorMessage);
            throw error;
        }
    }
    return envInstance;
}
exports.env = {
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
                port: config.FILE_SERVICE_PORT || 9504,
            },
            socketService: {
                port: config.SOCKET_SERVICE_PORT || 3003,
            },
            workerService: {
                port: config.WORKER_SERVICE_PORT || 3004,
            },
        };
    },
    get all() {
        return getEnv();
    },
};
//# sourceMappingURL=env.config.js.map