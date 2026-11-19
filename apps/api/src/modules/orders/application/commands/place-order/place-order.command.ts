import { PlaceOrderCommand } from '../../place-order.use-case';
export class CreateOrderCommand {
    constructor(
        public readonly input: PlaceOrderCommand,
        public readonly traceId: string,
    ) {}
}
