import { WorkerReadiness } from '../domain/interfaces/worker-readiness.interface';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, logLevel } from 'kafkajs';
import { z } from 'zod';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { log } from '../../../common/infrastructure/logging';
import { published, failures } from '../../../libs/observability/observability';
import { FulfillmentStore } from '../domain/interfaces/fulfillment.ports';
import { ProcessIntegration } from '../application/process-integration.use-case';
const envelope = z.object({
    id: z.string().uuid(),
    orderId: z.string().uuid(),
    kind: z.enum([
        'order.placed',
        'inventory.reserved',
        'delivery.booked',
        'order.dispatched',
        'order.completed',
        'order.attention',
    ]),
    traceId: z.string().uuid(),
});
const topic = 'orderflow.events.v1';
@Injectable()
export class KafkaWorkerService extends WorkerReadiness implements OnModuleInit, OnModuleDestroy {
    private readonly kafka = new Kafka({
        clientId: 'orderflow-worker',
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
        logLevel: logLevel.ERROR,
        requestTimeout: 5000,
        retry: { retries: 3, initialRetryTime: 300 },
    });
    private readonly producer = this.kafka.producer({ idempotent: true, maxInFlightRequests: 1 });
    private readonly consumer = this.kafka.consumer({ groupId: 'orderflow-integrations-v1' });
    private timers: NodeJS.Timeout[] = [];
    private active: Promise<unknown>[] = [];
    private ready = false;
    constructor(
        private readonly db: PrismaService,
        private readonly jobs: FulfillmentStore,
        private readonly processJob: ProcessIntegration,
    ) {
        super();
    }
    get isReady() {
        return this.ready;
    }
    async onModuleInit() {
        await this.db.$queryRaw`SELECT 1`;
        const admin = this.kafka.admin();
        await admin.connect();
        await admin.createTopics({ waitForLeaders: true, topics: [{ topic, numPartitions: 3, replicationFactor: 1 }] });
        await admin.disconnect();
        await this.producer.connect();
        await this.consumer.connect();
        await this.consumer.subscribe({ topic, fromBeginning: true });
        this.consumer.on(this.consumer.events.CRASH, () => {
            this.ready = false;
            log('consumer.crashed');
            setTimeout(() => process.exit(1), 500);
        });
        this.consumer.on(this.consumer.events.DISCONNECT, () => {
            this.ready = false;
        });
        await this.consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    const e = envelope.parse(JSON.parse(message.value?.toString() || ''));
                    const accepted = await this.jobs.accept(e);
                    log(accepted ? 'event.accepted' : 'event.duplicate', {
                        eventId: e.id,
                        orderId: e.orderId,
                        traceId: e.traceId,
                        kind: e.kind,
                    });
                } catch (error) {
                    if (error instanceof SyntaxError || (error as Error).name === 'ZodError') {
                        await this.db.kafkaQuarantine.upsert({
                            where: { topic_partition_offsetValue: { topic, partition, offsetValue: message.offset } },
                            create: {
                                topic,
                                partition,
                                offsetValue: message.offset,
                                reason: (error as Error).message.slice(0, 1000),
                                payload: message.value?.toString().slice(0, 10000),
                            },
                            update: {},
                        });
                        failures.inc({ component: 'malformed_event' });
                    } else throw error;
                }
            },
        });
        this.ready = true;
        this.loop('outbox', () => this.publish());
        this.loop('scheduler', async () => {
            const job = await this.jobs.claim();
            if (job) await this.processJob.execute(job);
        });
        log('worker.started');
    }
    private loop(component: string, work: () => Promise<unknown>) {
        let busy = false;
        this.timers.push(
            setInterval(() => {
                if (busy || !this.ready) return;
                busy = true;
                const running = work()
                    .catch((error) => {
                        failures.inc({ component });
                        log('worker.error', { component, error: error.message });
                    })
                    .finally(() => {
                        busy = false;
                        this.active = this.active.filter((p) => p !== running);
                    });
                this.active.push(running);
            }, 250),
        );
    }
    private publish() {
        return this.db.transaction(async (tx) => {
            const rows = await tx.$queryRaw<
                { id: string }[]
            >`SELECT id FROM outbox WHERE published_at IS NULL ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`;
            if (!rows.length) return;
            const e = await tx.outboxEvent.findUniqueOrThrow({ where: { id: rows[0].id } });
            await this.producer.send({
                topic,
                acks: -1,
                messages: [
                    {
                        key: e.orderId,
                        value: JSON.stringify({
                            id: e.id,
                            orderId: e.orderId,
                            kind: e.kind,
                            traceId: e.traceId,
                            payload: e.payload,
                        }),
                        headers: { 'x-correlation-id': e.traceId },
                    },
                ],
            });
            await tx.outboxEvent.update({ where: { id: e.id }, data: { publishedAt: new Date() } });
            published.inc();
            log('outbox.published', { eventId: e.id, orderId: e.orderId, traceId: e.traceId });
        });
    }
    async onModuleDestroy() {
        this.ready = false;
        this.timers.forEach(clearInterval);
        await Promise.allSettled(this.active);
        await this.consumer.disconnect();
        await this.producer.disconnect();
    }
}
