import type { AuditAction } from '../../../orders/domain/interfaces/ordering.ports';
export abstract class OperationsStore {
    abstract diagnostics(): Promise<unknown>;
    abstract setAvailability(service: 'inventory' | 'delivery', available: boolean, audit: AuditAction): Promise<void>;
}
