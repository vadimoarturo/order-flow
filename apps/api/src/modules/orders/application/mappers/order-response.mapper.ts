import type { OrderReadModel, OrderSummary } from '../../domain/interfaces/ordering.ports';
export function orderSummaryResponse(order: OrderSummary) {
    return {
        id: order.id,
        status: order.status,
        total: order.total,
        version: order.version,
        trace_id: order.traceId,
        created_at: order.createdAt,
    };
}
export function orderResponse(order: OrderReadModel) {
    return {
        ...orderSummaryResponse(order),
        customer: order.customer,
        address: order.address,
        items: order.items.map((i) => ({
            product_id: i.productId,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
        })),
        timeline: order.timeline.map((e) => ({ status: e.status, detail: e.detail, created_at: e.createdAt })),
        integration: order.integration.map((j) => ({
            kind: j.kind,
            state: j.state,
            attempts: j.attempts,
            next_run_at: j.nextRunAt,
        })),
    };
}
