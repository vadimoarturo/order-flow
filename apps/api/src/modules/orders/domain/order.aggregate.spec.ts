import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OrderAggregate, OrderLine } from './order.aggregate';
const input = {
    id: 'order',
    trackingToken: 'token',
    idempotencyKey: 'key',
    requestHash: 'hash',
    customer: 'Alex Demo',
    address: '24 Fictional Street',
    traceId: 'trace',
};
const lines: OrderLine[] = [{ productId: 'lamp', name: 'Lamp', price: 8900, quantity: 2 }];
test('OrderAggregate calculates money from authoritative integer-cent lines', () => {
    assert.equal(OrderAggregate.place(input, lines).state.total, 17800);
    const mutable = [{ ...lines[0] }];
    const order = OrderAggregate.place(input, mutable);
    mutable[0].price = 1;
    assert.equal(order.items[0].price, 8900);
    assert.equal(order.state.total, 17800);
    for (const quantity of [0, -1, 11, 1.5])
        assert.throws(() => OrderAggregate.place(input, [{ ...lines[0], quantity }]));
    assert.throws(() => OrderAggregate.place(input, []));
    assert.throws(() => OrderAggregate.place(input, [lines[0], lines[0]]));
});
test('OrderAggregate refuses dispatch before fulfilment and rejects stale versions', () => {
    const order = OrderAggregate.place(input, lines);
    assert.throws(() => order.dispatch(1));
    order.integrationSucceeded('reserve');
    order.integrationSucceeded('ship');
    assert.throws(() => order.dispatch(1), /Order changed/);
    assert.equal(order.state.status, 'ready');
});
test('OrderAggregate enforces integration ordering and emits business events', () => {
    const order = OrderAggregate.place(input, lines);
    assert.throws(() => order.integrationSucceeded('ship'));
    order.integrationSucceeded('reserve');
    order.integrationSucceeded('ship');
    order.dispatch(3);
    order.complete(4);
    assert.equal(order.state.status, 'completed');
    assert.deepEqual(
        order.releaseEvents().map((e) => e.kind),
        ['order.placed', 'inventory.reserved', 'delivery.booked', 'order.dispatched', 'order.completed'],
    );
    assert.deepEqual(order.releaseEvents(), []);
});
test('OrderAggregate attention is explicit and never implies delivery success', () => {
    const order = OrderAggregate.place(input, lines);
    order.requireAttention();
    assert.equal(order.state.status, 'attention');
    assert.throws(() => order.dispatch(2));
    assert.equal(order.releaseEvents().at(-1)?.kind, 'order.attention');
});
