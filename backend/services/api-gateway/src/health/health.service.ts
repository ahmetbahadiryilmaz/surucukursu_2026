import { Injectable, Logger } from '@nestjs/common';
import { ProxyService } from '../proxy/proxy.service';

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  error?: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: ServiceHealth[];
  gateway: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    version: string;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly proxyService: ProxyService) {}

  async checkSystemHealth(): Promise<SystemHealth> {
    const services = this.proxyService.getServices();
    const serviceHealthChecks: ServiceHealth[] = [];

    // Check each service health
    for (const [key, config] of Object.entries(services)) {
      const startTime = Date.now();
      try {
        const isHealthy = await this.proxyService.healthCheck(key);
        const responseTime = Date.now() - startTime;
        
        serviceHealthChecks.push({
          name: config.name,
          status: isHealthy ? 'healthy' : 'unhealthy',
          responseTime
        });
      } catch (error) {
        serviceHealthChecks.push({
          name: config.name,
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: error.message
        });
      }
    }

    // Determine overall system status
    const healthyServices = serviceHealthChecks.filter(s => s.status === 'healthy').length;
    const totalServices = serviceHealthChecks.length;
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyServices === totalServices) {
      overallStatus = 'healthy';
    } else if (healthyServices > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: serviceHealthChecks,
      gateway: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0'
      }
    };
  }

  async checkServiceHealth(serviceName: string): Promise<ServiceHealth> {
    const services = this.proxyService.getServices();
    const service = services[serviceName];
    
    if (!service) {
      return {
        name: serviceName,
        status: 'unknown',
        error: 'Service not found'
      };
    }

    const startTime = Date.now();
    try {
      const isHealthy = await this.proxyService.healthCheck(serviceName);
      const responseTime = Date.now() - startTime;
      
      return {
        name: service.name,
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime
      };
    } catch (error) {
      return {
        name: service.name,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }
}