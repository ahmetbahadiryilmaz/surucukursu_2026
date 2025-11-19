import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { env } from '@surucukursu/shared';

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
      baseUrl: `http://localhost:${env.services.apiServer.port}`,
      timeout: 30000,
      retries: 3
    },
    'files': {
      name: 'File Service',
      baseUrl: `http://localhost:${env.services.fileService.port}`,
      timeout: 60000,
      retries: 2
    },
    'worker': {
      name: 'Worker Service',
      baseUrl: `http://localhost:${env.services.workerService.port}`,
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
      // Determine responseType: use stream for file service (binary data)
      const axiosOptions: any = {
        method: method.toLowerCase() as any,
        url,
        data,
        headers: {
          // Forward client headers without overriding Content-Type
          ...headers
        },
        timeout: service.timeout,
        validateStatus: () => true // Don't throw on HTTP error status codes
      };

      if (serviceName === 'files') {
        // Stream binary responses (PDFs, images, etc.) so proxy can pipe them
        axiosOptions.responseType = 'stream';
        // CRITICAL: Disable text encoding to preserve binary data integrity
        axiosOptions.responseEncoding = null;
      }

      const response = await axios(axiosOptions);

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