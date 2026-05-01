import {
    CallHandler,
    ExecutionContext,
    HttpException,
    Inject,
    Injectable,
    InternalServerErrorException,
    NestInterceptor
} from '@nestjs/common'
import { FastifyReply, FastifyRequest } from 'fastify'
import { Observable, catchError, map, throwError } from 'rxjs'
import { CLIENTS } from 'src/types/index.types'

@Injectable()
export class ResponseInterceptor<T>
    implements NestInterceptor<T> {


    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const ctx = context.switchToHttp()
        const res = ctx.getResponse<FastifyReply>()
        const req = ctx.getRequest<FastifyRequest>()

        return next.handle().pipe(
            map(async (data: Response | any) => {
                return await this.exec(this.responseHandler.bind(this), data, res, req)
            }),
            catchError((err: HttpException) =>
                throwError(
                    async () => await this.exec(this.errorHandler.bind(this), err, res, req, true)
                )
            )
        )
    }


    private async exec(
        fn: typeof this.errorHandler | typeof this.responseHandler,
        data: any,
        res: FastifyReply,
        req: FastifyRequest,
        isError = false
    ) {
        const response = fn(data, res)

        return response
    }

    private getErrorResponse(err: any) {

        const error = err instanceof HttpException ? err : new InternalServerErrorException()
        const response = error.getResponse() as {
            message?: string
            args?: Record<string, any>
            payload?: any
        }

        const message = (response.message || error.message) as any
        const status = error.getStatus()

        return {
            message:
                typeof message === 'string'
                    ? error.message
                    : message.appMessage || message,
            ...(response.payload || {}),
            status: error.getStatus()
        }
    }

    errorHandler(err: any, res: FastifyReply) {
        console.log(err, 'err')

        const reply = this.getErrorResponse(err)
        const response = {
            ...reply,
            success: false
        }

        res.status(reply.status).send(response)
        return response
    }

    private responseHandler(data: any | Response, res: FastifyReply) {
        const isInstance = typeof data === 'object' && 'message' in data

        return {
            data: isInstance ? data.data : data,
            status: res.statusCode,
            success: true,
            message: isInstance ? data.message : 'Success'
        }
    }
}
