import { InventoryReservations } from './domain/interfaces/inventory-reservations.interface';
import { Module } from '@nestjs/common';
import { ReserveStock } from './application/reserve-stock.use-case';
import { PrismaInventoryReservations } from './infrastructure/prisma-inventory.reservations';
@Module({
    providers: [
        { provide: InventoryReservations, useClass: PrismaInventoryReservations },
        {
            provide: ReserveStock,
            useFactory: (r: InventoryReservations) => new ReserveStock(r),
            inject: [InventoryReservations],
        },
    ],
    exports: [ReserveStock],
})
export class InventoryModule {}
