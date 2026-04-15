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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const students_service_1 = require("../students/students.service");
const cars_service_1 = require("../cars/cars.service");
let DashboardService = class DashboardService {
    constructor(studentsService, carsService) {
        this.studentsService = studentsService;
        this.carsService = carsService;
    }
    async getDashboardData(code) {
        try {
            const students = await this.studentsService.getStudents(code);
            const cars = await this.carsService.getCars(code);
            const activeStudents = Math.floor(students.length * 0.85);
            const stats = {
                studentCount: students.length,
                activeStudents: activeStudents,
                carCount: cars.length,
                lastLogin: new Date(Date.now() - 30 * 60 * 1000).toISOString()
            };
            const recentActivities = [
                {
                    id: 1,
                    type: 'student',
                    user: 'Yeni Öğrenci',
                    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    description: 'Yeni öğrenci kaydı yapıldı'
                },
                {
                    id: 2,
                    type: 'exam',
                    user: 'Sınav Sistemi',
                    date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                    description: 'Sınav sonuçları güncellendi'
                }
            ];
            const dashboardData = {
                stats,
                recentActivities,
            };
            return {
                success: true,
                data: dashboardData,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                success: false,
                error: 'Failed to retrieve dashboard data',
                timestamp: new Date().toISOString()
            };
        }
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [students_service_1.StudentsService,
        cars_service_1.CarsService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map