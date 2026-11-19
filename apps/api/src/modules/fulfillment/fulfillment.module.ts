import { Module } from '@nestjs/common';
import { FulfillmentStore, IntegrationGateway, WorkflowTelemetry } from './domain/interfaces/fulfillment.ports';
import { PrismaFulfillmentStore } from './infrastructure/prisma-fulfillment.store';
import { HttpIntegrationGateway } from './infrastructure/http-integration.gateway';
import { PrometheusWorkflowTelemetry } from './infrastructure/prometheus-workflow.telemetry';
import { ProcessIntegration } from './application/process-integration.use-case';
@Module({
    providers: [
        { provide: FulfillmentStore, useClass: PrismaFulfillmentStore },
        { provide: IntegrationGateway, useClass: HttpIntegrationGateway },
        { provide: WorkflowTelemetry, useClass: PrometheusWorkflowTelemetry },
        {
            provide: ProcessIntegration,
            useFactory: (s: FulfillmentStore, g: IntegrationGateway, t: WorkflowTelemetry) =>
                new ProcessIntegration(s, g, t),
            inject: [FulfillmentStore, IntegrationGateway, WorkflowTelemetry],
        },
    ],
    exports: [FulfillmentStore, ProcessIntegration, WorkflowTelemetry],
})
export class FulfillmentModule {}
