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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const admin_guard_1 = require("../../../../common/guards/admin.guard");
const dto_1 = require("./dto");
const dashboard_service_1 = require("./dashboard.service");
let DashboardController = class DashboardController {
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }
    async getDashboardData() {
        try {
            const dashboardData = await this.dashboardService.getDashboardData();
            const response = {
                success: true,
                data: dashboardData,
                timestamp: new Date().toISOString()
            };
            return response;
        }
        catch (error) {
            console.error('Error getting dashboard data:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : 'No stack trace available';
            console.error('Detailed error:', {
                message: errorMessage,
                stack: errorStack,
                error
            });
            throw new common_1.HttpException(Object.assign({ success: false, error: `Failed to retrieve dashboard data: ${errorMessage}`, timestamp: new Date().toISOString() }, (process.env.NODE_ENV === 'development' && { details: errorStack })), common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)(''),
    (0, swagger_1.ApiOperation)({ summary: 'Get complete admin dashboard data including statistics, recent activities, and system information' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Dashboard data with system information retrieved successfully', type: dto_1.DashboardResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getDashboardData", null);
exports.DashboardController = DashboardController = __decorate([
    (0, swagger_1.ApiTags)('Dashboard'),
    (0, common_1.Controller)('admin/dashboard'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [dashboard_service_1.DashboardService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map