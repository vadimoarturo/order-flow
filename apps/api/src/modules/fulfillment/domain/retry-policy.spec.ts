import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_ATTEMPTS, retryDelay } from './retry-policy';
test('retry policy switches from short to delayed windows without sleeping', () => {
    assert.equal(MAX_ATTEMPTS, 5);
    assert.deepEqual(
        [1, 2, 3, 4].map((i) => retryDelay(i, () => 0)),
        [1000, 2000, 8000, 15000],
    );
});
test('retry policy bounds jitter and refuses attempts outside its budget', () => {
    assert.equal(
        retryDelay(1, () => 1),
        1200,
    );
    assert.throws(() => retryDelay(0));
    assert.throws(() => retryDelay(5));
});
