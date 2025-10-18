import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';

export interface ServiceConfig {
  name: string;
  baseUrl: string;
  timeout: number;
  retries: number;
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  
  private readonly services: Record<string, ServiceConfig> = {
    'api': {
      name: 'API Server',
      baseUrl: process.env.API_SERVER_URL || 'http://localhost:3001',
      timeout: 30000,
      retries: 3
    },
    'files': {
      name: 'File Service',
      baseUrl: process.env.FILE_SERVICE_URL || 'http://localhost:3002',
      timeout: 60000,
      retries: 2
    },
    'socket': {
      name: 'Socket Service',
      baseUrl: process.env.SOCKET_SERVICE_URL || 'http://localhost:3003',
      timeout: 10000,
      retries: 1
    },
    'worker': {
      name: 'Worker Service',
      baseUrl: process.env.WORKER_SERVICE_URL || 'http://localhost:3004',
      timeout: 120000,
      retries: 1
    }
  };

  async proxyRequest(
    serviceName: string,
    path: string,
    method: string = 'GET',
    data?: any,
    headers?: Record<string, string>
  ): Promise<AxiosResponse> {
    const service = this.services[serviceName];
    
    if (!service) {
      throw new BadGatewayException(`Service '${serviceName}' not found`);
    }

    const url = `${service.baseUrl}${path}`;
    
    this.logger.log(`Proxying ${method} ${url}`);

    try {
      const response = await axios({
        method: method.toLowerCase() as any,
        url,
        data,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: service.timeout,
        validateStatus: () => true // Don't throw on HTTP error status codes
      });

      this.logger.log(`Response from ${service.name}: ${response.status}`);
      return response;
      
    } catch (error) {
      this.logger.error(`Error proxying to ${service.name}:`, error.message);
      throw new BadGatewayException(`Failed to connect to ${service.name}`);
    }
  }

  async healthCheck(serviceName: string): Promise<boolean> {
    try {
      const service = this.services[serviceName];
      if (!service) return false;

      const response = await axios.get(`${service.baseUrl}/health`, {
        timeout: 5000
      });
      
      return response.status === 200;
    } catch {
      return false;
    }
  }

  getServices(): Record<string, ServiceConfig> {
    return this.services;
  }
}