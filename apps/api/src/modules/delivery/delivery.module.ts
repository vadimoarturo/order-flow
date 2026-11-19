import { DeliveryCarrier } from './domain/interfaces/delivery-carrier.interface';
import { Module } from '@nestjs/common';
import { BookDelivery } from './application/book-delivery.use-case';
import { SandboxDeliveryCarrier } from './infrastructure/sandbox-delivery.carrier';
@Module({
    providers: [
        { provide: DeliveryCarrier, useClass: SandboxDeliveryCarrier },
        { provide: BookDelivery, useFactory: (c: DeliveryCarrier) => new BookDelivery(c), inject: [DeliveryCarrier] },
    ],
    exports: [BookDelivery],
})
export class DeliveryModule {}
