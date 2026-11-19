import { ObservabilityModule } from './libs/observability/observability.module';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { PersistenceModule } from './libs/prisma/prisma.service';
import { IdentityModule } from './modules/identity/identity.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { OrdersModule } from './modules/orders/orders.module';
import { OperationsModule } from './modules/operations/operations.module';
import { HttpErrorFilter } from './common/presentation/http-error.filter';
import { CorrelationMiddleware } from './common/presentation/correlation.middleware';
@Module({
    imports: [PersistenceModule, ObservabilityModule, IdentityModule, CatalogModule, OrdersModule, OperationsModule],
    providers: [{ provide: APP_FILTER, useClass: HttpErrorFilter }],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(CorrelationMiddleware).forRoutes('*path');
    }
}
