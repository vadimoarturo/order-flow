/** One-time, non-destructive bridge for the previous local demo database. */
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
const url = process.env.DATABASE_URL;
if (!url) throw new Error('Set DATABASE_URL explicitly for the existing local demo');
const target = new URL(url);
if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.pathname !== '/orderflow')
    throw new Error('This bridge only accepts the local orderflow database');
const db = new PrismaClient();
async function baseline() {
    const [tables] = await db.$queryRaw<
        { old: string | null; current: string | null }[]
    >`SELECT to_regclass('public.mock_control')::text AS old,to_regclass('public.integration_controls')::text AS current`;
    if (tables.old && tables.current)
        throw new Error('Both legacy and current tables exist; inspect the database first');
    if (tables.old)
        await db.$transaction(async (tx) => {
            await tx.$executeRawUnsafe('ALTER TABLE mock_control RENAME TO integration_controls');
            await tx.$executeRawUnsafe(
                'ALTER TABLE integration_controls RENAME CONSTRAINT mock_control_pkey TO integration_controls_pkey',
            );
            await tx.$executeRawUnsafe('ALTER TABLE mock_operations RENAME TO integration_receipts');
            await tx.$executeRawUnsafe(
                'ALTER TABLE integration_receipts RENAME CONSTRAINT mock_operations_pkey TO integration_receipts_pkey',
            );
        });
    const receipts = await db.integrationReceipt.findMany({
        where: { operationKey: { endsWith: ':reserve' } },
    });
    for (const receipt of receipts) {
        const orderId = receipt.operationKey.split(':')[0];
        const items = await db.orderItem.findMany({
            where: { orderId },
            orderBy: { productId: 'asc' },
            select: { productId: true, quantity: true },
        });
        if (!items.length) continue;
        const lines = items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
        await db.integrationReceipt.update({
            where: { operationKey: receipt.operationKey },
            data: { requestHash: createHash('sha256').update(JSON.stringify(lines)).digest('hex') },
        });
    }
    console.log('Local tables and operation receipts preserved. No stock or order status changed.');
}
baseline().finally(() => db.$disconnect());
