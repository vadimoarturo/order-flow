import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { AuditAction } from '../../orders/domain/interfaces/ordering.ports';
import { OperationsStore } from '../domain/interfaces/operations.ports';
@Injectable()
export class PrismaOperationsStore extends OperationsStore {
    constructor(private readonly db: PrismaService) {
        super();
    }
    async diagnostics() {
        const [jobs, services, audit, outboxPending, inboxReceived, dlq] = await Promise.all([
            this.db.integrationJob.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
            this.db.serviceControl.findMany({ orderBy: { service: 'asc' } }),
            this.db.auditEntry.findMany({ orderBy: { id: 'desc' }, take: 50 }),
            this.db.outboxEvent.count({ where: { publishedAt: null } }),
            this.db.inboxEvent.count(),
            this.db.integrationJob.count({ where: { state: 'dlq' } }),
        ]);
        return {
            jobs: jobs.map((j) => ({
                ...j,
                order_id: j.orderId,
                event_id: j.eventId,
                trace_id: j.traceId,
                recovery_count: j.recoveryCount,
                next_run_at: j.nextRunAt,
                locked_until: j.lockedUntil,
                lease_token: j.leaseToken,
                last_error: j.lastError,
                created_at: j.createdAt,
                updated_at: j.updatedAt,
            })),
            services,
            audit: audit.map((a) => ({ ...a, id: Number(a.id), trace_id: a.traceId, created_at: a.createdAt })),
            summary: { outbox_pending: outboxPending, inbox_received: inboxReceived, dlq },
        };
    }
    async setAvailability(service: 'inventory' | 'delivery', available: boolean, audit: AuditAction) {
        await this.db.transaction(async (tx) => {
            await tx.serviceControl.update({ where: { service }, data: { available } });
            await tx.auditEntry.create({ data: audit });
        });
    }
}
