import { Injectable } from '@nestjs/common';
import { Prisma, IntegrationJob as JobRow } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { BusinessError } from '../../../common/domain/errors';
import { orderingSession } from '../../orders/infrastructure/prisma-ordering.unit-of-work';
import { FulfillmentStore, JobSession } from '../domain/interfaces/fulfillment.ports';
import { IntegrationEvent, IntegrationJob } from '../domain/job';
const job = (row: JobRow) => row as IntegrationJob;
@Injectable()
export class PrismaFulfillmentStore extends FulfillmentStore {
    constructor(private readonly db: PrismaService) {
        super();
    }
    accept(event: IntegrationEvent) {
        return this.db.transaction(async (tx) => {
            const inserted = await tx.inboxEvent.createMany({ data: [{ eventId: event.id }], skipDuplicates: true });
            if (!inserted.count) return false;
            const kind =
                event.kind === 'order.placed' ? 'reserve' : event.kind === 'inventory.reserved' ? 'ship' : null;
            if (kind)
                await tx.integrationJob.createMany({
                    data: [
                        { id: randomUUID(), eventId: event.id, orderId: event.orderId, kind, traceId: event.traceId },
                    ],
                    skipDuplicates: true,
                });
            return true;
        });
    }
    claim() {
        return this.db.transaction(async (tx) => {
            const rows = await tx.$queryRaw<
                { id: string }[]
            >`SELECT id FROM jobs WHERE (state='pending' AND next_run_at<=now()) OR (state='running' AND locked_until<now()) ORDER BY next_run_at FOR UPDATE SKIP LOCKED LIMIT 1`;
            if (!rows.length) return;
            const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
            return job(
                await tx.integrationJob.update({
                    where: { id: rows[0].id },
                    data: {
                        state: 'running',
                        attempts: { increment: 1 },
                        leaseToken: randomUUID(),
                        lockedUntil: new Date(clock.now.getTime() + 15000),
                        updatedAt: new Date(),
                    },
                }),
            );
        });
    }
    owned<T>(claimed: IntegrationJob, work: (s: JobSession) => Promise<T>) {
        return this.db.transaction(async (tx) => {
            const current = await this.lock(tx, claimed.id);
            if (!current || current.state !== 'running' || current.leaseToken !== claimed.leaseToken) return false;
            return work(await this.session(tx, current));
        });
    }
    deadLetter<T>(id: string, work: (s: JobSession) => Promise<T>) {
        return this.db.transaction(async (tx) => {
            const current = await this.lock(tx, id);
            if (!current) throw new BusinessError('not_found', 'Job not found');
            if (current.state !== 'dlq')
                throw new BusinessError('conflict', 'Only a DLQ job can be manually recovered');
            return work(await this.session(tx, current));
        });
    }
    async items(orderId: string) {
        return (
            await this.db.orderItem.findMany({
                where: { orderId },
                orderBy: { productId: 'asc' },
                select: { productId: true, quantity: true },
            })
        ).map((i) => ({ product_id: i.productId, quantity: i.quantity }));
    }
    private async lock(tx: Prisma.TransactionClient, id: string) {
        const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM jobs WHERE id=${id}::uuid FOR UPDATE`;
        return rows.length ? tx.integrationJob.findUnique({ where: { id } }) : null;
    }
    private async session(tx: Prisma.TransactionClient, row: JobRow): Promise<JobSession> {
        const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        return {
            job: job(row),
            now: clock.now,
            orders: orderingSession(tx),
            update: async (change) => {
                await tx.integrationJob.update({ where: { id: row.id }, data: { ...change, updatedAt: new Date() } });
            },
        };
    }
}
