export abstract class DeliveryCarrier {
    abstract book(orderId: string): Promise<unknown>;
}
