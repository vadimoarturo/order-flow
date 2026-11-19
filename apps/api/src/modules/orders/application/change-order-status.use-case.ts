import { BusinessError } from '../../../common/domain/errors';
import { OrderingUnitOfWork } from '../domain/interfaces/ordering.ports';
export interface ChangeOrderStatusCommand {
    status: 'dispatched' | 'completed';
    version: number;
    reason: string;
}
export class ChangeOrderStatus {
    constructor(private readonly uow: OrderingUnitOfWork) {}
    execute(id: string, command: ChangeOrderStatusCommand, actor: string, traceId: string) {
        return this.uow.run(async (session) => {
            const order = await session.lockOrder(id);
            if (!order) throw new BusinessError('not_found', 'Order not found');
            if (command.status === 'dispatched') order.dispatch(command.version);
            else order.complete(command.version);
            await session.save(order);
            await session.history(id, order.state.status, command.reason);
            await session.events(order.releaseEvents().map((e) => ({ ...e, traceId })));
            await session.audit({
                actor,
                role: 'operator',
                action: `status.${command.status}`,
                target: id,
                reason: command.reason,
                traceId,
            });
            return { ok: true };
        });
    }
}
