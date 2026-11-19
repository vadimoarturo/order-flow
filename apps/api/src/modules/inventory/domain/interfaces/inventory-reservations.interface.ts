import type { ReservationLine } from '../reservation';
export abstract class InventoryReservations {
    abstract reserve(orderId: string, lines: ReservationLine[]): Promise<unknown>;
}
