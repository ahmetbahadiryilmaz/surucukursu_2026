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
exports.AdminDrivingSchoolManagersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const admin_driving_school_managers_service_1 = require("./admin-driving-school-managers.service");
const dto_1 = require("./dto");
const admin_guard_1 = require("../../../../common/guards/admin.guard");
let AdminDrivingSchoolManagersController = class AdminDrivingSchoolManagersController {
    constructor(service) {
        this.service = service;
    }
    async getAllManagers() {
        return this.service.getAllManagers();
    }
    async getManagerById(id) {
        return this.service.getManagerById(parseInt(id));
    }
    async createManager(dto) {
        return this.service.createManager(dto);
    }
    async updateManager(id, dto) {
        return this.service.updateManager(parseInt(id), dto);
    }
    async deleteManager(id) {
        return this.service.deleteManager(parseInt(id));
    }
};
exports.AdminDrivingSchoolManagersController = AdminDrivingSchoolManagersController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all driving school managers' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns all driving school managers' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminDrivingSchoolManagersController.prototype, "getAllManagers", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get driving school manager by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the driving school manager' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Manager not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminDrivingSchoolManagersController.prototype, "getManagerById", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create new driving school manager' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Manager created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Email already in use' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateManagerDto]),
    __metadata("design:returntype", Promise)
], AdminDrivingSchoolManagersController.prototype, "createManager", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update driving school manager' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Manager updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Manager not found' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Email already in use' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateManagerDto]),
    __metadata("design:returntype", Promise)
], AdminDrivingSchoolManagersController.prototype, "updateManager", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete driving school manager' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Manager deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Manager not found' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Cannot delete manager assigned to schools' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminDrivingSchoolManagersController.prototype, "deleteManager", null);
exports.AdminDrivingSchoolManagersController = AdminDrivingSchoolManagersController = __decorate([
    (0, swagger_1.ApiTags)('Driving School Managers'),
    (0, common_1.Controller)('admin/driving-school-managers'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [admin_driving_school_managers_service_1.AdminDrivingSchoolManagersService])
], AdminDrivingSchoolManagersController);
//# sourceMappingURL=admin-driving-school-managers.controller.js.map