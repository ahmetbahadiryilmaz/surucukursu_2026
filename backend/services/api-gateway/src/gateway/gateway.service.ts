import { Injectable } from '@nestjs/common';
import { env } from '@surucukursu/shared';

@Injectable()
export class GatewayService {
  getStatus() {
    return {
      status: 'ok',
      message: 'API Gateway is running',
      timestamp: new Date().toISOString(),
      services: {
        'api-server': `http://localhost:${env.services.apiServer.port}`,
        'file-service': `http://localhost:${env.services.fileService.port}`,
        'worker-service': `http://localhost:${env.services.workerService.port}`,
        'database-service': `http://localhost:${env.services.databaseService.port}`
      }
    };
  }

  getVersion() {
    return {
      name: '@surucukursu/api-gateway',
      version: '1.0.0',
      environment: env.app.nodeEnv,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
}