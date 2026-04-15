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
exports.DrivingSchoolController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const driving_school_service_1 = require("./driving-school.service");
const update_driving_school_creds_dto_1 = require("./dto/update-driving-school-creds.dto");
const driving_school_creds_dto_1 = require("./dto/driving-school-creds.dto");
const update_driving_school_settings_dto_1 = require("./dto/update-driving-school-settings.dto");
const driving_school_settings_dto_1 = require("./dto/driving-school-settings.dto");
const driving_school_guard_1 = require("../../../../common/guards/driving-school.guard");
let DrivingSchoolController = class DrivingSchoolController {
    constructor(drivingSchoolService) {
        this.drivingSchoolService = drivingSchoolService;
    }
    async getDrivingSchoolInfo(code) {
        return this.drivingSchoolService.getDrivingSchoolInfo(code);
    }
    async getCreds(code) {
        return this.drivingSchoolService.getCreds(code);
    }
    async updateCreds(code, dto) {
        return this.drivingSchoolService.updateCreds(code, dto);
    }
    async getSettings(code) {
        return this.drivingSchoolService.getSettings(code);
    }
    async updateSettings(code, dto) {
        return this.drivingSchoolService.updateSettings(code, dto);
    }
};
exports.DrivingSchoolController = DrivingSchoolController;
__decorate([
    (0, common_1.Get)('info'),
    (0, swagger_1.ApiOperation)({ summary: 'Get driving school information' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Driving school info retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Driving school not found' }),
    __param(0, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DrivingSchoolController.prototype, "getDrivingSchoolInfo", null);
__decorate([
    (0, common_1.Get)('creds'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get Mebbis Credentials',
        description: 'Retrieves the Mebbis credentials for a specific driving school'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Credentials retrieved successfully',
        type: driving_school_creds_dto_1.DrivingSchoolCredsDto
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Driving school not found' }),
    (0, swagger_1.ApiParam)({
        name: 'code',
        description: 'The unique code of the driving school',
        example: '123',
        required: true
    }),
    __param(0, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DrivingSchoolController.prototype, "getCreds", null);
__decorate([
    (0, common_1.Post)('creds'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update Creds Of Mebbis',
        description: 'Updates the Mebbis credentials for a specific driving school'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Creds Updated Successfully',
        type: update_driving_school_creds_dto_1.UpdateDrivingSchoolCredsDto
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Driving school not found' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input data' }),
    (0, swagger_1.ApiParam)({
        name: 'code',
        description: 'The unique code of the driving school',
        example: '123',
        required: true
    }),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_driving_school_creds_dto_1.UpdateDrivingSchoolCredsDto]),
    __metadata("design:returntype", Promise)
], DrivingSchoolController.prototype, "updateCreds", null);
__decorate([
    (0, common_1.Get)('settings'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get Driving School Settings',
        description: 'Retrieves the settings for a specific driving school including simulator type and notification preferences'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Settings retrieved successfully',
        type: driving_school_settings_dto_1.DrivingSchoolSettingsDto
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Driving school not found' }),
    (0, swagger_1.ApiParam)({
        name: 'code',
        description: 'The unique code of the driving school',
        example: '123',
        required: true
    }),
    __param(0, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DrivingSchoolController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Put)('settings'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update Driving School Settings',
        description: 'Updates the settings for a specific driving school including simulator type and notification preferences'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Settings updated successfully'
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Driving school not found' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input data' }),
    (0, swagger_1.ApiParam)({
        name: 'code',
        description: 'The unique code of the driving school',
        example: '123',
        required: true
    }),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_driving_school_settings_dto_1.UpdateDrivingSchoolSettingsDto]),
    __metadata("design:returntype", Promise)
], DrivingSchoolController.prototype, "updateSettings", null);
exports.DrivingSchoolController = DrivingSchoolController = __decorate([
    (0, swagger_1.ApiTags)('Driving Schools'),
    (0, common_1.Controller)('driving-school/:code'),
    (0, common_1.UseGuards)(driving_school_guard_1.DrivingSchoolGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [driving_school_service_1.DrivingSchoolService])
], DrivingSchoolController);
//# sourceMappingURL=driving-school.controller.js.map