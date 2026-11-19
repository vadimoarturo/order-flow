import { BusinessError } from '../../../common/domain/errors';
export type OrderStatus = 'placed' | 'reserved' | 'ready' | 'dispatched' | 'completed' | 'attention';
export type IntegrationKind = 'reserve' | 'ship';
export interface OrderLine {
    productId: string;
    name: string;
    price: number;
    quantity: number;
}
export interface OrderState {
    id: string;
    trackingToken: string;
    idempotencyKey: string;
    requestHash: string;
    customer: string;
    address: string;
    status: OrderStatus;
    total: number;
    traceId: string;
    version: number;
}
export interface OrderEvent {
    orderId: string;
    kind: string;
    traceId: string;
}
export class OrderAggregate {
    private pending: OrderEvent[] = [];
    private constructor(
        private readonly data: OrderState,
        private readonly lines: readonly OrderLine[],
    ) {}
    static place(input: Omit<OrderState, 'status' | 'total' | 'version'>, lines: OrderLine[]) {
        if (input.customer.trim().length < 2 || input.address.trim().length < 8)
            throw new BusinessError('invalid', 'Customer and delivery address are required');
        if (!lines.length || new Set(lines.map((l) => l.productId)).size !== lines.length)
            throw new BusinessError('invalid', 'Order lines must be non-empty and unique');
        const total = lines.reduce((sum, l) => {
            if (
                !Number.isInteger(l.price) ||
                l.price <= 0 ||
                !Number.isInteger(l.quantity) ||
                l.quantity < 1 ||
                l.quantity > 10
            )
                throw new BusinessError('invalid', 'Invalid order line');
            return sum + l.price * l.quantity;
        }, 0);
        const order = new OrderAggregate(
            { ...input, status: 'placed', total, version: 1 },
            lines.map((line) => ({ ...line })),
        );
        order.record('order.placed');
        return order;
    }
    static restore(state: OrderState, lines: OrderLine[]) {
        return new OrderAggregate(
            { ...state },
            lines.map((line) => ({ ...line })),
        );
    }
    get items(): readonly Readonly<OrderLine>[] {
        return this.lines.map((line) => ({ ...line }));
    }
    get state(): Readonly<OrderState> {
        return { ...this.data };
    }
    dispatch(expectedVersion: number) {
        this.checkVersion(expectedVersion);
        this.move('ready', 'dispatched', 'order.dispatched');
    }
    complete(expectedVersion: number) {
        this.checkVersion(expectedVersion);
        this.move('dispatched', 'completed', 'order.completed');
    }
    integrationSucceeded(kind: IntegrationKind) {
        if (kind === 'reserve') this.move('placed', 'reserved', 'inventory.reserved');
        else this.move('reserved', 'ready', 'delivery.booked');
    }
    requireAttention() {
        if (this.data.status === 'completed') throw new BusinessError('conflict', 'Completed orders cannot be skipped');
        this.data.status = 'attention';
        this.data.version++;
        this.record('order.attention');
    }
    releaseEvents() {
        const events = this.pending;
        this.pending = [];
        return events;
    }
    private checkVersion(version: number) {
        if (this.data.version !== version)
            throw new BusinessError('conflict', 'Order changed. Refresh before trying again.');
    }
    private move(from: OrderStatus, to: OrderStatus, event: string) {
        if (this.data.status !== from)
            throw new BusinessError('conflict', `Cannot change order from ${this.data.status} to ${to}`);
        this.data.status = to;
        this.data.version++;
        this.record(event);
    }
    private record(kind: string) {
        this.pending.push({ orderId: this.data.id, kind, traceId: this.data.traceId });
    }
}
