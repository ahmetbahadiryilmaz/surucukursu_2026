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
exports.AdminsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const admins_service_1 = require("./admins.service");
const dto_1 = require("./dto");
const admin_guard_1 = require("../../../../common/guards/admin.guard");
let AdminsController = class AdminsController {
    constructor(adminService) {
        this.adminService = adminService;
    }
    async getAllAdmins() {
        return this.adminService.getAllAdmins();
    }
    async getAdminById(id) {
        return this.adminService.getAdminById(parseInt(id));
    }
    async createAdmin(dto) {
        return this.adminService.createAdmin(dto);
    }
    async updateAdmin(id, dto) {
        return this.adminService.updateAdmin(parseInt(id), dto);
    }
};
exports.AdminsController = AdminsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all admins' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns all admins' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminsController.prototype, "getAllAdmins", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get admin by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the admin' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Admin not found' }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID of the admin',
        example: '1',
    }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminsController.prototype, "getAdminById", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create new admin' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Admin created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Admin with email already exists' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateAdminDto]),
    __metadata("design:returntype", Promise)
], AdminsController.prototype, "createAdmin", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update admin' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Admin updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Admin not found' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Admin with email already exists' }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID of the admin',
        example: '1',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateAdminDto]),
    __metadata("design:returntype", Promise)
], AdminsController.prototype, "updateAdmin", null);
exports.AdminsController = AdminsController = __decorate([
    (0, swagger_1.ApiTags)('Users'),
    (0, common_1.Controller)('admin/admins'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [admins_service_1.AdminsService])
], AdminsController);
//# sourceMappingURL=admins.controller.js.map