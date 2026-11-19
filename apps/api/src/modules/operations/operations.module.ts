import { Module } from '@nestjs/common';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';
import { OperationsStore } from './domain/interfaces/operations.ports';
import { PrismaOperationsStore } from './infrastructure/prisma-operations.store';
import { ControlIntegration } from './application/control-integration.use-case';
import { RecoverJob } from './application/recover-job.use-case';
import { FulfillmentStore } from '../fulfillment/domain/interfaces/fulfillment.ports';
import { OperationsController } from './controllers/operations.controller';
import { HealthController } from './controllers/health.controller';
@Module({
    imports: [FulfillmentModule],
    controllers: [OperationsController, HealthController],
    providers: [
        { provide: OperationsStore, useClass: PrismaOperationsStore },
        {
            provide: ControlIntegration,
            useFactory: (s: OperationsStore) => new ControlIntegration(s),
            inject: [OperationsStore],
        },
        { provide: RecoverJob, useFactory: (s: FulfillmentStore) => new RecoverJob(s), inject: [FulfillmentStore] },
    ],
})
export class OperationsModule {}
