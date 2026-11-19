import { Registry, Counter, Gauge, collectDefaultMetrics } from 'prom-client';
import { PrismaService } from '../prisma/prisma.service';
export const registry = new Registry();
collectDefaultMetrics({ register: registry });
export const processed = new Counter({
    name: 'orderflow_jobs_total',
    help: 'Integration job outcomes',
    labelNames: ['kind', 'outcome'],
    registers: [registry],
});
export const retries = new Counter({
    name: 'orderflow_retries_total',
    help: 'Durably scheduled retries',
    labelNames: ['kind'],
    registers: [registry],
});
export const published = new Counter({
    name: 'orderflow_published_total',
    help: 'Outbox publish acknowledgements',
    registers: [registry],
});
export const failures = new Counter({
    name: 'orderflow_errors_total',
    help: 'Infrastructure errors',
    labelNames: ['component'],
    registers: [registry],
});
const states = new Gauge({
    name: 'orderflow_jobs',
    help: 'Durable job counts',
    labelNames: ['state'],
    registers: [registry],
});
const pending = new Gauge({ name: 'orderflow_outbox_pending', help: 'Unpublished events', registers: [registry] });
const age = new Gauge({
    name: 'orderflow_outbox_oldest_seconds',
    help: 'Oldest unpublished event age',
    registers: [registry],
});
export async function metrics(db: PrismaService) {
    const [rows, count, oldest] = await Promise.all([
        db.integrationJob.groupBy({ by: ['state'], _count: true }),
        db.outboxEvent.count({ where: { publishedAt: null } }),
        db.outboxEvent.findFirst({
            where: { publishedAt: null },
            orderBy: { createdAt: 'asc' },
            select: { createdAt: true },
        }),
    ]);
    for (const state of ['pending', 'running', 'succeeded', 'dlq', 'skipped'])
        states.set({ state }, rows.find((r) => r.state === state)?._count || 0);
    pending.set(count);
    age.set(oldest ? Math.max(0, (Date.now() - oldest.createdAt.getTime()) / 1000) : 0);
    return registry.metrics();
}
