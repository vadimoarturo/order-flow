import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/libs/prisma/prisma.service';
import {
    PrismaOrderingUnitOfWork,
    CryptoOrderIdentity,
} from '../src/modules/orders/infrastructure/prisma-ordering.unit-of-work';
import { PlaceOrder } from '../src/modules/orders/application/place-order.use-case';
import { ChangeOrderStatus } from '../src/modules/orders/application/change-order-status.use-case';
import { PrismaFulfillmentStore } from '../src/modules/fulfillment/infrastructure/prisma-fulfillment.store';
import { ProcessIntegration } from '../src/modules/fulfillment/application/process-integration.use-case';
import { PrismaInventoryReservations } from '../src/modules/inventory/infrastructure/prisma-inventory.reservations';
import { ReserveStock } from '../src/modules/inventory/application/reserve-stock.use-case';
const db = new PrismaService(),
    uow = new PrismaOrderingUnitOfWork(db),
    place = new PlaceOrder(uow, new CryptoOrderIdentity()),
    change = new ChangeOrderStatus(uow),
    jobs = new PrismaFulfillmentStore(db);
const processor = new ProcessIntegration(
    jobs,
    {
        execute: async () => {
            throw new Error('HTTP gateway belongs to the live-stack E2E suite');
        },
    },
    { outcome: () => {}, retry: () => {}, log: () => {} },
);
const reserve = new ReserveStock(new PrismaInventoryReservations(db));
after(() => db.$disconnect());
const input = (id = randomUUID()) => ({
    idempotencyKey: id,
    customer: 'Demo Test',
    address: '24 Fictional Street',
    items: [{ productId: 'lamp', quantity: 1 }],
});
test('Prisma commits order/outbox atomically and deduplicates concurrent checkout keys', async () => {
    const body = input();
    const results = await Promise.all(Array.from({ length: 6 }, () => place.execute(body, randomUUID())));
    assert.equal(new Set(results.map((r) => r.id)).size, 1);
    assert.equal(await db.outboxEvent.count({ where: { orderId: results[0].id } }), 1);
    assert.equal(await db.orderItem.count({ where: { orderId: results[0].id } }), 1);
    await assert.rejects(
        () => place.execute({ ...body, address: 'A different fictional address' }, randomUUID()),
        /Idempotency/,
    );
    await db.$executeRawUnsafe(
        `CREATE FUNCTION test_reject_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced outbox failure'; END $$`,
    );
    await db.$executeRawUnsafe(
        'CREATE TRIGGER test_outbox_failure BEFORE INSERT ON outbox FOR EACH ROW EXECUTE FUNCTION test_reject_outbox()',
    );
    const broken = input();
    try {
        await assert.rejects(() => place.execute(broken, randomUUID()), /forced outbox failure/);
    } finally {
        await db.$executeRawUnsafe('DROP TRIGGER test_outbox_failure ON outbox');
    }
    assert.equal(await db.order.count({ where: { idempotencyKey: broken.idempotencyKey } }), 0);
});
test('Prisma inbox deduplicates events and expired leases fence stale workers', async () => {
    const order = await place.execute(input(), randomUUID()),
        event = { id: randomUUID(), orderId: order.id, kind: 'order.placed', traceId: order.traceId };
    const accepted = await Promise.all([jobs.accept(event), jobs.accept(event), jobs.accept(event)]);
    assert.equal(accepted.filter(Boolean).length, 1);
    const first = await jobs.claim();
    assert.ok(first);
    assert.equal(first.orderId, order.id);
    assert.equal(await jobs.claim(), undefined);
    await db.integrationJob.update({ where: { id: first.id }, data: { lockedUntil: new Date(Date.now() - 1000) } });
    const reclaimed = await jobs.claim();
    assert.ok(reclaimed);
    assert.equal(reclaimed.id, first.id);
    assert.notEqual(reclaimed.leaseToken, first.leaseToken);
    assert.equal(await processor.complete(first), false);
    assert.equal(await processor.complete(reclaimed), true);
    assert.equal(await processor.complete(reclaimed), false);
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status, 'reserved');
    assert.equal(await db.outboxEvent.count({ where: { orderId: order.id, kind: 'inventory.reserved' } }), 1);
});
test('Prisma stores delayed retries and retains diagnostics after retry exhaustion', async () => {
    const order = await place.execute(input(), randomUUID());
    await jobs.accept({ id: randomUUID(), orderId: order.id, kind: 'order.placed', traceId: order.traceId });
    for (let attempt = 1; attempt <= 5; attempt++) {
        const job = await jobs.claim();
        assert.ok(job);
        assert.equal(job.attempts, attempt);
        await processor.fail(job, '503 carrier unavailable');
        const row = await db.integrationJob.findUniqueOrThrow({ where: { id: job.id } });
        assert.equal(row.state, attempt === 5 ? 'dlq' : 'pending');
        if (attempt < 5) {
            assert.ok(row.nextRunAt.getTime() > Date.now() - 100);
            await db.integrationJob.update({ where: { id: job.id }, data: { nextRunAt: new Date() } });
        }
    }
    assert.equal(
        (await db.integrationJob.findFirstOrThrow({ where: { orderId: order.id } })).lastError,
        '503 carrier unavailable',
    );
});
test('Prisma row lock and aggregate version reject simultaneous operator changes', async () => {
    const order = await place.execute(input(), randomUUID());
    await db.order.update({ where: { id: order.id }, data: { status: 'ready' } });
    const command = { status: 'dispatched' as const, version: 1, reason: 'Demo parcel handed to courier' };
    const results = await Promise.allSettled([
        change.execute(order.id, command, 'test-operator', randomUUID()),
        change.execute(order.id, command, 'test-operator', randomUUID()),
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(await db.auditEntry.count({ where: { target: order.id, action: 'status.dispatched' } }), 1);
});
test('Real Prisma inventory reservation deduplicates side effects and prevents overselling', async () => {
    await db.product.update({ where: { id: 'clock' }, data: { stock: 1 } });
    const orderId = randomUUID(),
        lines = [{ productId: 'clock', quantity: 1 }];
    const result = await Promise.all([reserve.execute(orderId, lines), reserve.execute(orderId, lines)]);
    assert.deepEqual(result[0], result[1]);
    assert.equal(await db.integrationReceipt.count({ where: { operationKey: `${orderId}:reserve` } }), 1);
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: 'clock' } })).stock, 0);
    await db.product.update({ where: { id: 'clock' }, data: { stock: 1 } });
    const results = await Promise.allSettled([
        reserve.execute(randomUUID(), lines),
        reserve.execute(randomUUID(), lines),
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: 'clock' } })).stock, 0);
    await assert.rejects(() => db.product.update({ where: { id: 'clock' }, data: { stock: -1 } }));
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: 'clock' } })).stock, 0);
});
test('Compiled Nest worker role resolves CQRS and never starts hidden consumers', async () => {
    const { spawnSync } = await import('node:child_process');
    const result = spawnSync(
        process.execPath,
        [
            '-e',
            `
  require('reflect-metadata');
  const {Test}=require('@nestjs/testing');
  const {RuntimeModule}=require('./dist/runtime.module');
  const {WorkerReadiness}=require('./dist/modules/fulfillment/domain/interfaces/worker-readiness.interface');
  const {CommandBus}=require('@nestjs/cqrs');
  (async()=>{const app=await Test.createTestingModule({imports:[RuntimeModule.forRole('worker')]}).compile();await app.init();app.get(CommandBus);let hidden=false;try{app.get(WorkerReadiness);hidden=true;}catch{}finally{await app.close();}if(hidden)process.exit(2);console.log('HTTP_ROLE_WITHOUT_HIDDEN');})().catch(e=>{console.error(e);process.exit(1);});
 `,
        ],
        {
            encoding: 'utf8',
            cwd: 'apps/api',
            env: { ...process.env, OPERATOR_TOKEN: 'test-operator-role', ONCALL_TOKEN: 'test-oncall-role' },
        },
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /HTTP_ROLE_WITHOUT_HIDDEN/);
});
