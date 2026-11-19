import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StockItem } from './stock-item.entity';
test('StockItem reserves exact quantities without allowing a negative balance', () => {
    const item = new StockItem('sku', 2);
    item.reserve(2);
    assert.equal(item.available, 0);
    assert.throws(() => item.reserve(1), /Insufficient inventory/);
    assert.equal(item.available, 0);
});
test('StockItem rejects invalid stock and reservation quantities', () => {
    assert.throws(() => new StockItem('sku', -1));
    for (const quantity of [0, -1, 1.5]) assert.throws(() => new StockItem('sku', 3).reserve(quantity));
});
