import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { StaffGuard, StaffRequest } from './staff.guard';
@Controller('session')
export class SessionController {
    @Post() @UseGuards(StaffGuard) session(@Req() req: StaffRequest) {
        return req.staff;
    }
}
