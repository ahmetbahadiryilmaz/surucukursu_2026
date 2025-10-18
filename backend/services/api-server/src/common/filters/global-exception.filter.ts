import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    
    // Get status code - use HTTP exception status if available, otherwise 500
    const status = 
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    
    // Prepare response data
    const responseData: any = {
      statusCode: status,
      message: exception instanceof HttpException 
        ? exception.message 
        : 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path: ctx.getRequest().url,
    };
    
    // Add detailed error info in development
    if (process.env.NODE_ENV === 'development') {
      responseData.dev_error = {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      };
      
      // For Prisma errors
      if (exception.code && exception.meta) {
        responseData.dev_error.code = exception.code;
        responseData.dev_error.meta = exception.meta;
      }
    }
    
    reply.status(status).send(responseData);
  }
}