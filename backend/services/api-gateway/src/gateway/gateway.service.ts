import { Injectable } from '@nestjs/common';

@Injectable()
export class GatewayService {
  getStatus() {
    return {
      status: 'ok',
      message: 'API Gateway is running',
      timestamp: new Date().toISOString(),
      services: {
        'api-server': 'http://localhost:3001',
        'file-service': 'http://localhost:3002',
        'worker-service': 'http://localhost:3003',
        'database-service': 'Available'
      }
    };
  }

  getVersion() {
    return {
      name: '@surucukursu/api-gateway',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
}