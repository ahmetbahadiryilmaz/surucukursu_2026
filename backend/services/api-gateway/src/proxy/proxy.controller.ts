import { 
  Controller, 
  All, 
  Req, 
  Res, 
  Param, 
  Logger,
  HttpException
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ProxyService } from './proxy.service';

@ApiTags('Proxy')
@Controller()
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);

  constructor(private readonly proxyService: ProxyService) {}

  @All('api/*')
  @ApiOperation({ summary: 'Proxy to API Server' })
  async proxyToApiServer(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Param() params: any
  ) {
    return this.handleProxy('api', req, res, params);
  }

  @All('files/*')
  @ApiOperation({ summary: 'Proxy to File Service' })
  async proxyToFileService(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Param() params: any
  ) {
    return this.handleProxy('files', req, res, params);
  }

  @All('socket/*')
  @ApiOperation({ summary: 'Proxy to Socket Service' })
  async proxyToSocketService(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Param() params: any
  ) {
    return this.handleProxy('socket', req, res, params);
  }

  @All('worker/*')
  @ApiOperation({ summary: 'Proxy to Worker Service' })
  async proxyToWorkerService(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Param() params: any
  ) {
    return this.handleProxy('worker', req, res, params);
  }

  private async handleProxy(
    serviceName: string,
    req: FastifyRequest,
    res: FastifyReply,
    params: any
  ) {
    try {
      // Extract path after service name, but keep /api prefix for api service
      let path = req.url;
      if (serviceName !== 'api') {
        path = req.url.replace(`/${serviceName}`, '') || '/';
      }
      
      // Get headers, excluding hop-by-hop headers
      const headers = { ...req.headers };
      delete headers.host;
      delete headers.connection;
      delete headers['transfer-encoding'];

      // Make the proxy request
      const response = await this.proxyService.proxyRequest(
        serviceName,
        path,
        req.method,
        req.body,
        headers as Record<string, string>
      );

      // Set response headers
      Object.entries(response.headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          res.header(key, value);
        }
      });

      // Send response
      res.status(response.status).send(response.data);
      
    } catch (error) {
      this.logger.error(`Proxy error for ${serviceName}:`, error);
      
      if (error instanceof HttpException) {
        res.status(error.getStatus()).send({
          error: error.message,
          statusCode: error.getStatus()
        });
      } else {
        res.status(502).send({
          error: 'Bad Gateway',
          message: `Failed to proxy request to ${serviceName}`,
          statusCode: 502
        });
      }
    }
  }
}