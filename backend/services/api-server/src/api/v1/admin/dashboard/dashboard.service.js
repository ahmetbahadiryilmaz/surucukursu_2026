"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const si = require("systeminformation");
const net_1 = require("net");
const dashboard_types_1 = require("./dashboard.types");
const dashboard_consts_1 = require("./dashboard.consts");
let DashboardService = class DashboardService {
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + units[i];
    }
    checkPort(host, port, timeout = dashboard_consts_1.TIMEOUTS.PORT_CHECK) {
        return new Promise((resolve) => {
            const socket = new net_1.default.Socket();
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
    async getRAMInfo() {
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
        }
        catch (error) {
            console.error('Error getting RAM info:', error);
            return {
                total: 'N/A',
                used: 'N/A',
                free: 'N/A',
                usagePercentage: 0
            };
        }
    }
    async getCPUInfo() {
        try {
            const [cpuInfo, currentLoad] = await Promise.all([
                si.cpu(),
                si.currentLoad()
            ]);
            return {
                cores: cpuInfo.cores,
                usage: Math.round(currentLoad.currentLoad || 0)
            };
        }
        catch (error) {
            console.error('Error getting CPU info:', error);
            return {
                cores: 1,
                usage: 0
            };
        }
    }
    async getDiskInfo() {
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
                    name: 'Primary Disk',
                    total: 'N/A',
                    used: 'N/A',
                    free: 'N/A',
                    usagePercentage: 0
                }];
        }
        catch (error) {
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
    async checkRedis(port) {
        try {
            return await this.checkPort('localhost', port);
        }
        catch (_a) {
            return false;
        }
    }
    async checkRabbitMQ(port) {
        try {
            return await this.checkPort('localhost', port);
        }
        catch (_a) {
            return false;
        }
    }
    async checkDatabase(port) {
        return await this.checkPort('localhost', port);
    }
    async getSystemInfo() {
        try {
            const dbPort = parseInt(process.env.DB_PORT || dashboard_consts_1.DEFAULT_PORTS.DB_PORT.toString());
            const redisPort = parseInt(process.env.REDIS_PORT || dashboard_consts_1.DEFAULT_PORTS.REDIS_PORT.toString());
            const rabbitmqPort = parseInt(process.env.RABBITMQ_PORT || dashboard_consts_1.DEFAULT_PORTS.RABBITMQ_PORT.toString());
            const backendPort = parseInt(process.env.PORT || dashboard_consts_1.DEFAULT_PORTS.BACKEND_PORT.toString());
            const frontendPort = dashboard_consts_1.DEFAULT_PORTS.FRONTEND_PORT;
            const [ramInfo, cpuInfo, diskInfo] = await Promise.allSettled([
                this.getRAMInfo().catch(() => ({ total: 'N/A', used: 'N/A', free: 'N/A', usagePercentage: 0 })),
                this.getCPUInfo().catch(() => ({ cores: 1, usage: 0 })),
                this.getDiskInfo().catch(() => [{ name: 'Primary Disk', total: 'N/A', used: 'N/A', free: 'N/A', usagePercentage: 0 }])
            ]);
            const [backendStatus, databaseStatus, rabbitmqStatus, redisStatus, frontendStatus] = await Promise.allSettled([
                this.checkPort('localhost', backendPort).catch(() => false),
                this.checkDatabase(dbPort).catch(() => false),
                this.checkRabbitMQ(rabbitmqPort).catch(() => false),
                this.checkRedis(redisPort).catch(() => false),
                this.checkPort('localhost', frontendPort).catch(() => false)
            ]);
            const services = {
                [dashboard_types_1.ServiceType.BACKEND]: {
                    status: (backendStatus.status === 'fulfilled' && backendStatus.value) ? dashboard_types_1.ServiceStatus.RUNNING : dashboard_types_1.ServiceStatus.DOWN,
                    port: backendPort
                },
                [dashboard_types_1.ServiceType.DATABASE]: {
                    status: (databaseStatus.status === 'fulfilled' && databaseStatus.value) ? dashboard_types_1.ServiceStatus.RUNNING : dashboard_types_1.ServiceStatus.DOWN,
                    port: dbPort
                },
                [dashboard_types_1.ServiceType.RABBITMQ]: {
                    status: (rabbitmqStatus.status === 'fulfilled' && rabbitmqStatus.value) ? dashboard_types_1.ServiceStatus.RUNNING : dashboard_types_1.ServiceStatus.DOWN,
                    port: rabbitmqPort
                },
                [dashboard_types_1.ServiceType.REDIS]: {
                    status: (redisStatus.status === 'fulfilled' && redisStatus.value) ? dashboard_types_1.ServiceStatus.RUNNING : dashboard_types_1.ServiceStatus.DOWN,
                    port: redisPort
                },
                [dashboard_types_1.ServiceType.FRONTEND]: {
                    status: (frontendStatus.status === 'fulfilled' && frontendStatus.value) ? dashboard_types_1.ServiceStatus.RUNNING : dashboard_types_1.ServiceStatus.DOWN,
                    port: frontendPort
                }
            };
            return {
                ram: ramInfo.status === 'fulfilled' ? ramInfo.value : { total: 'N/A', used: 'N/A', free: 'N/A', usagePercentage: 0 },
                cpu: cpuInfo.status === 'fulfilled' ? cpuInfo.value : { cores: 1, usage: 0 },
                disks: diskInfo.status === 'fulfilled' ? diskInfo.value : [{ name: 'Primary Disk', total: 'N/A', used: 'N/A', free: 'N/A', usagePercentage: 0 }],
                services
            };
        }
        catch (error) {
            console.error('Error in getSystemInfo:', error);
            return {
                ram: { total: 'N/A', used: 'N/A', free: 'N/A', usagePercentage: 0 },
                cpu: { cores: 1, usage: 0 },
                disks: [{ name: 'Primary Disk', total: 'N/A', used: 'N/A', free: 'N/A', usagePercentage: 0 }],
                services: {
                    [dashboard_types_1.ServiceType.BACKEND]: { status: dashboard_types_1.ServiceStatus.DOWN, port: 3000 },
                    [dashboard_types_1.ServiceType.DATABASE]: { status: dashboard_types_1.ServiceStatus.DOWN, port: 5432 },
                    [dashboard_types_1.ServiceType.RABBITMQ]: { status: dashboard_types_1.ServiceStatus.DOWN, port: 5672 },
                    [dashboard_types_1.ServiceType.REDIS]: { status: dashboard_types_1.ServiceStatus.DOWN, port: 6379 },
                    [dashboard_types_1.ServiceType.FRONTEND]: { status: dashboard_types_1.ServiceStatus.DOWN, port: 5173 }
                }
            };
        }
    }
    async getDashboardData() {
        const stats = {
            studentCount: 145,
            activeStudents: 128,
            carCount: 12,
            lastLogin: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        };
        const recentActivities = [
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
        return {
            stats,
            recentActivities,
            systemInfo
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)()
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map