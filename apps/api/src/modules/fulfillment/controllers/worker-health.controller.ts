import { Controller, Get, Res, ServiceUnavailableException } from '@nestjs/common';
import type { Response } from 'express';
import { SystemSignals } from '../../../common/domain/system-signals';
import { WorkerReadiness } from '../domain/interfaces/worker-readiness.interface';
@Controller()
export class WorkerHealthController {
    constructor(
        private readonly signals: SystemSignals,
        private readonly runtime: WorkerReadiness,
    ) {}
    @Get('health') async health() {
        await this.signals.databaseReady();
        if (!this.runtime.isReady) throw new ServiceUnavailableException();
        return { ready: true };
    }
    @Get('metrics') async metrics(@Res() res: Response) {
        const metrics = await this.signals.scrape();
        res.type(metrics.contentType).send(metrics.body);
    }
}
