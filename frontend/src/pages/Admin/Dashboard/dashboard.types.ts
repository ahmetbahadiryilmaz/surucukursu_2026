// Dashboard Stats interfaces
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

// System Information interfaces
export interface SystemRAMInfo {
  total: string;
  used: string;
  free: string;
  usagePercentage: number;
}

export interface SystemCPUInfo {
  cores: number;
  usage: number;
}

export interface SystemDiskInfo {
  name: string;
  total: string;
  used: string;
  free: string;
  usagePercentage: number;
}

export enum ServiceStatus {
  RUNNING = 'RUNNING',
  DOWN = 'DOWN',
  UNKNOWN = 'UNKNOWN'
}

export enum ServiceType {
  BACKEND = 'backend',
  DATABASE = 'database',
  RABBITMQ = 'rabbitmq',
  REDIS = 'redis',
  FRONTEND = 'frontend'
}

export interface ServiceInfo {
  status: ServiceStatus;
  port: number;
}

export interface SystemServicesInfo {
  [ServiceType.BACKEND]: ServiceInfo;
  [ServiceType.DATABASE]: ServiceInfo;
  [ServiceType.RABBITMQ]: ServiceInfo;
  [ServiceType.REDIS]: ServiceInfo;
  [ServiceType.FRONTEND]: ServiceInfo;
}

export interface SystemInfo {
  ram: SystemRAMInfo;
  cpu: SystemCPUInfo;
  disks: SystemDiskInfo[];
  services: SystemServicesInfo;
}

export interface DashboardData {
  stats: DashboardStats;
  recentActivities: RecentActivity[];
  systemInfo: SystemInfo;
}

export interface DashboardResponse {
  success: boolean;
  data?: DashboardData;
  error?: string;
  timestamp: string;
}
