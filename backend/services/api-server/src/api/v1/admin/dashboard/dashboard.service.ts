import { Injectable } from '@nestjs/common';
import * as si from 'systeminformation';
import net from 'net';
import { env } from '@surucukursu/shared';
import {
  DashboardStats,
  RecentActivity,
  DashboardData,
  SystemInfo,
  SystemRAMInfo,
  SystemCPUInfo,
  SystemDiskInfo,
  ServiceStatus,
  ServiceType,
  SystemServicesInfo,
  ServiceInfo
} from './dashboard.types';
import { DEFAULT_PORTS, TIMEOUTS } from './dashboard.consts';

interface ServiceDefinition {
  type: ServiceType;
  name: string;
  host: string;
  port: number;
}

@Injectable()
export class DashboardService {
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + units[i];
  }

  private checkPort(host: string, port: number, timeout: number = TIMEOUTS.PORT_CHECK): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let settled = false;
      const finish = (result: boolean) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve(result);
      };

      socket.setTimeout(timeout);
      socket.once('connect', () => finish(true));
      socket.once('timeout', () => finish(false));
      socket.once('error', () => finish(false));
      socket.connect(port, host);
    });
  }

  private async getRAMInfo(): Promise<SystemRAMInfo> {
    try {
      const memInfo = await si.mem();
      const totalMem = memInfo.total;
      const availableMem = memInfo.available;
      const usedMem = totalMem - availableMem;

      return {
        total: this.formatBytes(totalMem),
        used: this.formatBytes(usedMem),
        free: this.formatBytes(availableMem),
        usagePercentage: Math.round((usedMem / totalMem) * 100)
      };
    } catch (error) {
      console.error('Error getting RAM info:', error);
      return { total: 'N/A', used: 'N/A', free: 'N/A', usagePercentage: 0 };
    }
  }

  private async getCPUInfo(): Promise<SystemCPUInfo> {
    try {
      const [cpuInfo, currentLoad] = await Promise.all([si.cpu(), si.currentLoad()]);
      return { cores: cpuInfo.cores, usage: Math.round(currentLoad.currentLoad || 0) };
    } catch (error) {
      console.error('Error getting CPU info:', error);
      return { cores: 1, usage: 0 };
    }
  }

  private async getDiskInfo(): Promise<SystemDiskInfo[]> {
    try {
      const fsSize = await si.fsSize();
      const disks = fsSize
        .filter(disk => disk.size > 1024 * 1024 * 1024)
        .map((disk, index) => {
          const usedSpace = disk.used;
          const totalSpace = disk.size;
          const freeSpace = totalSpace - usedSpace;
          const usagePercentage = totalSpace > 0 ? Math.round((usedSpace / totalSpace) * 100) : 0;

          let diskName = disk.fs;
          if (diskName.length > 20) {
            diskName = `Disk ${index + 1}`;
          }

          return {
            name: diskName,
            total: this.formatBytes(totalSpace),
            used: this.formatBytes(usedSpace),
            free: this.formatBytes(freeSpace),
            usagePercentage
          };
        });

      return disks.length > 0 ? disks : [{
        name: 'Primary Disk', total: 'N/A', used: 'N/A', free: 'N/A', usagePercentage: 0
      }];
    } catch (error) {
      console.error('Error getting disk info:', error);
      return [{ name: 'Primary Disk', total: 'N/A', used: 'N/A', free: 'N/A', usagePercentage: 0 }];
    }
  }

  private buildServiceDefinitions(): ServiceDefinition[] {
    const local = '127.0.0.1';
    const intEnv = (key: string, fallback: number) => {
      const v = process.env[key];
      const parsed = v ? parseInt(v, 10) : NaN;
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    return [
      {
        type: ServiceType.API_GATEWAY,
        name: 'API Gateway',
        host: local,
        port: env.services.apiGateway.port || DEFAULT_PORTS.API_GATEWAY,
      },
      {
        type: ServiceType.API_SERVER,
        name: 'API Server',
        host: local,
        port: env.services.apiServer.port || DEFAULT_PORTS.API_SERVER,
      },
      {
        type: ServiceType.FILE_SERVER,
        name: 'File Server',
        host: local,
        port: env.services.fileService.port || DEFAULT_PORTS.FILE_SERVER,
      },
      {
        type: ServiceType.MEBBIS_SERVICE,
        name: 'MEBBIS Service',
        host: local,
        port: intEnv('MEBBIS_SERVICE_PORT', DEFAULT_PORTS.MEBBIS_SERVICE),
      },
      {
        type: ServiceType.DESKTOP_SERVICE,
        name: 'Desktop Service',
        host: local,
        port: env.services.desktopService.port || DEFAULT_PORTS.DESKTOP_SERVICE,
      },
      {
        type: ServiceType.DATABASE,
        name: 'Database (MySQL)',
        host: this.normalizeHost(env.database.host) || local,
        port: env.database.port || DEFAULT_PORTS.DB,
      },
      {
        type: ServiceType.RABBITMQ,
        name: 'RabbitMQ',
        host: this.normalizeHost(env.rabbitmq.host) || local,
        port: env.rabbitmq.port || DEFAULT_PORTS.RABBITMQ,
      },
    ];
  }

  private normalizeHost(host: string | undefined): string {
    if (!host) return '';
    return host.toLowerCase() === 'localhost' ? '127.0.0.1' : host;
  }

  private buildServicesMap(definitions: ServiceDefinition[], statuses: boolean[]): SystemServicesInfo {
    return definitions.reduce((acc, def, idx) => {
      acc[def.type] = {
        name: def.name,
        host: def.host,
        port: def.port,
        status: statuses[idx] ? ServiceStatus.RUNNING : ServiceStatus.DOWN,
      };
      return acc;
    }, {} as SystemServicesInfo);
  }

  async getSystemInfo(): Promise<SystemInfo> {
    const definitions = this.buildServiceDefinitions();

    try {
      const [ramInfo, cpuInfo, diskInfo] = await Promise.allSettled([
        this.getRAMInfo(),
        this.getCPUInfo(),
        this.getDiskInfo(),
      ]);

      const statuses = await Promise.all(
        definitions.map(d => this.checkPort(d.host, d.port).catch(() => false))
      );

      return {
        ram: ramInfo.status === 'fulfilled' ? ramInfo.value : { total: 'N/A', used: 'N/A', free: 'N/A', usagePercentage: 0 },
        cpu: cpuInfo.status === 'fulfilled' ? cpuInfo.value : { cores: 1, usage: 0 },
        disks: diskInfo.status === 'fulfilled' ? diskInfo.value : [{ name: 'Primary Disk', total: 'N/A', used: 'N/A', free: 'N/A', usagePercentage: 0 }],
        services: this.buildServicesMap(definitions, statuses),
      };
    } catch (error) {
      console.error('Error in getSystemInfo:', error);
      return {
        ram: { total: 'N/A', used: 'N/A', free: 'N/A', usagePercentage: 0 },
        cpu: { cores: 1, usage: 0 },
        disks: [{ name: 'Primary Disk', total: 'N/A', used: 'N/A', free: 'N/A', usagePercentage: 0 }],
        services: this.buildServicesMap(definitions, definitions.map(() => false)),
      };
    }
  }

  async getDashboardData(): Promise<DashboardData> {
    const stats: DashboardStats = {
      studentCount: 145,
      activeStudents: 128,
      carCount: 12,
      lastLogin: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    };

    const recentActivities: RecentActivity[] = [
      {
        id: 1,
        type: 'login',
        user: 'Ahmet Yılmaz',
        date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        description: 'Sistem girişi yapıldı'
      },
      {
        id: 2,
        type: 'student',
        user: 'Mehmet Demir',
        date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        description: 'Yeni öğrenci kaydı yapıldı'
      },
      {
        id: 3,
        type: 'download',
        user: 'Fatma Kaya',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Öğrenci raporu indirildi'
      },
      {
        id: 4,
        type: 'exam',
        user: 'Sistem',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Sınav sonuçları güncellendi'
      }
    ];

    const systemInfo = await this.getSystemInfo();

    return { stats, recentActivities, systemInfo };
  }
}
