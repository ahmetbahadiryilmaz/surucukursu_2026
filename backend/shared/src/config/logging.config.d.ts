import { Logger, QueryRunner } from 'typeorm';
import * as winston from 'winston';
export declare enum LogLevel {
    ERROR = "error",
    WARN = "warn",
    INFO = "info",
    DEBUG = "debug",
    VERBOSE = "verbose"
}
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
export declare function getLoggingConfig(): LoggingConfig;
export declare const logger: winston.Logger;
export declare class CustomTypeORMLogger implements Logger {
    private config;
    log(level: 'log' | 'info' | 'warn' | 'error', message: any, queryRunner?: QueryRunner): void;
    logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner): void;
    logQueryError(error: string, query: string, parameters?: any[], queryRunner?: QueryRunner): void;
    logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner): void;
    logSchemaBuild(message: string, queryRunner?: QueryRunner): void;
    logMigration(message: string, queryRunner?: QueryRunner): void;
    private shouldLogTypeORM;
}
export declare class AppLogger {
    private config;
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
    database(message: string, meta?: any): void;
    http(message: string, meta?: any): void;
    auth(message: string, meta?: any): void;
    socket(message: string, meta?: any): void;
    business(message: string, meta?: any): void;
    performance(message: string, meta?: any): void;
}
export declare const appLogger: AppLogger;
