import { BusinessError } from '../../../common/domain/errors';
export class StockItem {
    constructor(
        readonly productId: string,
        private remaining: number,
    ) {
        if (!Number.isInteger(remaining) || remaining < 0) throw new BusinessError('invalid', 'Invalid stock level');
    }
    get available() {
        return this.remaining;
    }
    reserve(quantity: number) {
        if (!Number.isInteger(quantity) || quantity < 1)
            throw new BusinessError('invalid', 'Invalid reservation quantity');
        if (quantity > this.remaining) throw new BusinessError('conflict', 'Insufficient inventory');
        this.remaining -= quantity;
    }
}
