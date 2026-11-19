import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { BusinessError } from '../domain/errors';
import { log } from '../infrastructure/logging';
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
    catch(error: unknown, host: ArgumentsHost) {
        const context = host.switchToHttp();
        const request = context.getRequest<Request & { traceId: string }>();
        const response = context.getResponse<Response>();
        const status =
            error instanceof HttpException
                ? error.getStatus()
                : error instanceof BusinessError
                  ? { invalid: 400, conflict: 409, not_found: 404 }[error.code]
                  : 500;
        let message = status < 500 ? (error as Error).message : 'Internal server error';
        if (error instanceof HttpException) {
            const body = error.getResponse();
            if (typeof body === 'object' && body && 'message' in body) {
                const details = body.message;
                if (Array.isArray(details)) message = details.join('; ');
                else if (typeof details === 'string') message = details;
            }
            if (status >= 500 && status !== 503) message = 'Internal server error';
        }
        log('http.error', {
            status,
            path: request.path,
            traceId: request.traceId,
            error: message,
            errorType: error instanceof Error ? error.name : 'Unknown',
            errorCode: typeof error === 'object' && error && 'code' in error ? error.code : undefined,
        });
        response.status(status).json({ statusCode: status, message, traceId: request.traceId });
    }
}
