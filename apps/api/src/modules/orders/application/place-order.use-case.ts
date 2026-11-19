import { OrderAggregate } from '../domain/order.aggregate';
import { BusinessError } from '../../../common/domain/errors';
import { OrderingUnitOfWork, OrderIdentity } from '../domain/interfaces/ordering.ports';
export interface PlaceOrderCommand {
    idempotencyKey: string;
    customer: string;
    address: string;
    items: { productId: string; quantity: number }[];
}
export class PlaceOrder {
    constructor(
        private readonly uow: OrderingUnitOfWork,
        private readonly identity: OrderIdentity,
    ) {}
    async execute(command: PlaceOrderCommand, traceId: string) {
        const items = [...command.items].sort((a, b) => a.productId.localeCompare(b.productId));
        const requestHash = this.identity.hash({ customer: command.customer, address: command.address, items });
        const order = await this.uow.run(async (session) => {
            await session.lockCheckout(command.idempotencyKey);
            const previous = await session.findByCheckout(command.idempotencyKey);
            if (previous) {
                if (previous.requestHash !== requestHash)
                    throw new BusinessError('conflict', 'Idempotency key already used for different input');
                return previous;
            }
            const products = await session.products(items.map((i) => i.productId));
            const lines = items.map((i) => {
                const p = products.find((p) => p.id === i.productId);
                if (!p) throw new BusinessError('invalid', 'Unknown product');
                return { ...i, name: p.name, price: p.price };
            });
            const aggregate = OrderAggregate.place(
                {
                    id: this.identity.uuid(),
                    trackingToken: this.identity.uuid(),
                    idempotencyKey: command.idempotencyKey,
                    requestHash,
                    customer: command.customer,
                    address: command.address,
                    traceId,
                },
                lines,
            );
            await session.insert(aggregate);
            await session.history(aggregate.state.id, 'placed', 'Order accepted. Waiting for inventory reservation.');
            await session.events(aggregate.releaseEvents());
            return aggregate.state;
        });
        return { id: order.id, trackingToken: order.trackingToken, traceId: order.traceId };
    }
}
