import {
    CallHandler,
    ExecutionContext,
    HttpException,
    Injectable,
    InternalServerErrorException,
    NestInterceptor
} from '@nestjs/common'
import { FastifyReply, FastifyRequest } from 'fastify'
import { Observable, catchError, map, throwError } from 'rxjs'

@Injectable()
export class ResponseInterceptor<T>
    implements NestInterceptor<T, any> {

    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> {
        const ctx = context.switchToHttp()
        const res = ctx.getResponse<FastifyReply>()
        const req = ctx.getRequest<FastifyRequest>()

        return next.handle().pipe(
            map((data: any) => {
                return this.responseHandler(data, res, req)
            }),
            catchError((err: HttpException) => {
                return throwError(() => err)
            })
        )
    }

    private getErrorResponse(err: any) {
        const error = err instanceof HttpException ? err : new InternalServerErrorException()
        const response = error.getResponse() as {
            message?: string | string[]
            args?: Record<string, any>
            payload?: any
        }

        const message = response.message || error.message
        const status = error.getStatus()

        return {
            message:
                typeof message === 'string'
                    ? message
                    : Array.isArray(message)
                    ? message[0]
                    : (message as any)?.appMessage || error.message,
            ...(response.payload || {}),
            status
        }
    }

    private responseHandler(data: any, res: FastifyReply, req: FastifyRequest) {
        const isInstance = typeof data === 'object' && data !== null && 'message' in data

        const response = {
            data: isInstance ? data.data : data,
            status: res.statusCode,
            success: true,
            message: isInstance ? data.message : 'Success'
        }

        return response
    }
}