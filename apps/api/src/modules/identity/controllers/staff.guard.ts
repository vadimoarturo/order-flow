import {
    CanActivate,
    ExecutionContext,
    Injectable,
    SetMetadata,
    UnauthorizedException,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffAuthService, StaffIdentity, StaffRole } from '../application/staff-auth.service';
import type { Request } from 'express';
export interface StaffRequest extends Request {
    staff: StaffIdentity;
    traceId: string;
}
export const StaffRoles = (...roles: StaffRole[]) => SetMetadata('staff-roles', roles);
@Injectable()
export class StaffGuard implements CanActivate {
    constructor(
        private readonly auth: StaffAuthService,
        private readonly reflector: Reflector,
    ) {}
    canActivate(ctx: ExecutionContext) {
        const req = ctx.switchToHttp().getRequest<StaffRequest>();
        const identity = this.auth.authenticate(req.headers.authorization);
        if (!identity) throw new UnauthorizedException('Staff token required');
        const roles = this.reflector.getAllAndOverride<StaffRole[]>('staff-roles', [ctx.getHandler(), ctx.getClass()]);
        if (roles && !roles.includes(identity.role)) throw new ForbiddenException('Role does not permit this action');
        req.staff = identity;
        return true;
    }
}
