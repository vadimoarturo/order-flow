import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SystemSignals } from '../../../common/domain/system-signals';
@Controller()
export class HealthController {
    constructor(private readonly signals: SystemSignals) {}
    @Get('health') async health() {
        await this.signals.databaseReady();
        return { status: 'ok', mode: 'worker', demo: true };
    }
    @Get('metrics') async metrics(@Res() res: Response) {
        const metrics = await this.signals.scrape();
        res.type(metrics.contentType).send(metrics.body);
    }
}
