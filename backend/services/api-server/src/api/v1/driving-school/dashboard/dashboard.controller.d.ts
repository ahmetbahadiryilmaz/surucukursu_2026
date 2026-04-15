import { DashboardService } from './dashboard.service';
import { DashboardResponse } from '../../admin/dashboard';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getDashboardData(code: string): Promise<DashboardResponse>;
}
