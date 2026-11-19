import { Body, Controller, Get, Param, ParseEnumPipe, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { StaffGuard, StaffRequest, StaffRoles } from '../../identity/controllers/staff.guard';
import { ControlIntegration } from '../application/control-integration.use-case';
import { RecoverJob } from '../application/recover-job.use-case';
import { ControlServiceRequestDto, IntegrationService } from './dto/control-service-request.dto';
import { RecoveryAction, RecoveryRequestDto } from './dto/recovery-request.dto';
@Controller('staff')
@UseGuards(StaffGuard)
@StaffRoles('oncall')
export class OperationsController {
    constructor(
        private readonly control: ControlIntegration,
        private readonly recover: RecoverJob,
    ) {}
    @Get('operations') diagnostics() {
        return this.control.diagnostics();
    }
    @Post('services/:service') async service(
        @Param('service', new ParseEnumPipe(IntegrationService)) service: IntegrationService,
        @Body() body: ControlServiceRequestDto,
        @Req() req: StaffRequest,
    ) {
        await this.control.execute(service, body.available, body.reason, req.staff.actor, req.traceId);
        return { ok: true };
    }
    @Post('jobs/:id/:action') job(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('action', new ParseEnumPipe(RecoveryAction)) action: RecoveryAction,
        @Body() body: RecoveryRequestDto,
        @Req() req: StaffRequest,
    ) {
        return this.recover.execute(id, action, body.reason, req.staff.actor);
    }
}
