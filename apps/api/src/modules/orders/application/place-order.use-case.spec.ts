import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PlaceOrder } from './place-order.use-case';
import { OrderingSession, OrderingUnitOfWork, OrderIdentity } from '../domain/interfaces/ordering.ports';
import { OrderState } from '../domain/order.aggregate';
const identity: OrderIdentity = { uuid: () => crypto.randomUUID(), hash: JSON.stringify };
const command = {
    idempotencyKey: 'key',
    customer: 'Demo User',
    address: '24 Fictional Street',
    items: [{ productId: 'lamp', quantity: 2 }],
};
function setup(previous: OrderState | null = null) {
    let saved: OrderState | undefined;
    const events: string[] = [];
    const session: OrderingSession = {
        lockCheckout: async () => {},
        findByCheckout: async () => previous,
        products: async () => [{ id: 'lamp', name: 'Lamp', price: 8900 }],
        insert: async (order) => {
            saved = order.state;
        },
        lockOrder: async () => null,
        save: async () => {},
        history: async () => {},
        events: async (e) => {
            events.push(...e.map((e) => e.kind));
        },
        audit: async () => {},
    };
    const uow: OrderingUnitOfWork = { run: (work) => work(session) };
    return { service: new PlaceOrder(uow, identity), saved: () => saved, events };
}
test('PlaceOrder uses catalog prices and records an order event in the same unit of work', async () => {
    const { service, saved, events } = setup();
    await service.execute(command, 'trace');
    assert.equal(saved()?.total, 17800);
    assert.deepEqual(events, ['order.placed']);
});
test('PlaceOrder replays matching input and refuses a reused key with changed input', async () => {
    const previous: OrderState = {
        id: 'existing',
        trackingToken: 'token',
        idempotencyKey: 'key',
        requestHash: JSON.stringify({ customer: command.customer, address: command.address, items: command.items }),
        customer: command.customer,
        address: command.address,
        status: 'placed',
        total: 17800,
        traceId: 'original-trace',
        version: 1,
    };
    const { service, saved } = setup(previous);
    assert.equal((await service.execute(command, 'new-trace')).id, 'existing');
    assert.equal(saved(), undefined);
    await assert.rejects(() => service.execute({ ...command, address: 'A different address' }, 'trace'), /Idempotency/);
});
