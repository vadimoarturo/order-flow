import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GetOrder } from './get-order.use-case';
import type { OrderReadModel } from '../domain/interfaces/ordering.ports';
const record: OrderReadModel = {
    id: 'order',
    status: 'placed',
    total: 3400,
    version: 1,
    traceId: 'trace',
    createdAt: new Date(),
    trackingToken: 'private-token',
    idempotencyKey: 'private-key',
    requestHash: 'private-hash',
    customer: 'Demo User',
    address: '24 Fictional Street',
    items: [],
    timeline: [],
    integration: [],
};
const read = new GetOrder({ get: async () => record, list: async () => [record] });
test('GetOrder hides existence from callers without the tracking capability', async () => {
    await assert.rejects(() => read.execute('order', 'wrong-token', false), /Order not found/);
});
test('GetOrder maps an explicit public response without private persistence fields', async () => {
    const response = await read.execute('order', 'private-token', false);
    assert.equal(response.trace_id, 'trace');
    for (const field of ['trackingToken', 'idempotencyKey', 'requestHash']) assert.equal(field in response, false);
    assert.equal((await read.list())[0].id, 'order');
});
