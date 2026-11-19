import type { IntegrationJob, IntegrationEvent } from '../job';
import type { OrderingSession } from '../../../orders/domain/interfaces/ordering.ports';
export interface JobSession {
    now: Date;
    job: IntegrationJob;
    orders: OrderingSession;
    update(
        change: Partial<
            Pick<
                IntegrationJob,
                'state' | 'attempts' | 'recoveryCount' | 'nextRunAt' | 'lockedUntil' | 'leaseToken' | 'lastError'
            >
        >,
    ): Promise<void>;
}
export abstract class FulfillmentStore {
    abstract accept(event: IntegrationEvent): Promise<boolean>;
    abstract claim(): Promise<IntegrationJob | undefined>;
    abstract owned<T>(job: IntegrationJob, work: (s: JobSession) => Promise<T>): Promise<T | false>;
    abstract deadLetter<T>(id: string, work: (s: JobSession) => Promise<T>): Promise<T>;
    abstract items(orderId: string): Promise<{ product_id: string; quantity: number }[]>;
}
export class IntegrationFailure extends Error {
    constructor(
        message: string,
        public readonly permanent = false,
    ) {
        super(message);
    }
}
export abstract class IntegrationGateway {
    abstract execute(job: IntegrationJob, items: { product_id: string; quantity: number }[]): Promise<void>;
}
export abstract class WorkflowTelemetry {
    abstract outcome(kind: string, outcome: string): void;
    abstract retry(kind: string): void;
    abstract log(event: string, fields: Record<string, unknown>): void;
}
