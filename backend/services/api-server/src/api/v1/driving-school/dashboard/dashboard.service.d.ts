import { DashboardResponse } from '../../admin/dashboard';
import { StudentsService } from '../students/students.service';
import { CarsService } from '../cars/cars.service';
export declare class DashboardService {
    private readonly studentsService;
    private readonly carsService;
    constructor(studentsService: StudentsService, carsService: CarsService);
    getDashboardData(code: string): Promise<DashboardResponse>;
}
