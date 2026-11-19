import { DeliveryCarrier } from '../domain/interfaces/delivery-carrier.interface';
export class BookDelivery {
    constructor(private readonly carrier: DeliveryCarrier) {}
    execute(orderId: string) {
        return this.carrier.book(orderId);
    }
}
