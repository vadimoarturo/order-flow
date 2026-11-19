import { Injectable } from '@nestjs/common';
import { Prisma, Order, OrderItem } from '@prisma/client';
import { randomUUID, createHash } from 'node:crypto';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { OrderAggregate, OrderState } from '../domain/order.aggregate';
import { OrderingSession, OrderingUnitOfWork, OrderIdentity, OrderReader } from '../domain/interfaces/ordering.ports';
export function restoreOrder(row: Order & { items: OrderItem[] }) {
    return OrderAggregate.restore(
        { ...row, status: row.status as OrderState['status'] },
        row.items.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
        })),
    );
}
export function orderingSession(db: Prisma.TransactionClient): OrderingSession {
    return {
        async lockCheckout(key) {
            await db.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${key},0))`;
        },
        async findByCheckout(key) {
            const row = await db.order.findUnique({ where: { idempotencyKey: key } });
            return row ? { ...row, status: row.status as OrderState['status'] } : null;
        },
        products(ids) {
            return db.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, price: true } });
        },
        async insert(order) {
            await db.order.create({
                data: {
                    ...order.state,
                    items: {
                        create: order.items.map(({ productId, ...line }) => ({
                            ...line,
                            product: { connect: { id: productId } },
                        })),
                    },
                },
            });
        },
        async lockOrder(id) {
            const rows = await db.$queryRaw<{ id: string }[]>`SELECT id FROM orders WHERE id=${id}::uuid FOR UPDATE`;
            if (!rows.length) return null;
            const row = await db.order.findUniqueOrThrow({ where: { id }, include: { items: true } });
            return restoreOrder(row);
        },
        async save(order) {
            const { id, status, version } = order.state;
            await db.order.update({ where: { id }, data: { status, version, updatedAt: new Date() } });
        },
        async history(orderId, status, detail) {
            await db.orderHistory.create({ data: { orderId, status, detail } });
        },
        async events(events) {
            for (const e of events)
                await db.outboxEvent.create({ data: { id: randomUUID(), ...e, payload: { orderId: e.orderId } } });
        },
        async audit(action) {
            await db.auditEntry.create({ data: action });
        },
    };
}
@Injectable()
export class PrismaOrderingUnitOfWork extends OrderingUnitOfWork {
    constructor(private readonly db: PrismaService) {
        super();
    }
    run<T>(work: (session: OrderingSession) => Promise<T>) {
        return this.db.transaction((tx) => work(orderingSession(tx)));
    }
}
export class CryptoOrderIdentity extends OrderIdentity {
    uuid() {
        return randomUUID();
    }
    hash(value: unknown) {
        return createHash('sha256').update(JSON.stringify(value)).digest('hex');
    }
}
@Injectable()
export class PrismaOrderReader extends OrderReader {
    constructor(private readonly db: PrismaService) {
        super();
    }
    async get(id: string) {
        const row = await this.db.order.findUnique({
            where: { id },
            include: { items: true, history: { orderBy: { id: 'asc' } }, jobs: { orderBy: { createdAt: 'asc' } } },
        });
        if (!row) return null;
        return {
            ...row,
            traceId: row.traceId,
            createdAt: row.createdAt,
            items: row.items.map((i) => ({
                productId: i.productId,
                name: i.name,
                quantity: i.quantity,
                price: i.price,
            })),
            timeline: row.history.map((h) => ({ status: h.status, detail: h.detail, createdAt: h.createdAt })),
            integration: row.jobs.map((j) => ({
                kind: j.kind,
                state: j.state,
                attempts: j.attempts,
                nextRunAt: j.nextRunAt,
            })),
            history: undefined,
            jobs: undefined,
        };
    }
    async list() {
        return this.db.order.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: { id: true, status: true, total: true, version: true, traceId: true, createdAt: true },
        });
    }
}
