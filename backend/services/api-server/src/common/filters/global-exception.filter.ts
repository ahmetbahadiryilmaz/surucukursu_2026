import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  /**
   * Map HTTP status codes to default error codes
   */
  private getDefaultErrorCode(status: number): string {
    const statusCodeMap: { [key: number]: string } = {
      [HttpStatus.BAD_REQUEST]: 'INVALID_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
    };
    
    return statusCodeMap[status] || 'OPERATION_FAILED';
  }

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    
    // Get status code - use HTTP exception status if available, otherwise 500
    const status = 
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    
    // Extract error information from HttpException
    let errorCode: string | undefined;
    let errorMessage = exception instanceof HttpException 
      ? exception.message 
      : 'Internal Server Error';
    
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      
      // If the response is an object with code and/or message, extract them
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const response = exceptionResponse as any;
        if (response.code) {
          errorCode = response.code;
        }
        if (response.message) {
          errorMessage = response.message;
        }
      }
    }
    
    // If no error code provided, generate default based on HTTP status
    if (!errorCode) {
      errorCode = this.getDefaultErrorCode(status);
    }
    
    // Prepare response data
    const responseData: any = {
      code: errorCode,
      message: errorMessage,
      statusCode: status,
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