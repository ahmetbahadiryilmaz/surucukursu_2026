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
exports.AdminDrivingSchoolManagersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const shared_1 = require("../../../../../../../shared/src");
const shared_2 = require("../../../../../../../shared/src");
let AdminDrivingSchoolManagersService = class AdminDrivingSchoolManagersService {
    constructor(managerRepository, schoolRepository) {
        this.managerRepository = managerRepository;
        this.schoolRepository = schoolRepository;
    }
    async getAllManagers() {
        return this.managerRepository.find({
            relations: ['schools'],
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                created_at: true,
                updated_at: true,
                schools: {
                    id: true,
                    name: true
                }
            }
        });
    }
    async getManagerById(id) {
        const manager = await this.managerRepository.findOne({
            where: { id },
            relations: ['schools']
        });
        if (!manager) {
            throw new common_1.NotFoundException(`Manager with ID ${id} not found`);
        }
        return manager;
    }
    async createManager(dto) {
        const existingManager = await this.managerRepository.findOne({
            where: { email: dto.email }
        });
        if (existingManager) {
            throw new common_1.ConflictException(`Email ${dto.email} is already in use`);
        }
        const manager = this.managerRepository.create({
            name: dto.name,
            email: dto.email,
            password: shared_2.TextEncryptor.userPasswordEncrypt(dto.password),
            phone: dto.phone
        });
        return this.managerRepository.save(manager);
    }
    async updateManager(id, dto) {
        const manager = await this.managerRepository.findOne({
            where: { id }
        });
        if (!manager) {
            throw new common_1.NotFoundException(`Manager with ID ${id} not found`);
        }
        if (dto.email && dto.email !== manager.email) {
            const existingManager = await this.managerRepository.findOne({
                where: { email: dto.email }
            });
            if (existingManager) {
                throw new common_1.ConflictException(`Email ${dto.email} is already in use`);
            }
        }
        const updateData = {};
        if (dto.name !== undefined)
            updateData.name = dto.name;
        if (dto.email !== undefined)
            updateData.email = dto.email;
        if (dto.phone !== undefined)
            updateData.phone = dto.phone;
        if (dto.password) {
            updateData.password = shared_2.TextEncryptor.userPasswordEncrypt(dto.password);
        }
        await this.managerRepository.update(id, updateData);
        return this.managerRepository.findOne({ where: { id } });
    }
    async deleteManager(id) {
        const manager = await this.managerRepository.findOne({
            where: { id },
            relations: ['schools']
        });
        if (!manager) {
            throw new common_1.NotFoundException(`Manager with ID ${id} not found`);
        }
        if (manager.schools && manager.schools.length > 0) {
            throw new common_1.ConflictException(`Cannot delete manager as they are assigned to ${manager.schools.length} schools. Please reassign these schools first.`);
        }
        await this.managerRepository.delete(id);
        return { message: 'Manager deleted successfully' };
    }
};
exports.AdminDrivingSchoolManagersService = AdminDrivingSchoolManagersService;
exports.AdminDrivingSchoolManagersService = AdminDrivingSchoolManagersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(shared_1.DrivingSchoolManagerEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(shared_1.DrivingSchoolEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], AdminDrivingSchoolManagersService);
//# sourceMappingURL=admin-driving-school-managers.service.js.map