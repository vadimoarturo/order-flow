import { Global, Module } from '@nestjs/common';
import { StaffAuthService } from './application/staff-auth.service';
import { StaffGuard } from './controllers/staff.guard';
import { SessionController } from './controllers/session.controller';
@Global()
@Module({
    providers: [StaffAuthService, StaffGuard],
    controllers: [SessionController],
    exports: [StaffAuthService, StaffGuard],
})
export class IdentityModule {}
