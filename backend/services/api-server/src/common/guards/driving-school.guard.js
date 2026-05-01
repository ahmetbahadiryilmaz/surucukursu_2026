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
exports.DrivingSchoolGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const jwt_1 = require("@nestjs/jwt");
const enum_1 = require("../../api/v1/auth/dto/enum");
const public_decorator_1 = require("../decorators/public.decorator");
let DrivingSchoolGuard = class DrivingSchoolGuard {
    constructor(jwtService, reflector) {
        this.jwtService = jwtService;
        this.reflector = reflector;
    }
    async canActivate(context) {
        var _a;
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const token = (_a = request.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        if (!token) {
            throw new common_1.UnauthorizedException('No token provided');
        }
        try {
            const payload = this.jwtService.verify(token);
            if (payload.userType !== enum_1.UserTypes.DRIVING_SCHOOL_OWNER && payload.userType !== enum_1.UserTypes.DRIVING_SCHOOL_MANAGER && payload.userType !== enum_1.UserTypes.ADMIN) {
                throw new common_1.UnauthorizedException('Driving school access required');
            }
            request.user = payload;
            return true;
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid driving school access');
        }
    }
};
exports.DrivingSchoolGuard = DrivingSchoolGuard;
exports.DrivingSchoolGuard = DrivingSchoolGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        core_1.Reflector])
], DrivingSchoolGuard);
//# sourceMappingURL=driving-school.guard.js.map