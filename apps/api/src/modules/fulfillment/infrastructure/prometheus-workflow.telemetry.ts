import { WorkflowTelemetry } from '../domain/interfaces/fulfillment.ports';
import { processed, retries } from '../../../libs/observability/observability';
import { log } from '../../../common/infrastructure/logging';
export class PrometheusWorkflowTelemetry extends WorkflowTelemetry {
    outcome(kind: string, outcome: string) {
        processed.inc({ kind, outcome });
    }
    retry(kind: string) {
        retries.inc({ kind });
    }
    log(event: string, fields: Record<string, unknown>) {
        log(event, fields);
    }
}
