import type { OrderAggregate, OrderEvent, OrderState } from '../order.aggregate';
export interface CatalogSnapshot {
    id: string;
    name: string;
    price: number;
}
export interface AuditAction {
    actor: string;
    role: string;
    action: string;
    target: string;
    reason: string;
    traceId: string;
}
export interface OrderingSession {
    lockCheckout(key: string): Promise<void>;
    findByCheckout(key: string): Promise<OrderState | null>;
    products(ids: string[]): Promise<CatalogSnapshot[]>;
    insert(order: OrderAggregate): Promise<void>;
    lockOrder(id: string): Promise<OrderAggregate | null>;
    save(order: OrderAggregate): Promise<void>;
    history(orderId: string, status: string, detail: string): Promise<void>;
    events(events: OrderEvent[]): Promise<void>;
    audit(action: AuditAction): Promise<void>;
}
export abstract class OrderingUnitOfWork {
    abstract run<T>(work: (session: OrderingSession) => Promise<T>): Promise<T>;
}
export interface OrderSummary {
    id: string;
    status: string;
    total: number;
    version: number;
    traceId: string;
    createdAt: Date;
}
export interface OrderReadModel extends OrderSummary {
    trackingToken: string;
    idempotencyKey: string;
    requestHash: string;
    customer: string;
    address: string;
    items: { productId: string; name: string; quantity: number; price: number }[];
    timeline: { status: string; detail: string; createdAt: Date }[];
    integration: { kind: string; state: string; attempts: number; nextRunAt: Date }[];
}
export abstract class OrderReader {
    abstract get(id: string): Promise<OrderReadModel | null>;
    abstract list(): Promise<OrderSummary[]>;
}
export abstract class OrderIdentity {
    abstract uuid(): string;
    abstract hash(value: unknown): string;
}
