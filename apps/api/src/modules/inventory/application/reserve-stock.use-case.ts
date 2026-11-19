import { InventoryReservations } from '../domain/interfaces/inventory-reservations.interface';
import { validateReservation, ReservationLine } from '../domain/reservation';
export class ReserveStock {
    constructor(private readonly inventory: InventoryReservations) {}
    execute(orderId: string, lines: ReservationLine[]) {
        validateReservation(lines);
        return this.inventory.reserve(
            orderId,
            [...lines].sort((a, b) => a.productId.localeCompare(b.productId)),
        );
    }
}
