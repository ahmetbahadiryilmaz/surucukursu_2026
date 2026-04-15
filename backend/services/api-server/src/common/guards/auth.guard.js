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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const shared_1 = require("../../../../../shared/src");
const public_decorator_1 = require("../decorators/public.decorator");
let AuthGuard = class AuthGuard {
    constructor(jwtService, reflector, sessionRepository, drivingSchoolRepository) {
        this.jwtService = jwtService;
        this.reflector = reflector;
        this.sessionRepository = sessionRepository;
        this.drivingSchoolRepository = drivingSchoolRepository;
    }
    async canActivate(context) {
        var _a;
        const controllerClass = context.getClass();
        const handler = context.getHandler();
        const request = context.switchToHttp().getRequest();
        const url = request.url;
        console.log(`AuthGuard: Checking access for ${controllerClass.name}.${handler.name} at ${url}`);
        if (controllerClass.name === 'WorkerController') {
            console.log(`AuthGuard: Skipping authentication for WorkerController method ${handler.name}`);
            return true;
        }
        if (url.includes('/api/v1/worker/')) {
            console.log(`AuthGuard: Skipping authentication for worker URL ${url}`);
            return true;
        }
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        console.log(`AuthGuard: isPublic check result: ${isPublic}`);
        if (isPublic) {
            console.log(`AuthGuard: Skipping authentication due to @Public() decorator`);
            return true;
        }
        console.log(`AuthGuard: Proceeding with authentication check`);
        const token = (_a = request.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        if (!token) {
            console.log(`AuthGuard: No token provided, throwing UnauthorizedException`);
            throw new common_1.UnauthorizedException('Access token is required');
        }
        try {
            const payload = this.jwtService.verify(token);
            console.log(`AuthGuard: Token verified successfully for user ${payload.id}`);
            const session = await this.sessionRepository.findOne({ where: { token } });
            if (!session || session.expires_at < Math.floor(Date.now() / 1000)) {
                console.log(`AuthGuard: Session invalid or expired`);
                throw new common_1.UnauthorizedException('Session expired');
            }
            await this.sessionRepository.update(session.id, { last_activity: Math.floor(Date.now() / 1000) });
            request.user = payload;
            request.user.drivingSchools = await this.drivingSchoolRepository.find({
                where: [
                    { owner_id: payload.id },
                    { manager_id: payload.id },
                ],
            });
            console.log(`AuthGuard: Authentication successful`);
            return true;
        }
        catch (error) {
            console.log(`AuthGuard: Authentication failed: ${error.message}`);
            throw new common_1.UnauthorizedException();
        }
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(shared_1.SessionEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(shared_1.DrivingSchoolEntity)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        core_1.Reflector,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AuthGuard);
//# sourceMappingURL=auth.guard.js.map