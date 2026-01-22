import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { fileLogger } from './file-logger';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestLogging');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, headers, body, ip } = req;
    const startTime = Date.now();

    // Log incoming request
    fileLogger.log('all-requests', `[${method}] ${originalUrl} - INCOMING`, {
      method,
      url: originalUrl,
      ip,
      headers: {
        'user-agent': headers['user-agent'],
        'content-type': headers['content-type'],
      },
      body: this.sanitizeBody(body),
      timestamp: new Date().toISOString(),
    });

    // Capture the response
    const originalSend = res.send;
    res.send = function (data) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Log outgoing response
      fileLogger.log('all-requests', `[${method}] ${originalUrl} - RESPONSE (${duration}ms)`, {
        method,
        url: originalUrl,
        statusCode,
        duration,
        response: this.sanitizeData(data),
        timestamp: new Date().toISOString(),
      });

      return originalSend.call(this, data);
    }.bind(this);

    next();
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    const sanitized = { ...body };
    if (sanitized.password) {
      sanitized.password = '***';
    }
    return sanitized;
  }

  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    }
    return data;
  }
}
