import { DashboardData, SystemInfo } from './dashboard.types';
export declare class DashboardService {
    private formatBytes;
    private checkPort;
    private getRAMInfo;
    private getCPUInfo;
    private getDiskInfo;
    private checkRedis;
    private checkRabbitMQ;
    private checkDatabase;
    getSystemInfo(): Promise<SystemInfo>;
    getDashboardData(): Promise<DashboardData>;
}
