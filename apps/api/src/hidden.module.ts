import { WorkerReadiness } from './modules/fulfillment/domain/interfaces/worker-readiness.interface';
import { ObservabilityModule } from './libs/observability/observability.module';
import { Module } from '@nestjs/common';
import { PersistenceModule } from './libs/prisma/prisma.service';
import { FulfillmentModule } from './modules/fulfillment/fulfillment.module';
import { KafkaWorkerService } from './modules/fulfillment/infrastructure/kafka-worker.service';
import { WorkerHealthController } from './modules/fulfillment/controllers/worker-health.controller';
@Module({
    imports: [PersistenceModule, ObservabilityModule, FulfillmentModule],
    providers: [KafkaWorkerService, { provide: WorkerReadiness, useExisting: KafkaWorkerService }],
    controllers: [WorkerHealthController],
})
export class HiddenModule {}
