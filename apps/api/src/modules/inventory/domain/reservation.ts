import { BusinessError } from '../../../common/domain/errors';
export interface ReservationLine {
    productId: string;
    quantity: number;
}
export function validateReservation(lines: ReservationLine[]) {
    if (
        !lines.length ||
        new Set(lines.map((l) => l.productId)).size !== lines.length ||
        lines.some((l) => !Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > 10)
    )
        throw new BusinessError('invalid', 'Invalid inventory reservation');
}
