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
exports.AdminDrivingSchoolsService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const shared_1 = require("../../../../../../../shared/src");
const enum_1 = require("../../auth/dto/enum");
const crypto = require("crypto");
let AdminDrivingSchoolsService = class AdminDrivingSchoolsService {
    constructor(schoolRepository, subscriptionRepository, systemLogsRepository, sessionRepository, studentRepository, carRepository, jwtService) {
        this.schoolRepository = schoolRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.systemLogsRepository = systemLogsRepository;
        this.sessionRepository = sessionRepository;
        this.studentRepository = studentRepository;
        this.carRepository = carRepository;
        this.jwtService = jwtService;
    }
    async getAllDrivingSchools() {
        const schools = await this.schoolRepository.find({
            relations: ['owner', 'manager', 'city', 'district', 'subscription']
        });
        return schools.map(school => {
            var _a;
            return (Object.assign(Object.assign({}, school), { subscription_id: ((_a = school.subscription) === null || _a === void 0 ? void 0 : _a.id) || null }));
        });
    }
    async getDrivingSchoolById(id) {
        var _a;
        const school = await this.schoolRepository.findOne({
            where: { id },
            relations: ['owner', 'manager', 'city', 'district', 'subscription', 'students', 'cars']
        });
        if (!school) {
            throw new common_1.NotFoundException(`Driving school with ID ${id} not found`);
        }
        return Object.assign(Object.assign({}, school), { subscription_id: ((_a = school.subscription) === null || _a === void 0 ? void 0 : _a.id) || null });
    }
    async createDrivingSchool(dto, adminId) {
        const school = this.schoolRepository.create({
            name: dto.name,
            phone: dto.phone,
            address: dto.address,
            owner_id: dto.owner_id,
            manager_id: dto.manager_id,
            city_id: dto.city_id,
            district_id: dto.district_id,
            created_by: adminId,
        });
        const savedSchool = await this.schoolRepository.save(school);
        const subscriptionData = dto.subscription || {
            type: 'demo',
            pdf_print_limit: 10,
            ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };
        const subscription = this.subscriptionRepository.create({
            driving_school_id: savedSchool.id,
            type: subscriptionData.type,
            pdf_print_limit: subscriptionData.pdf_print_limit || (subscriptionData.type === 'demo' ? 10 : null),
            pdf_print_used: 0,
            ends_at: subscriptionData.ends_at ? Math.floor(new Date(subscriptionData.ends_at).getTime() / 1000) : null
        });
        const savedSubscription = await this.subscriptionRepository.save(subscription);
        const log = this.systemLogsRepository.create({
            user_id: adminId,
            user_type: enum_1.UserTypes.ADMIN,
            process: enum_1.SystemLogProcessTypes.UPDATE_PROFILE,
            description: `Admin created driving school: ${savedSchool.name}`
        });
        await this.systemLogsRepository.save(log);
        return Object.assign(Object.assign({}, savedSchool), { subscription_id: savedSubscription.id, subscription: {
                id: savedSubscription.id,
                type: savedSubscription.type,
                pdf_print_limit: savedSubscription.pdf_print_limit,
                pdf_print_used: savedSubscription.pdf_print_used,
                created_at: savedSubscription.created_at,
                updated_at: savedSubscription.updated_at,
                ends_at: savedSubscription.ends_at
            } });
    }
    async updateDrivingSchool(id, dto, adminId) {
        const school = await this.schoolRepository.findOne({
            where: { id },
            relations: ['subscription']
        });
        if (!school) {
            throw new common_1.NotFoundException(`Driving school with ID ${id} not found`);
        }
        const updateData = {};
        if (dto.name !== undefined)
            updateData.name = dto.name;
        if (dto.phone !== undefined)
            updateData.phone = dto.phone;
        if (dto.address !== undefined)
            updateData.address = dto.address;
        if (dto.owner_id !== undefined)
            updateData.owner_id = dto.owner_id;
        if (dto.manager_id !== undefined)
            updateData.manager_id = dto.manager_id;
        if (dto.city_id !== undefined)
            updateData.city_id = dto.city_id;
        if (dto.district_id !== undefined)
            updateData.district_id = dto.district_id;
        await this.schoolRepository.update(id, updateData);
        let subscription;
        if (dto.subscription) {
            if (school.subscription) {
                const subUpdateData = {
                    type: dto.subscription.type,
                    pdf_print_limit: dto.subscription.pdf_print_limit !== undefined
                        ? dto.subscription.pdf_print_limit
                        : (dto.subscription.type === 'demo' ? 10 : null)
                };
                if (dto.subscription.ends_at) {
                    subUpdateData.ends_at = Math.floor(new Date(dto.subscription.ends_at).getTime() / 1000);
                }
                await this.subscriptionRepository.update(school.subscription.id, subUpdateData);
                subscription = await this.subscriptionRepository.findOne({ where: { id: school.subscription.id } });
            }
            else {
                const newSub = this.subscriptionRepository.create({
                    driving_school_id: id,
                    type: dto.subscription.type,
                    pdf_print_limit: dto.subscription.pdf_print_limit !== undefined
                        ? dto.subscription.pdf_print_limit
                        : (dto.subscription.type === 'demo' ? 10 : null),
                    pdf_print_used: 0,
                    ends_at: dto.subscription.ends_at ? Math.floor(new Date(dto.subscription.ends_at).getTime() / 1000) : null
                });
                subscription = await this.subscriptionRepository.save(newSub);
            }
        }
        else {
            if (!school.subscription) {
                const newSub = this.subscriptionRepository.create({
                    driving_school_id: id,
                    type: 'demo',
                    pdf_print_limit: 10,
                    pdf_print_used: 0,
                    ends_at: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000)
                });
                subscription = await this.subscriptionRepository.save(newSub);
            }
            else {
                subscription = school.subscription;
            }
        }
        const log = this.systemLogsRepository.create({
            user_id: adminId,
            user_type: enum_1.UserTypes.ADMIN,
            process: enum_1.SystemLogProcessTypes.UPDATE_PROFILE,
            description: `Admin updated driving school: ${school.name}`
        });
        await this.systemLogsRepository.save(log);
        const updatedSchool = await this.schoolRepository.findOne({
            where: { id },
            relations: ['owner', 'manager', 'city', 'district']
        });
        return Object.assign(Object.assign({}, updatedSchool), { subscription_id: (subscription === null || subscription === void 0 ? void 0 : subscription.id) || null, subscription: subscription ? {
                id: subscription.id,
                type: subscription.type,
                pdf_print_limit: subscription.pdf_print_limit,
                pdf_print_used: subscription.pdf_print_used,
                created_at: subscription.created_at,
                updated_at: subscription.updated_at,
                ends_at: subscription.ends_at
            } : null });
    }
    async deleteDrivingSchool(id, adminId) {
        const school = await this.schoolRepository.findOne({
            where: { id }
        });
        if (!school) {
            throw new common_1.NotFoundException(`Driving school with ID ${id} not found`);
        }
        await this.schoolRepository.update(id, { deleted_at: Math.floor(Date.now() / 1000) });
        await this.studentRepository.update({ school_id: id }, { deleted_at: Math.floor(Date.now() / 1000) });
        await this.carRepository.update({ school_id: id }, { deleted_at: Math.floor(Date.now() / 1000) });
        const log = this.systemLogsRepository.create({
            user_id: adminId,
            user_type: enum_1.UserTypes.ADMIN,
            process: enum_1.SystemLogProcessTypes.UPDATE_PROFILE,
            description: `Admin deleted driving school with ID: ${id}`
        });
        await this.systemLogsRepository.save(log);
        return { message: 'Driving school deleted successfully' };
    }
    async loginAs(code) {
        const drivingSchool = await this.schoolRepository.findOne({
            where: { id: parseInt(code) },
            relations: ['manager', 'subscription']
        });
        if (!drivingSchool || !drivingSchool.manager) {
            throw new common_1.NotFoundException('Driving school or manager not found');
        }
        await this.sessionRepository.delete({
            user_id: drivingSchool.manager.id,
            user_type: enum_1.UserTypes.DRIVING_SCHOOL_MANAGER
        });
        const token = this.jwtService.sign({
            id: drivingSchool.manager.id,
            email: drivingSchool.manager.email,
            userType: enum_1.UserTypes.DRIVING_SCHOOL_MANAGER,
            date: Math.floor(Date.now() / 1000),
            jwtid: crypto.randomUUID(),
        });
        const session = this.sessionRepository.create({
            token,
            user_id: drivingSchool.manager.id,
            user_type: enum_1.UserTypes.DRIVING_SCHOOL_MANAGER,
            expires_at: Math.floor((Date.now() + Number(process.env.SESSION_EXPIRY) * 1000) / 1000),
        });
        await this.sessionRepository.save(session);
        const log = this.systemLogsRepository.create({
            user_id: drivingSchool.manager.id,
            user_type: enum_1.UserTypes.DRIVING_SCHOOL_MANAGER,
            process: enum_1.SystemLogProcessTypes.LOGIN,
            description: `Admin logged in as manager: ${drivingSchool.manager.email} for school ${drivingSchool.name}`
        });
        await this.systemLogsRepository.save(log);
        return {
            token,
            user: {
                id: drivingSchool.manager.id,
                email: drivingSchool.manager.email,
                name: drivingSchool.manager.name,
                userType: enum_1.UserTypes.DRIVING_SCHOOL_MANAGER,
                school: {
                    id: drivingSchool.id,
                    name: drivingSchool.name,
                    subscription: drivingSchool.subscription
                }
            }
        };
    }
};
exports.AdminDrivingSchoolsService = AdminDrivingSchoolsService;
exports.AdminDrivingSchoolsService = AdminDrivingSchoolsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(shared_1.DrivingSchoolEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(shared_1.SubscriptionEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(shared_1.SystemLogsEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(shared_1.SessionEntity)),
    __param(4, (0, typeorm_1.InjectRepository)(shared_1.DrivingSchoolStudentEntity)),
    __param(5, (0, typeorm_1.InjectRepository)(shared_1.DrivingSchoolCarEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService])
], AdminDrivingSchoolsService);
//# sourceMappingURL=admin-driving-schools.service.js.map