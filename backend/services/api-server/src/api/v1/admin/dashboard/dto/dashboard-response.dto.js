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
exports.SystemInfoResponseDto = exports.SystemDiskDto = exports.SystemMemoryDto = exports.SystemCPUDto = exports.SystemServiceDto = exports.DashboardResponseDto = exports.RecentActivityDto = exports.DashboardStatsDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class DashboardStatsDto {
}
exports.DashboardStatsDto = DashboardStatsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 25, description: 'Total number of driving schools' }),
    __metadata("design:type", Number)
], DashboardStatsDto.prototype, "totalDrivingSchools", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1250, description: 'Total number of students' }),
    __metadata("design:type", Number)
], DashboardStatsDto.prototype, "totalStudents", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5, description: 'Total number of system administrators' }),
    __metadata("design:type", Number)
], DashboardStatsDto.prototype, "totalAdmins", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 45, description: 'Total number of driving school managers' }),
    __metadata("design:type", Number)
], DashboardStatsDto.prototype, "totalManagers", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 87, description: 'Number of currently active courses' }),
    __metadata("design:type", Number)
], DashboardStatsDto.prototype, "activeCourses", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 156, description: 'Number of completed exams this month' }),
    __metadata("design:type", Number)
], DashboardStatsDto.prototype, "completedExams", void 0);
class RecentActivityDto {
}
exports.RecentActivityDto = RecentActivityDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Activity ID' }),
    __metadata("design:type", Number)
], RecentActivityDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'student', description: 'Type of activity (student, exam, etc.)' }),
    __metadata("design:type", String)
], RecentActivityDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'John Doe', description: 'User who performed the action' }),
    __metadata("design:type", String)
], RecentActivityDto.prototype, "user", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-15T10:30:00Z', description: 'ISO date when activity occurred' }),
    __metadata("design:type", String)
], RecentActivityDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Student completed driving theory exam', description: 'Activity description' }),
    __metadata("design:type", String)
], RecentActivityDto.prototype, "description", void 0);
class DashboardResponseDto {
}
exports.DashboardResponseDto = DashboardResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: DashboardStatsDto, description: 'Dashboard statistics' }),
    __metadata("design:type", DashboardStatsDto)
], DashboardResponseDto.prototype, "stats", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [RecentActivityDto], description: 'List of recent activities' }),
    __metadata("design:type", Array)
], DashboardResponseDto.prototype, "recentActivities", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Request success status' }),
    __metadata("design:type", Boolean)
], DashboardResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-15T10:30:00Z', description: 'Response timestamp' }),
    __metadata("design:type", String)
], DashboardResponseDto.prototype, "timestamp", void 0);
class SystemServiceDto {
}
exports.SystemServiceDto = SystemServiceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Database', description: 'Service name' }),
    __metadata("design:type", String)
], SystemServiceDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'RUNNING',
        enum: ['RUNNING', 'DOWN', 'UNKNOWN'],
        description: 'Service status'
    }),
    __metadata("design:type", String)
], SystemServiceDto.prototype, "status", void 0);
class SystemCPUDto {
}
exports.SystemCPUDto = SystemCPUDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 45.2, description: 'CPU usage percentage' }),
    __metadata("design:type", Number)
], SystemCPUDto.prototype, "usage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 65, description: 'CPU temperature in Celsius', required: false }),
    __metadata("design:type", Number)
], SystemCPUDto.prototype, "temperature", void 0);
class SystemMemoryDto {
}
exports.SystemMemoryDto = SystemMemoryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 8589934592, description: 'Used memory in bytes' }),
    __metadata("design:type", Number)
], SystemMemoryDto.prototype, "used", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 17179869184, description: 'Total memory in bytes' }),
    __metadata("design:type", Number)
], SystemMemoryDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 50.0, description: 'Memory usage percentage' }),
    __metadata("design:type", Number)
], SystemMemoryDto.prototype, "usage", void 0);
class SystemDiskDto {
}
exports.SystemDiskDto = SystemDiskDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 214748364800, description: 'Used disk space in bytes' }),
    __metadata("design:type", Number)
], SystemDiskDto.prototype, "used", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1099511627776, description: 'Total disk space in bytes' }),
    __metadata("design:type", Number)
], SystemDiskDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 19.5, description: 'Disk usage percentage' }),
    __metadata("design:type", Number)
], SystemDiskDto.prototype, "usage", void 0);
class SystemInfoResponseDto {
}
exports.SystemInfoResponseDto = SystemInfoResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: SystemCPUDto, description: 'CPU information' }),
    __metadata("design:type", SystemCPUDto)
], SystemInfoResponseDto.prototype, "cpu", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: SystemMemoryDto, description: 'Memory information' }),
    __metadata("design:type", SystemMemoryDto)
], SystemInfoResponseDto.prototype, "memory", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: SystemDiskDto, description: 'Disk information' }),
    __metadata("design:type", SystemDiskDto)
], SystemInfoResponseDto.prototype, "disk", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [SystemServiceDto], description: 'Services status' }),
    __metadata("design:type", Array)
], SystemInfoResponseDto.prototype, "services", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Request success status' }),
    __metadata("design:type", Boolean)
], SystemInfoResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-15T10:30:00Z', description: 'Response timestamp' }),
    __metadata("design:type", String)
], SystemInfoResponseDto.prototype, "timestamp", void 0);
//# sourceMappingURL=dashboard-response.dto.js.map