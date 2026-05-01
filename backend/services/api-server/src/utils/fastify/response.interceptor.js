"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
let ResponseInterceptor = class ResponseInterceptor {
    intercept(context, next) {
        const ctx = context.switchToHttp();
        const res = ctx.getResponse();
        const req = ctx.getRequest();
        return next.handle().pipe((0, rxjs_1.map)((data) => {
            return this.responseHandler(data, res, req);
        }), (0, rxjs_1.catchError)((err) => {
            return (0, rxjs_1.throwError)(() => err);
        }));
    }
    getErrorResponse(err) {
        const error = err instanceof common_1.HttpException ? err : new common_1.InternalServerErrorException();
        const response = error.getResponse();
        const message = response.message || error.message;
        const status = error.getStatus();
        return Object.assign(Object.assign({ message: typeof message === 'string'
                ? message
                : Array.isArray(message)
                    ? message[0]
                    : (message === null || message === void 0 ? void 0 : message.appMessage) || error.message }, (response.payload || {})), { status });
    }
    responseHandler(data, res, req) {
        const isInstance = typeof data === 'object' && data !== null && 'message' in data;
        const response = {
            data: isInstance ? data.data : data,
            status: res.statusCode,
            success: true,
            message: isInstance ? data.message : 'Success'
        };
        return response;
    }
};
exports.ResponseInterceptor = ResponseInterceptor;
exports.ResponseInterceptor = ResponseInterceptor = __decorate([
    (0, common_1.Injectable)()
], ResponseInterceptor);
//# sourceMappingURL=response.interceptor.js.map