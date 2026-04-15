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
exports.AdminDrivingSchoolsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const admin_driving_schools_service_1 = require("./admin-driving-schools.service");
const dto_1 = require("./dto");
const admin_guard_1 = require("../../../../common/guards/admin.guard");
let AdminDrivingSchoolsController = class AdminDrivingSchoolsController {
    constructor(service) {
        this.service = service;
    }
    async getAllDrivingSchools() {
        return this.service.getAllDrivingSchools();
    }
    async getDrivingSchoolById(id) {
        return this.service.getDrivingSchoolById(parseInt(id));
    }
    async createDrivingSchool(dto, req) {
        return this.service.createDrivingSchool(dto, req.user.id);
    }
    async updateDrivingSchool(id, dto, req) {
        return this.service.updateDrivingSchool(parseInt(id), dto, req.user.id);
    }
    async deleteDrivingSchool(id, req) {
        return this.service.deleteDrivingSchool(parseInt(id), req.user.id);
    }
    async loginAs(code) {
        return this.service.loginAs(code);
    }
};
exports.AdminDrivingSchoolsController = AdminDrivingSchoolsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all driving schools' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns all driving schools' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminDrivingSchoolsController.prototype, "getAllDrivingSchools", null);
__decorate([
    (0, common_1.Get)(':code'),
    (0, swagger_1.ApiOperation)({ summary: 'Get driving school by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the driving school' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Driving school not found' }),
    __param(0, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminDrivingSchoolsController.prototype, "getDrivingSchoolById", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create new driving school' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Driving school created successfully' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateDrivingSchoolDto, Object]),
    __metadata("design:returntype", Promise)
], AdminDrivingSchoolsController.prototype, "createDrivingSchool", null);
__decorate([
    (0, common_1.Put)(':code'),
    (0, swagger_1.ApiOperation)({ summary: 'Update driving school' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Driving school updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Driving school not found' }),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateDrivingSchoolDto, Object]),
    __metadata("design:returntype", Promise)
], AdminDrivingSchoolsController.prototype, "updateDrivingSchool", null);
__decorate([
    (0, common_1.Delete)(':code'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete driving school' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Driving school deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Driving school not found' }),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminDrivingSchoolsController.prototype, "deleteDrivingSchool", null);
__decorate([
    (0, common_1.Post)(':code/login-as'),
    (0, swagger_1.ApiOperation)({ summary: 'Login as driving school manager' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns manager access token' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Driving school or manager not found' }),
    __param(0, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminDrivingSchoolsController.prototype, "loginAs", null);
exports.AdminDrivingSchoolsController = AdminDrivingSchoolsController = __decorate([
    (0, swagger_1.ApiTags)('Driving Schools'),
    (0, common_1.Controller)('admin/driving-schools'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [admin_driving_schools_service_1.AdminDrivingSchoolsService])
], AdminDrivingSchoolsController);
//# sourceMappingURL=admin-driving-schools.controller.js.map