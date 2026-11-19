import { OperationsStore } from '../domain/interfaces/operations.ports';
export class ControlIntegration {
    constructor(private readonly store: OperationsStore) {}
    execute(service: 'inventory' | 'delivery', available: boolean, reason: string, actor: string, traceId: string) {
        return this.store.setAvailability(service, available, {
            actor,
            role: 'oncall',
            action: available ? 'service.restore' : 'service.fail',
            target: service,
            reason,
            traceId,
        });
    }
    diagnostics() {
        return this.store.diagnostics();
    }
}
