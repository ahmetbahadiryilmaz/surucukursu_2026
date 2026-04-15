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
exports.JobsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jobs_service_1 = require("./jobs.service");
const auth_guard_1 = require("../../../../common/guards/auth.guard");
let JobsController = class JobsController {
    constructor(jobsService) {
        this.jobsService = jobsService;
    }
    async getJobs(req, status, type, limit, offset) {
        return await this.jobsService.getUserJobs(req.user.id, {
            status,
            type,
            limit: limit || 50,
            offset: offset || 0,
        });
    }
    async getDrivingSchoolJobs(req, status, type, limit, offset) {
        var _a;
        const schoolIds = ((_a = req.user.drivingSchools) === null || _a === void 0 ? void 0 : _a.map(school => school.id)) || [];
        if (schoolIds.length === 0) {
            return {
                jobs: [],
                total: 0,
                limit: limit || 50,
                offset: offset || 0,
            };
        }
        return await this.jobsService.getDrivingSchoolJobs(schoolIds, {
            status,
            type,
            limit: limit || 50,
            offset: offset || 0,
        });
    }
};
exports.JobsController = JobsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get user jobs' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Jobs retrieved successfully' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('type')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "getJobs", null);
__decorate([
    (0, common_1.Get)('driving-school'),
    (0, swagger_1.ApiOperation)({ summary: 'Get driving school jobs' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Driving school jobs retrieved successfully' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('type')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "getDrivingSchoolJobs", null);
exports.JobsController = JobsController = __decorate([
    (0, swagger_1.ApiTags)('Jobs'),
    (0, common_1.Controller)('driving-school/jobs'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [jobs_service_1.JobsService])
], JobsController);
//# sourceMappingURL=jobs.controller.js.map