import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ReserveStock } from './reserve-stock.use-case';
test('ReserveStock validates input before persistence and orders locks deterministically', async () => {
    let calls = 0;
    const service = new ReserveStock({
        reserve: async (_id, lines) => {
            calls++;
            assert.deepEqual(
                lines.map((l) => l.productId),
                ['a', 'z'],
            );
            return { reserved: true };
        },
    });
    assert.throws(() =>
        service.execute('order', [
            { productId: 'a', quantity: 1 },
            { productId: 'a', quantity: 2 },
        ]),
    );
    assert.equal(calls, 0);
    await service.execute('order', [
        { productId: 'z', quantity: 1 },
        { productId: 'a', quantity: 2 },
    ]);
    assert.equal(calls, 1);
});
