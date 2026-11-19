import { StockItem } from '../domain/stock-item.entity';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { BusinessError } from '../../../common/domain/errors';
import { InventoryReservations } from '../domain/interfaces/inventory-reservations.interface';
import { ReservationLine } from '../domain/reservation';
@Injectable()
export class PrismaInventoryReservations extends InventoryReservations {
    constructor(private readonly db: PrismaService) {
        super();
    }
    reserve(orderId: string, lines: ReservationLine[]) {
        const key = `${orderId}:reserve`,
            requestHash = createHash('sha256').update(JSON.stringify(lines)).digest('hex');
        return this.db.transaction(async (tx) => {
            await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${key},1))`;
            const previous = await tx.integrationReceipt.findUnique({ where: { operationKey: key } });
            if (previous) {
                if (previous.requestHash !== requestHash) throw new BusinessError('conflict', 'Operation key conflict');
                return previous.response;
            }
            const control = await tx.serviceControl.findUniqueOrThrow({ where: { service: 'inventory' } });
            if (!control.available)
                throw new ServiceUnavailableException('Inventory service temporarily unavailable (failure exercise)');
            const ids = lines.map((l) => l.productId);
            await tx.$queryRaw`SELECT id FROM products WHERE id=ANY(${ids}::text[]) ORDER BY id FOR UPDATE`;
            for (const line of lines) {
                const product = await tx.product.findUnique({ where: { id: line.productId } });
                if (!product) throw new BusinessError('not_found', 'Product not found');
                const stock = new StockItem(product.id, product.stock);
                stock.reserve(line.quantity);
                const updated = await tx.product.updateMany({
                    where: { id: line.productId, stock: { gte: line.quantity } },
                    data: { stock: stock.available },
                });
                if (updated.count !== 1) throw new BusinessError('conflict', 'Insufficient inventory');
            }
            const response = { reference: `RES-${orderId}`, reserved: true };
            await tx.integrationReceipt.create({ data: { operationKey: key, requestHash, response } });
            return response;
        });
    }
}
