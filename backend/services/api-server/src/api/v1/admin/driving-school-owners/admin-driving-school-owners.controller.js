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
exports.AdminDrivingSchoolOwnersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const admin_driving_school_owners_service_1 = require("./admin-driving-school-owners.service");
const dto_1 = require("./dto");
const admin_guard_1 = require("../../../../common/guards/admin.guard");
let AdminDrivingSchoolOwnersController = class AdminDrivingSchoolOwnersController {
    constructor(service) {
        this.service = service;
    }
    async getAllOwners() {
        return this.service.getAllOwners();
    }
    async getOwnerById(id) {
        return this.service.getOwnerById(parseInt(id));
    }
    async createOwner(dto) {
        return this.service.createOwner(dto);
    }
    async updateOwner(id, dto) {
        return this.service.updateOwner(parseInt(id), dto);
    }
    async deleteOwner(id) {
        return this.service.deleteOwner(parseInt(id));
    }
};
exports.AdminDrivingSchoolOwnersController = AdminDrivingSchoolOwnersController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all driving school owners' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns all driving school owners' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminDrivingSchoolOwnersController.prototype, "getAllOwners", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get driving school owner by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the driving school owner' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Owner not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminDrivingSchoolOwnersController.prototype, "getOwnerById", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create new driving school owner' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Owner created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Email already in use' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateOwnerDto]),
    __metadata("design:returntype", Promise)
], AdminDrivingSchoolOwnersController.prototype, "createOwner", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update driving school owner' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Owner updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Owner not found' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Email already in use' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateOwnerDto]),
    __metadata("design:returntype", Promise)
], AdminDrivingSchoolOwnersController.prototype, "updateOwner", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete driving school owner' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Owner deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Owner not found' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Cannot delete owner assigned to schools' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminDrivingSchoolOwnersController.prototype, "deleteOwner", null);
exports.AdminDrivingSchoolOwnersController = AdminDrivingSchoolOwnersController = __decorate([
    (0, swagger_1.ApiTags)('Driving School Owners'),
    (0, common_1.Controller)('admin/driving-school-owners'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [admin_driving_school_owners_service_1.AdminDrivingSchoolOwnersService])
], AdminDrivingSchoolOwnersController);
//# sourceMappingURL=admin-driving-school-owners.controller.js.map