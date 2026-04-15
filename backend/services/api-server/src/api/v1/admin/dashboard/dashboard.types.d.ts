import { ServiceStatus, ServiceType, SystemInfo, SystemInfoResponse, SystemRAMInfo, SystemCPUInfo, SystemDiskInfo, ServiceInfo, SystemServicesInfo } from '../../../../common/types/system.types';
export interface DashboardStats {
    studentCount: number;
    activeStudents: number;
    carCount: number;
    lastLogin: string;
}
export interface RecentActivity {
    id: number;
    type: string;
    user: string;
    date: string;
    description: string;
}
export interface DashboardData {
    stats: DashboardStats;
    recentActivities: RecentActivity[];
    systemInfo?: SystemInfo;
}
export interface DashboardResponse {
    success: boolean;
    data?: DashboardData;
    error?: string;
    timestamp: string;
}
export { ServiceStatus, ServiceType, SystemInfo, SystemInfoResponse, SystemRAMInfo, SystemCPUInfo, SystemDiskInfo, ServiceInfo, SystemServicesInfo };
