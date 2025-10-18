export enum ServiceStatus {
  RUNNING = 'running',
  DOWN = 'down',
  UNKNOWN = 'unknown'
}

export enum ServiceType {
  BACKEND = 'backend',
  DATABASE = 'database',
  RABBITMQ = 'rabbitmq',
  REDIS = 'redis',
  FRONTEND = 'frontend'
}

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

export interface SystemInfoResponse {
  success: boolean;
  data?: SystemInfo;
  error?: string;
  timestamp: string;
}
