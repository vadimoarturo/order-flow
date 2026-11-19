import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { Request } from 'express';
import { StaffAuthService } from '../../identity/application/staff-auth.service';
import { StaffGuard, StaffRequest, StaffRoles } from '../../identity/controllers/staff.guard';
import { PlaceOrderRequestDto } from './dto/place-order-request.dto';
import { ChangeOrderStatusRequestDto } from './dto/change-order-status-request.dto';
import { CreateOrderCommand } from '../application/commands/place-order/place-order.command';
import { UpdateOrderStatusCommand } from '../application/commands/change-order-status/change-order-status.command';
import { GetOrderQuery, ListOrdersQuery } from '../application/queries/get-order/get-order.query';
@Controller('orders')
export class OrdersController {
    constructor(
        private readonly commands: CommandBus,
        private readonly queries: QueryBus,
        private readonly auth: StaffAuthService,
    ) {}
    @Post() create(@Body() body: PlaceOrderRequestDto, @Req() req: Request & { traceId: string }) {
        return this.commands.execute(
            new CreateOrderCommand(
                { ...body, customer: body.customer.trim(), address: body.address.trim() },
                req.traceId,
            ),
        );
    }
    @Get(':id') get(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
        return this.queries.execute(
            new GetOrderQuery(id, req.header('x-order-token'), !!this.auth.authenticate(req.headers.authorization)),
        );
    }
}
@Controller('staff/orders')
@UseGuards(StaffGuard)
export class OperatorOrdersController {
    constructor(
        private readonly commands: CommandBus,
        private readonly queries: QueryBus,
    ) {}
    @Get() list() {
        return this.queries.execute(new ListOrdersQuery());
    }
    @Patch(':id/status') @StaffRoles('operator') status(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: ChangeOrderStatusRequestDto,
        @Req() req: StaffRequest,
    ) {
        return this.commands.execute(
            new UpdateOrderStatusCommand(id, { ...body, reason: body.reason.trim() }, req.staff.actor, req.traceId),
        );
    }
}
