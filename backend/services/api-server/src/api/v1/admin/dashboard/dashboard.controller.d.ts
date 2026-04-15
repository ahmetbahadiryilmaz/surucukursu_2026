import { DashboardService } from './dashboard.service';
import { DashboardResponse } from './dashboard.types';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getDashboardData(): Promise<DashboardResponse>;
}
