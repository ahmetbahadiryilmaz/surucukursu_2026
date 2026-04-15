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
exports.AdminsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const shared_1 = require("../../../../../../../shared/src");
const shared_2 = require("../../../../../../../shared/src");
let AdminsService = class AdminsService {
    constructor(adminRepository) {
        this.adminRepository = adminRepository;
    }
    async getAllAdmins() {
        const admins = await this.adminRepository.find({
            select: ['id', 'name', 'email', 'created_at', 'updated_at']
        });
        return admins;
    }
    async getAdminById(id) {
        const admin = await this.adminRepository.findOne({
            where: { id },
            select: ['id', 'name', 'email', 'created_at', 'updated_at']
        });
        if (!admin) {
            throw new common_1.NotFoundException(`Admin with ID ${id} not found`);
        }
        return admin;
    }
    async createAdmin(dto) {
        const existingAdmin = await this.adminRepository.findOne({
            where: { email: dto.email }
        });
        if (existingAdmin) {
            throw new common_1.ConflictException(`Admin with email ${dto.email} already exists`);
        }
        const admin = this.adminRepository.create({
            name: dto.name,
            email: dto.email,
            password: shared_2.TextEncryptor.userPasswordEncrypt(dto.password),
        });
        const createdAdmin = await this.adminRepository.save(admin);
        return {
            id: createdAdmin.id,
            name: createdAdmin.name,
            email: createdAdmin.email,
            created_at: createdAdmin.created_at,
            updated_at: createdAdmin.updated_at,
        };
    }
    async updateAdmin(id, dto) {
        const admin = await this.adminRepository.findOne({
            where: { id }
        });
        if (!admin) {
            throw new common_1.NotFoundException(`Admin with ID ${id} not found`);
        }
        if (dto.email && dto.email !== admin.email) {
            const existingAdmin = await this.adminRepository.findOne({
                where: { email: dto.email }
            });
            if (existingAdmin) {
                throw new common_1.ConflictException(`Admin with email ${dto.email} already exists`);
            }
        }
        const updateData = {};
        if (dto.name !== undefined)
            updateData.name = dto.name;
        if (dto.email !== undefined)
            updateData.email = dto.email;
        if (dto.password)
            updateData.password = shared_2.TextEncryptor.userPasswordEncrypt(dto.password);
        await this.adminRepository.update(id, updateData);
        const updatedAdmin = await this.adminRepository.findOne({
            where: { id },
            select: ['id', 'name', 'email', 'created_at', 'updated_at']
        });
        return updatedAdmin;
    }
};
exports.AdminsService = AdminsService;
exports.AdminsService = AdminsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(shared_1.AdminEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AdminsService);
//# sourceMappingURL=admins.service.js.map