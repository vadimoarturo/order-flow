import type { IntegrationKind } from '../../orders/domain/order.aggregate';
export interface IntegrationJob {
    id: string;
    eventId: string;
    orderId: string;
    kind: IntegrationKind;
    traceId: string;
    state: 'pending' | 'running' | 'succeeded' | 'dlq' | 'skipped';
    attempts: number;
    recoveryCount: number;
    nextRunAt: Date;
    lockedUntil: Date | null;
    leaseToken: string | null;
    lastError: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface IntegrationEvent {
    id: string;
    orderId: string;
    kind: string;
    traceId: string;
}
