import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OrderingUnitOfWork, OrderReader, OrderIdentity } from './domain/interfaces/ordering.ports';
import {
    PrismaOrderingUnitOfWork,
    PrismaOrderReader,
    CryptoOrderIdentity,
} from './infrastructure/prisma-ordering.unit-of-work';
import { PlaceOrder } from './application/place-order.use-case';
import { ChangeOrderStatus } from './application/change-order-status.use-case';
import { GetOrder } from './application/get-order.use-case';
import { OrdersController, OperatorOrdersController } from './controllers/orders.controller';
import { CreateOrderHandler } from './application/commands/place-order/place-order.handler';
import { UpdateOrderStatusHandler } from './application/commands/change-order-status/change-order-status.handler';
import { GetOrderHandler, ListOrdersHandler } from './application/queries/get-order/get-order.handler';
const infrastructureProviders = [
    { provide: OrderingUnitOfWork, useClass: PrismaOrderingUnitOfWork },
    { provide: OrderReader, useClass: PrismaOrderReader },
    { provide: OrderIdentity, useClass: CryptoOrderIdentity },
];
const applicationServices = [
    {
        provide: PlaceOrder,
        useFactory: (u: OrderingUnitOfWork, i: OrderIdentity) => new PlaceOrder(u, i),
        inject: [OrderingUnitOfWork, OrderIdentity],
    },
    { provide: GetOrder, useFactory: (r: OrderReader) => new GetOrder(r), inject: [OrderReader] },
    {
        provide: ChangeOrderStatus,
        useFactory: (u: OrderingUnitOfWork) => new ChangeOrderStatus(u),
        inject: [OrderingUnitOfWork],
    },
];
const commandHandlers = [CreateOrderHandler, UpdateOrderStatusHandler];
const queryHandlers = [GetOrderHandler, ListOrdersHandler];
@Module({
    imports: [CqrsModule],
    controllers: [OrdersController, OperatorOrdersController],
    providers: [...infrastructureProviders, ...applicationServices, ...commandHandlers, ...queryHandlers],
    exports: [OrderingUnitOfWork, PlaceOrder, ChangeOrderStatus],
})
export class OrdersModule {}
