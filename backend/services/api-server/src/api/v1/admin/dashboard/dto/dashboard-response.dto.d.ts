export declare class DashboardStatsDto {
    totalDrivingSchools: number;
    totalStudents: number;
    totalAdmins: number;
    totalManagers: number;
    activeCourses: number;
    completedExams: number;
}
export declare class RecentActivityDto {
    id: number;
    type: string;
    user: string;
    date: string;
    description: string;
}
export declare class DashboardResponseDto {
    stats: DashboardStatsDto;
    recentActivities: RecentActivityDto[];
    success: boolean;
    timestamp: string;
}
export declare class SystemServiceDto {
    name: string;
    status: 'RUNNING' | 'DOWN' | 'UNKNOWN';
}
export declare class SystemCPUDto {
    usage: number;
    temperature?: number;
}
export declare class SystemMemoryDto {
    used: number;
    total: number;
    usage: number;
}
export declare class SystemDiskDto {
    used: number;
    total: number;
    usage: number;
}
export declare class SystemInfoResponseDto {
    cpu: SystemCPUDto;
    memory: SystemMemoryDto;
    disk: SystemDiskDto;
    services: SystemServiceDto[];
    success: boolean;
    timestamp: string;
}
