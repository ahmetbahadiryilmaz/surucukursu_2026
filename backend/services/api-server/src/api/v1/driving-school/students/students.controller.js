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
exports.StudentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const students_service_1 = require("./students.service");
const driving_school_guard_1 = require("../../../../common/guards/driving-school.guard");
let StudentsController = class StudentsController {
    constructor(studentsService) {
        this.studentsService = studentsService;
    }
    async getStudents(code) {
        return this.studentsService.getStudents(code);
    }
    async syncStudents(code, body) {
        return this.studentsService.syncStudents(code, body === null || body === void 0 ? void 0 : body.ajandasKodu);
    }
};
exports.StudentsController = StudentsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get students of driving school' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Students retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Students not found' }),
    __param(0, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StudentsController.prototype, "getStudents", null);
__decorate([
    (0, common_1.Post)('sync'),
    (0, swagger_1.ApiOperation)({ summary: 'Sync students from MEBBIS service' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Students synced successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Sync failed' }),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StudentsController.prototype, "syncStudents", null);
exports.StudentsController = StudentsController = __decorate([
    (0, swagger_1.ApiTags)('Driving School Students'),
    (0, common_1.Controller)('driving-school/:code/students'),
    (0, common_1.UseGuards)(driving_school_guard_1.DrivingSchoolGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [students_service_1.StudentsService])
], StudentsController);
//# sourceMappingURL=students.controller.js.map