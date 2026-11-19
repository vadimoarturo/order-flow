import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { uuid } from './validation';
import { log } from '../infrastructure/logging';
@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
    use(req: Request & { traceId: string }, res: Response, next: NextFunction) {
        const supplied = req.header('x-correlation-id');
        req.traceId = uuid.safeParse(supplied).success ? supplied! : randomUUID();
        res.setHeader('x-correlation-id', req.traceId);
        res.on('finish', () =>
            log('http.request', { method: req.method, path: req.path, status: res.statusCode, traceId: req.traceId }),
        );
        next();
    }
}
