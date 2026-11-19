import {
    FulfillmentStore,
    IntegrationGateway,
    IntegrationFailure,
    WorkflowTelemetry,
} from '../domain/interfaces/fulfillment.ports';
import { IntegrationJob } from '../domain/job';
import { MAX_ATTEMPTS, retryDelay } from '../domain/retry-policy';
import { BusinessError } from '../../../common/domain/errors';
export class ProcessIntegration {
    constructor(
        private readonly store: FulfillmentStore,
        private readonly gateway: IntegrationGateway,
        private readonly telemetry: WorkflowTelemetry,
    ) {}
    async execute(job: IntegrationJob) {
        try {
            await this.gateway.execute(job, await this.store.items(job.orderId));
            await this.complete(job);
        } catch (error) {
            await this.fail(job, (error as Error).message, error instanceof IntegrationFailure && error.permanent);
        }
    }
    complete(job: IntegrationJob) {
        return this.store.owned(job, async (s) => {
            const order = await s.orders.lockOrder(job.orderId);
            if (!order) throw new BusinessError('not_found', 'Order not found');
            order.integrationSucceeded(job.kind);
            await s.orders.save(order);
            await s.orders.history(
                job.orderId,
                order.state.status,
                job.kind === 'reserve'
                    ? 'Inventory reserved. Arranging delivery.'
                    : 'Delivery booked. Ready for operator dispatch.',
            );
            await s.orders.events(order.releaseEvents());
            await s.update({ state: 'succeeded', lockedUntil: null, leaseToken: null, lastError: null });
            this.telemetry.outcome(job.kind, 'success');
            this.telemetry.log('job.succeeded', {
                jobId: job.id,
                orderId: job.orderId,
                traceId: job.traceId,
                kind: job.kind,
                attempt: job.attempts,
            });
            return true;
        });
    }
    fail(job: IntegrationJob, error: string, permanent = false) {
        return this.store.owned(job, async (s) => {
            const dead = permanent || s.job.attempts >= MAX_ATTEMPTS,
                delay = dead ? 0 : retryDelay(s.job.attempts);
            await s.update({
                state: dead ? 'dlq' : 'pending',
                nextRunAt: new Date(s.now.getTime() + delay),
                lastError: error.slice(0, 1000),
                lockedUntil: null,
                leaseToken: null,
            });
            if (dead) {
                const order = await s.orders.lockOrder(job.orderId);
                if (order)
                    await s.orders.history(
                        job.orderId,
                        order.state.status,
                        'Integration needs attention. Your order is saved; our team can recover it.',
                    );
            } else this.telemetry.retry(job.kind);
            this.telemetry.outcome(job.kind, dead ? 'dlq' : 'retry');
            this.telemetry.log(dead ? 'job.dlq' : 'job.retry_scheduled', {
                jobId: job.id,
                orderId: job.orderId,
                traceId: job.traceId,
                kind: job.kind,
                attempt: s.job.attempts,
                delayMs: delay,
                error,
            });
            return true;
        });
    }
}
