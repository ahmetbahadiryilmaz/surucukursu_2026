import { Injectable } from '@nestjs/common';
import {
  DashboardStats,
  RecentActivity,
  DashboardData,
  DashboardResponse
} from '../../admin/dashboard';
import { StudentsService } from '../students/students.service';
import { CarsService } from '../cars/cars.service';

@Injectable()
export class DashboardService {
    constructor(
        private readonly studentsService: StudentsService,
        private readonly carsService: CarsService,
    ) {}

    async getDashboardData(code: string): Promise<DashboardResponse> {
        try {
            const students = await this.studentsService.getStudents(code);
            const cars = await this.carsService.getCars(code);

            // Calculate active students (mock calculation - you can implement real logic)
            const activeStudents = Math.floor(students.length * 0.85); // Assume 85% are active

            const stats: DashboardStats = {
                studentCount: students.length,
                activeStudents: activeStudents,
                carCount: cars.length,
                lastLogin: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
            };

            // Mock recent activities - you can replace with real data from database
            const recentActivities: RecentActivity[] = [
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

            const dashboardData: DashboardData = {
                stats,
                recentActivities,
            };

            return {
                success: true,
                data: dashboardData,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                error: 'Failed to retrieve dashboard data',
                timestamp: new Date().toISOString()
            };
        }
    }
}