import { CorrelationMiddleware } from './common/presentation/correlation.middleware';
import { ObservabilityModule } from './libs/observability/observability.module';
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { PersistenceModule } from './libs/prisma/prisma.service';
import { InventoryModule } from './modules/inventory/inventory.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { IntegrationsController } from './modules/integrations/controllers/integrations.controller';
import { HttpErrorFilter } from './common/presentation/http-error.filter';
@Module({
    imports: [PersistenceModule, ObservabilityModule, InventoryModule, DeliveryModule],
    controllers: [IntegrationsController],
    providers: [{ provide: APP_FILTER, useClass: HttpErrorFilter }],
})
export class IntegrationsModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(CorrelationMiddleware).forRoutes('*path');
    }
}
