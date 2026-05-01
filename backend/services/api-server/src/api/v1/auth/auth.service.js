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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const enum_1 = require("./dto/enum");
const shared_1 = require("../../../../../../shared/src");
const slack_service_1 = require("../../../utils/slack/slack.service");
const shared_2 = require("../../../../../../shared/src");
const shared_3 = require("../../../../../../shared/src");
let AuthService = class AuthService {
    constructor(jwtService, slackService, adminRepository, drivingSchoolOwnerRepository, drivingSchoolManagerRepository, sessionRepository, systemLogsRepository) {
        this.jwtService = jwtService;
        this.slackService = slackService;
        this.adminRepository = adminRepository;
        this.drivingSchoolOwnerRepository = drivingSchoolOwnerRepository;
        this.drivingSchoolManagerRepository = drivingSchoolManagerRepository;
        this.sessionRepository = sessionRepository;
        this.systemLogsRepository = systemLogsRepository;
    }
    async login(loginDto) {
        let user = null;
        let userType;
        if (!user) {
            const ownerUser = await this.drivingSchoolOwnerRepository.findOne({ where: { email: loginDto.email } });
            if (ownerUser && (loginDto.password) === shared_1.TextEncryptor.userPasswordDecrypt(ownerUser.password)) {
                user = ownerUser;
                userType = enum_1.UserTypes.DRIVING_SCHOOL_OWNER;
            }
        }
        if (!user) {
            const managerUser = await this.drivingSchoolManagerRepository.findOne({ where: { email: loginDto.email } });
            if (managerUser && (loginDto.password) === shared_1.TextEncryptor.userPasswordDecrypt(managerUser.password)) {
                user = managerUser;
                userType = enum_1.UserTypes.DRIVING_SCHOOL_MANAGER;
            }
        }
        if (!user) {
            const adminUser = await this.adminRepository.findOne({ where: { email: loginDto.email } });
            if (adminUser && (loginDto.password) == shared_1.TextEncryptor.userPasswordDecrypt(adminUser.password)) {
                user = adminUser;
                userType = enum_1.UserTypes.ADMIN;
            }
        }
        if (!user || !userType) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const token = this.jwtService.sign({
            id: user.id,
            email: user.email,
            userType: userType,
            date: Math.floor(Date.now() / 1000),
            jwtid: crypto.randomUUID(),
        });
        const existingSessions = await this.sessionRepository.find({
            where: { user_id: user.id, user_type: userType }
        });
        if (existingSessions.length > 0) {
            await this.sessionRepository.delete({ user_id: user.id, user_type: userType });
        }
        await this.sessionRepository.save({
            token,
            user_id: user.id,
            user_type: userType,
            expires_at: Math.floor(Date.now() / 1000) + shared_3.env.session.expiry,
            last_activity: Math.floor(Date.now() / 1000),
            last_login: Math.floor(Date.now() / 1000),
        });
        await this.systemLogsRepository.save({
            user_id: user.id,
            user_type: userType,
            process: enum_1.SystemLogProcessTypes.LOGIN,
            description: `User logged in: ${user.email} (${userType})`
        });
        await this.slackService.sendNotification("Login Notification", `User logged in: ${user.email} (${userType})`, 1);
        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                userType: userType,
            },
        };
    }
    async logout(req) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) {
            throw new common_1.UnauthorizedException('No token provided');
        }
        await this.systemLogsRepository.save({
            user_id: req.user.id,
            user_type: req.user.role || enum_1.UserTypes.ADMIN,
            process: enum_1.SystemLogProcessTypes.LOGOUT,
            description: `User logged out: ${req.user.email} (${req.user.role})`
        });
        return { message: 'Successfully logged out' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(shared_2.AdminEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(shared_2.DrivingSchoolOwnerEntity)),
    __param(4, (0, typeorm_1.InjectRepository)(shared_2.DrivingSchoolManagerEntity)),
    __param(5, (0, typeorm_1.InjectRepository)(shared_2.SessionEntity)),
    __param(6, (0, typeorm_1.InjectRepository)(shared_2.SystemLogsEntity)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        slack_service_1.SlackService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AuthService);
//# sourceMappingURL=auth.service.js.map