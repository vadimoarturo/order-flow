import { IntegrationRequestDto } from './dto/integration-request.dto';
import { Body, Controller, Get, Headers, Post, UnauthorizedException, BadRequestException } from '@nestjs/common';

import { ReserveStock } from '../../inventory/application/reserve-stock.use-case';
import { BookDelivery } from '../../delivery/application/book-delivery.use-case';
import { SystemSignals } from '../../../common/domain/system-signals';

@Controller()
export class IntegrationsController {
    constructor(
        private readonly reserve: ReserveStock,
        private readonly delivery: BookDelivery,
        private readonly signals: SystemSignals,
    ) {}
    @Get('health') async health() {
        await this.signals.databaseReady();
        return { ok: true, inventory: 'persistent', carrier: 'sandbox' };
    }
    private authorize(auth: string) {
        const expected = process.env.INTEGRATIONS_TOKEN;
        if (!expected || auth !== `Bearer ${expected}`) throw new UnauthorizedException();
    }
    @Post('inventory') async inventory(
        @Body() body: IntegrationRequestDto,
        @Headers('authorization') auth: string,
        @Headers('idempotency-key') key: string,
        @Headers('x-correlation-id') traceId: string,
    ) {
        this.authorize(auth);
        const input = body;
        if (key !== `${input.orderId}:reserve`) throw new BadRequestException('Invalid operation key');
        const result = await this.reserve.execute(
            input.orderId,
            input.items.map((i) => ({ productId: i.product_id, quantity: i.quantity })),
        );
        return result;
    }
    @Post('delivery') async ship(
        @Body() body: IntegrationRequestDto,
        @Headers('authorization') auth: string,
        @Headers('idempotency-key') key: string,
        @Headers('x-correlation-id') traceId: string,
    ) {
        this.authorize(auth);
        const input = body;
        if (key !== `${input.orderId}:ship`) throw new BadRequestException('Invalid operation key');
        const result = await this.delivery.execute(input.orderId);
        return result;
    }
}
