import { FulfillmentStore } from '../../fulfillment/domain/interfaces/fulfillment.ports';
import { BusinessError } from '../../../common/domain/errors';
export class RecoverJob {
    constructor(private readonly jobs: FulfillmentStore) {}
    execute(id: string, action: 'retry' | 'skip', reason: string, actor: string) {
        if (reason.trim().length < 8) throw new BusinessError('invalid', 'A meaningful recovery reason is required');
        return this.jobs.deadLetter(id, async (s) => {
            if (action === 'retry')
                await s.update({
                    state: 'pending',
                    attempts: 0,
                    recoveryCount: s.job.recoveryCount + 1,
                    nextRunAt: s.now,
                    lastError: null,
                });
            else {
                const order = await s.orders.lockOrder(s.job.orderId);
                if (!order) throw new BusinessError('not_found', 'Order not found');
                order.requireAttention();
                await s.orders.save(order);
                await s.orders.events(order.releaseEvents());
                await s.orders.history(
                    order.state.id,
                    'attention',
                    `Integration skipped by on-call: ${reason}. Manual business resolution required.`,
                );
                await s.update({ state: 'skipped' });
            }
            await s.orders.audit({
                actor,
                role: 'oncall',
                action: `job.${action}`,
                target: id,
                reason,
                traceId: s.job.traceId,
            });
            return { ok: true };
        });
    }
}
