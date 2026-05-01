import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
export declare class GlobalExceptionFilter implements ExceptionFilter {
    private getDefaultErrorCode;
    catch(exception: any, host: ArgumentsHost): void;
}
