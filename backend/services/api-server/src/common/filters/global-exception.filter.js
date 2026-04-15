"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let GlobalExceptionFilter = class GlobalExceptionFilter {
    getDefaultErrorCode(status) {
        const statusCodeMap = {
            [common_1.HttpStatus.BAD_REQUEST]: 'INVALID_REQUEST',
            [common_1.HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
            [common_1.HttpStatus.FORBIDDEN]: 'FORBIDDEN',
            [common_1.HttpStatus.NOT_FOUND]: 'NOT_FOUND',
            [common_1.HttpStatus.CONFLICT]: 'CONFLICT',
            [common_1.HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
            [common_1.HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
            [common_1.HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
        };
        return statusCodeMap[status] || 'OPERATION_FAILED';
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const reply = ctx.getResponse();
        const status = exception instanceof common_1.HttpException
            ? exception.getStatus()
            : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let errorCode;
        let errorMessage = exception instanceof common_1.HttpException
            ? exception.message
            : 'Internal Server Error';
        if (exception instanceof common_1.HttpException) {
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                const response = exceptionResponse;
                if (response.code) {
                    errorCode = response.code;
                }
                if (response.message) {
                    errorMessage = response.message;
                }
            }
        }
        if (!errorCode) {
            errorCode = this.getDefaultErrorCode(status);
        }
        const responseData = {
            code: errorCode,
            message: errorMessage,
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: ctx.getRequest().url,
        };
        if (process.env.NODE_ENV === 'development') {
            responseData.dev_error = {
                name: exception.name,
                message: exception.message,
                stack: exception.stack,
            };
            if (exception.code && exception.meta) {
                responseData.dev_error.code = exception.code;
                responseData.dev_error.meta = exception.meta;
            }
        }
        reply.status(status).send(responseData);
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
//# sourceMappingURL=global-exception.filter.js.map