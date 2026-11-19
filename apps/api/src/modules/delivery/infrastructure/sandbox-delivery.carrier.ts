import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { DeliveryCarrier } from '../domain/interfaces/delivery-carrier.interface';
@Injectable()
export class SandboxDeliveryCarrier extends DeliveryCarrier {
    constructor(private readonly db: PrismaService) {
        super();
    }
    book(orderId: string) {
        const key = `${orderId}:ship`;
        return this.db.transaction(async (tx) => {
            await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${key},1))`;
            const previous = await tx.integrationReceipt.findUnique({ where: { operationKey: key } });
            if (previous) return previous.response;
            const control = await tx.serviceControl.findUniqueOrThrow({ where: { service: 'delivery' } });
            if (!control.available)
                throw new ServiceUnavailableException('Delivery carrier temporarily unavailable (sandbox)');
            const response = { reference: `SANDBOX-DEL-${orderId}`, sandbox: true };
            await tx.integrationReceipt.create({ data: { operationKey: key, requestHash: orderId, response } });
            return response;
        });
    }
}
