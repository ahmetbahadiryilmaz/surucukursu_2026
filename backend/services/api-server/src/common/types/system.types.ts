export enum ServiceStatus {
  RUNNING = 'running',
  DOWN = 'down',
  UNKNOWN = 'unknown'
}

export enum ServiceType {
  API_GATEWAY = 'apiGateway',
  API_SERVER = 'apiServer',
  FILE_SERVER = 'fileServer',
  MEBBIS_SERVICE = 'mebbisService',
  DESKTOP_SERVICE = 'desktopService',
  FRONTEND = 'frontend',
  DATABASE = 'database',
  RABBITMQ = 'rabbitmq'
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
  name: string;
  host: string;
  port: number;
  status: ServiceStatus;
}

export type SystemServicesInfo = Record<ServiceType, ServiceInfo>;

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
