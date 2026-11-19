import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runtimeConfig } from './runtime-config';
test('runtime roles select explicit ports without implicitly enabling background work', () => {
    assert.deepEqual(runtimeConfig({}), { role: 'worker', port: 4000 });
    assert.deepEqual(runtimeConfig({ APP_ROLE: 'hidden' }), { role: 'hidden', port: 4001 });
    assert.deepEqual(runtimeConfig({ APP_ROLE: 'integrations' }), { role: 'integrations', port: 4100 });
});
test('unknown roles and invalid ports fail before application startup', () => {
    assert.throws(() => runtimeConfig({ APP_ROLE: 'all' }));
    for (const PORT of ['0', '65536', 'abc', '1.5']) assert.throws(() => runtimeConfig({ PORT }));
});
