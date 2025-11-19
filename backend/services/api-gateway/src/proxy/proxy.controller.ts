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
import { env } from '@surucukursu/shared';

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
    console.log(`\n🌐 GATEWAY REQUEST: ${req.method} ${req.url}`);
    console.log(`   ➡️  Routing to api-server`);
    return this.handleProxy('api', req, res, params);
  }

  @All('files/*')
  @ApiOperation({ summary: 'Proxy to File Service' })
  async proxyToFileService(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Param() params: any
  ) {
    console.log(`\n🟢 GATEWAY FILES REQUEST: ${req.method} ${req.url}`);
    console.log(`   Original URL: ${req.url}`);
    console.log(`   Will proxy to file-server at port ` + env.services.fileService.port);
    console.log(`   📁 Routing to file-server`);
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
      // Extract path after service name
      // For 'api' and 'files' services, keep the full path including the service prefix
      // For other services, remove the service prefix from the path
      let path = req.url;
      if (serviceName !== 'api' && serviceName !== 'files') {
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

      // Filter out hop-by-hop headers and set the rest on the reply.
      // See RFC 7230 Section 6.1 for hop-by-hop header names.
      const hopByHop = new Set([
        'connection',
        'keep-alive',
        'proxy-authenticate',
        'proxy-authorization',
        'te',
        'trailers',
        'transfer-encoding',
        'upgrade'
      ]);

      Object.entries(response.headers).forEach(([key, value]) => {
        const lname = key.toLowerCase();
        if (hopByHop.has(lname)) return;
        // Only set string headers (axios may include arrays in some cases)
        if (typeof value === 'string' || typeof value === 'number') {
          res.header(key, String(value));
        }
      });

      // If the proxied response is a stream (axios responseType: 'stream'), send the stream
      // directly so Fastify can pipe it to the client without buffering.
      const isStream = response.data && typeof response.data.pipe === 'function';

      if (isStream) {
        res.status(response.status);
        return res.send(response.data);
      }

      // Non-stream response (JSON/text) — send as-is
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