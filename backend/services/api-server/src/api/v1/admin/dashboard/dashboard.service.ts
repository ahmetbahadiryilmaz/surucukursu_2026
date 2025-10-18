import { Injectable } from '@nestjs/common';
import * as si from 'systeminformation';
import net from 'net';
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
  SystemServicesInfo
} from './dashboard.types';
import { DEFAULT_PORTS, TIMEOUTS } from './dashboard.consts';

@Injectable()
export class DashboardService {
  // Helper function to format bytes
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + units[i];
  }

  // Helper function to check if port is open
  private checkPort(host: string, port: number, timeout: number = TIMEOUTS.PORT_CHECK): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      
      socket.setTimeout(timeout);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.connect(port, host);
    });
  }

  // Get RAM information using systeminformation
  private async getRAMInfo(): Promise<SystemRAMInfo> {
    try {
      const memInfo = await si.mem();
      const totalMem = memInfo.total;
      const availableMem = memInfo.available; // This includes cached/buffered memory
      const usedMem = totalMem - availableMem;
      
      return {
        total: this.formatBytes(totalMem),
        used: this.formatBytes(usedMem),
        free: this.formatBytes(availableMem),
        usagePercentage: Math.round((usedMem / totalMem) * 100)
      };
    } catch (error) {
      console.error('Error getting RAM info:', error);
      return {
        total: 'N/A',
        used: 'N/A',
        free: 'N/A',
        usagePercentage: 0
      };
    }
  }

  // Get CPU information using systeminformation
  private async getCPUInfo(): Promise<SystemCPUInfo> {
    try {
      const [cpuInfo, currentLoad] = await Promise.all([
        si.cpu(),
        si.currentLoad()
      ]);
      
      return {
        cores: cpuInfo.cores,
        usage: Math.round(currentLoad.currentLoad || 0)
      };
    } catch (error) {
      console.error('Error getting CPU info:', error);
      return {
        cores: 1,
        usage: 0
      };
    }
  }

  // Get disk information using systeminformation
  private async getDiskInfo(): Promise<SystemDiskInfo[]> {
    try {
      const fsSize = await si.fsSize();
      
      // Filter out small disks (less than 1GB) and map to our format
      const disks = fsSize
        .filter(disk => disk.size > 1024 * 1024 * 1024) // Filter disks smaller than 1GB
        .map((disk, index) => {
          const usedSpace = disk.used;
          const totalSpace = disk.size;
          const freeSpace = totalSpace - usedSpace;
          const usagePercentage = totalSpace > 0 ? Math.round((usedSpace / totalSpace) * 100) : 0;
          
          // Simplify disk names
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
        name: 'Primary Disk',
        total: 'N/A',
        used: 'N/A',
        free: 'N/A',
        usagePercentage: 0
      }];
    } catch (error) {
      console.error('Error getting disk info:', error);
      return [{
        name: 'Primary Disk',
        total: 'N/A',
        used: 'N/A',
        free: 'N/A',
        usagePercentage: 0
      }];
    }
  }

  // Check Redis connection
  private async checkRedis(port: number): Promise<boolean> {
    try {
      return await this.checkPort('localhost', port);
    } catch {
      return false;
    }
  }

  // Check RabbitMQ connection
  private async checkRabbitMQ(port: number): Promise<boolean> {
    try {
      return await this.checkPort('localhost', port);
    } catch {
      return false;
    }
  }

  // Check database connection (assuming PostgreSQL/MySQL)
  private async checkDatabase(port: number): Promise<boolean> {
    return await this.checkPort('localhost', port);
  }

  // Public method to get system information
  async getSystemInfo(): Promise<SystemInfo> {
    try {
      // Get environment variables for ports
      const dbPort = parseInt(process.env.DB_PORT || DEFAULT_PORTS.DB_PORT.toString());
      const redisPort = parseInt(process.env.REDIS_PORT || DEFAULT_PORTS.REDIS_PORT.toString());
      const rabbitmqPort = parseInt(process.env.RABBITMQ_PORT || DEFAULT_PORTS.RABBITMQ_PORT.toString());
      const backendPort = parseInt(process.env.PORT || DEFAULT_PORTS.BACKEND_PORT.toString());
      const frontendPort = DEFAULT_PORTS.FRONTEND_PORT;

      // Get system information with error handling
      const [ramInfo, cpuInfo, diskInfo] = await Promise.allSettled([
        this.getRAMInfo().catch(() => ({ total: 'N/A', used: 'N/A', free: 'N/A', usagePercentage: 0 })),
        this.getCPUInfo().catch(() => ({ cores: 1, usage: 0 })),
        this.getDiskInfo().catch(() => [{ name: 'Primary Disk', total: 'N/A', used: 'N/A', free: 'N/A', usagePercentage: 0 }])
      ]);

      // Check services with error handling
      const [
        backendStatus,
        databaseStatus,
        rabbitmqStatus,
        redisStatus,
        frontendStatus
      ] = await Promise.allSettled([
        this.checkPort('localhost', backendPort).catch(() => false),
        this.checkDatabase(dbPort).catch(() => false),
        this.checkRabbitMQ(rabbitmqPort).catch(() => false),
        this.checkRedis(redisPort).catch(() => false),
        this.checkPort('localhost', frontendPort).catch(() => false)
      ]);

      const services: SystemServicesInfo = {
        [ServiceType.BACKEND]: {
          status: (backendStatus.status === 'fulfilled' && backendStatus.value) ? ServiceStatus.RUNNING : ServiceStatus.DOWN,
          port: backendPort
        },
        [ServiceType.DATABASE]: {
          status: (databaseStatus.status === 'fulfilled' && databaseStatus.value) ? ServiceStatus.RUNNING : ServiceStatus.DOWN,
          port: dbPort
        },
        [ServiceType.RABBITMQ]: {
          status: (rabbitmqStatus.status === 'fulfilled' && rabbitmqStatus.value) ? ServiceStatus.RUNNING : ServiceStatus.DOWN,
          port: rabbitmqPort
        },
        [ServiceType.REDIS]: {
          status: (redisStatus.status === 'fulfilled' && redisStatus.value) ? ServiceStatus.RUNNING : ServiceStatus.DOWN,
          port: redisPort
        },
        [ServiceType.FRONTEND]: {
          status: (frontendStatus.status === 'fulfilled' && frontendStatus.value) ? ServiceStatus.RUNNING : ServiceStatus.DOWN,
          port: frontendPort
        }
      };

      return {
        ram: ramInfo.status === 'fulfilled' ? ramInfo.value : { total: 'N/A', used: 'N/A', free: 'N/A', usagePercentage: 0 },
        cpu: cpuInfo.status === 'fulfilled' ? cpuInfo.value : { cores: 1, usage: 0 },
        disks: diskInfo.status === 'fulfilled' ? diskInfo.value : [{ name: 'Primary Disk', total: 'N/A', used: 'N/A', free: 'N/A', usagePercentage: 0 }],
        services
      };
    } catch (error) {
      console.error('Error in getSystemInfo:', error);
      // Return fallback data
      return {
        ram: { total: 'N/A', used: 'N/A', free: 'N/A', usagePercentage: 0 },
        cpu: { cores: 1, usage: 0 },
        disks: [{ name: 'Primary Disk', total: 'N/A', used: 'N/A', free: 'N/A', usagePercentage: 0 }],
        services: {
          [ServiceType.BACKEND]: { status: ServiceStatus.DOWN, port: 3000 },
          [ServiceType.DATABASE]: { status: ServiceStatus.DOWN, port: 5432 },
          [ServiceType.RABBITMQ]: { status: ServiceStatus.DOWN, port: 5672 },
          [ServiceType.REDIS]: { status: ServiceStatus.DOWN, port: 6379 },
          [ServiceType.FRONTEND]: { status: ServiceStatus.DOWN, port: 5173 }
        }
      };
    }
  }

  // Public method to get dashboard data
  async getDashboardData(): Promise<DashboardData> {
    // Mocked data - replace with real data fetching logic from database
    const stats: DashboardStats = {
      studentCount: 145,
      activeStudents: 128,
      carCount: 12,
      lastLogin: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
    };

    const recentActivities: RecentActivity[] = [
      {
        id: 1,
        type: 'login',
        user: 'Ahmet Yılmaz',
        date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        description: 'Sistem girişi yapıldı'
      },
      {
        id: 2,
        type: 'student',
        user: 'Mehmet Demir',
        date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
        description: 'Yeni öğrenci kaydı yapıldı'
      },
      {
        id: 3,
        type: 'download',
        user: 'Fatma Kaya',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        description: 'Öğrenci raporu indirildi'
      },
      {
        id: 4,
        type: 'exam',
        user: 'Sistem',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        description: 'Sınav sonuçları güncellendi'
      }
    ];

    // Get system information
    const systemInfo = await this.getSystemInfo();

    return {
      stats,
      recentActivities,
      systemInfo
    };
  }
}