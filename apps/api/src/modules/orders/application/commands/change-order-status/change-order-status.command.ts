import { ChangeOrderStatusCommand } from '../../change-order-status.use-case';
export class UpdateOrderStatusCommand {
    constructor(
        public readonly id: string,
        public readonly input: ChangeOrderStatusCommand,
        public readonly actor: string,
        public readonly traceId: string,
    ) {}
}
