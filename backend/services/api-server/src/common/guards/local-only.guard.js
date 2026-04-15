"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalOnlyGuard = void 0;
const common_1 = require("@nestjs/common");
let LocalOnlyGuard = class LocalOnlyGuard {
    canActivate(context) {
        var _a, _b, _c, _d;
        console.log(`LocalOnlyGuard: Checking access for ${context.getClass().name}.${context.getHandler().name}`);
        const request = context.switchToHttp().getRequest();
        const clientIp = request.ip ||
            ((_a = request.connection) === null || _a === void 0 ? void 0 : _a.remoteAddress) ||
            ((_b = request.socket) === null || _b === void 0 ? void 0 : _b.remoteAddress) ||
            ((_d = (_c = request.connection) === null || _c === void 0 ? void 0 : _c.socket) === null || _d === void 0 ? void 0 : _d.remoteAddress);
        console.log(`LocalOnlyGuard: Client IP: ${clientIp}`);
        const allowedIps = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'];
        if (!allowedIps.includes(clientIp)) {
            console.log(`LocalOnlyGuard: Access denied for IP ${clientIp}`);
            throw new common_1.ForbiddenException('Access denied: Only localhost requests allowed');
        }
        console.log(`LocalOnlyGuard: Access granted for IP ${clientIp}`);
        return true;
    }
};
exports.LocalOnlyGuard = LocalOnlyGuard;
exports.LocalOnlyGuard = LocalOnlyGuard = __decorate([
    (0, common_1.Injectable)()
], LocalOnlyGuard);
//# sourceMappingURL=local-only.guard.js.map