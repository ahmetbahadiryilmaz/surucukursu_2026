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
exports.AdminDrivingSchoolOwnersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const shared_1 = require("../../../../../../../shared/src");
const shared_2 = require("../../../../../../../shared/src");
let AdminDrivingSchoolOwnersService = class AdminDrivingSchoolOwnersService {
    constructor(ownerRepository, schoolRepository, managerRepository) {
        this.ownerRepository = ownerRepository;
        this.schoolRepository = schoolRepository;
        this.managerRepository = managerRepository;
    }
    async getAllOwners() {
        return this.ownerRepository.find({
            relations: ['DrivingSchool'],
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                created_at: true,
                updated_at: true,
                DrivingSchool: {
                    id: true,
                    name: true
                }
            }
        });
    }
    async getOwnerById(id) {
        const owner = await this.ownerRepository.findOne({
            where: { id },
            relations: ['DrivingSchool']
        });
        if (!owner) {
            throw new common_1.NotFoundException(`Owner with ID ${id} not found`);
        }
        return owner;
    }
    async createOwner(dto) {
        const existingOwner = await this.ownerRepository.findOne({
            where: { email: dto.email }
        });
        if (existingOwner) {
            throw new common_1.ConflictException(`Email ${dto.email} is already in use`);
        }
        const owner = this.ownerRepository.create({
            name: dto.name,
            email: dto.email,
            password: shared_2.TextEncryptor.userPasswordEncrypt(dto.password),
            phone: dto.phone
        });
        const savedOwner = await this.ownerRepository.save(owner);
        const manager = this.managerRepository.create({
            name: dto.name,
            email: dto.email,
            password: shared_2.TextEncryptor.userPasswordEncrypt(dto.password),
            phone: dto.phone
        });
        await this.managerRepository.save(manager);
        return savedOwner;
    }
    async updateOwner(id, dto) {
        const owner = await this.ownerRepository.findOne({
            where: { id }
        });
        if (!owner) {
            throw new common_1.NotFoundException(`Owner with ID ${id} not found`);
        }
        if (dto.email && dto.email !== owner.email) {
            const existingOwner = await this.ownerRepository.findOne({
                where: { email: dto.email }
            });
            if (existingOwner) {
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
        await this.ownerRepository.update(id, updateData);
        return this.ownerRepository.findOne({ where: { id } });
    }
    async deleteOwner(id) {
        const owner = await this.ownerRepository.findOne({
            where: { id },
            relations: ['DrivingSchool']
        });
        if (!owner) {
            throw new common_1.NotFoundException(`Owner with ID ${id} not found`);
        }
        if (owner.DrivingSchool && owner.DrivingSchool.length > 0) {
            throw new common_1.ConflictException(`Cannot delete owner as they are assigned to ${owner.DrivingSchool.length} schools. Please reassign these schools first.`);
        }
        await this.ownerRepository.delete(id);
        return { message: 'Owner deleted successfully' };
    }
};
exports.AdminDrivingSchoolOwnersService = AdminDrivingSchoolOwnersService;
exports.AdminDrivingSchoolOwnersService = AdminDrivingSchoolOwnersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(shared_1.DrivingSchoolOwnerEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(shared_1.DrivingSchoolEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(shared_1.DrivingSchoolManagerEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AdminDrivingSchoolOwnersService);
//# sourceMappingURL=admin-driving-school-owners.service.js.map