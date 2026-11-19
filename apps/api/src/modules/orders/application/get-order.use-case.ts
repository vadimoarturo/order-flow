import { orderResponse, orderSummaryResponse } from './mappers/order-response.mapper';
import { OrderReader } from '../domain/interfaces/ordering.ports';
import { BusinessError } from '../../../common/domain/errors';
export class GetOrder {
    constructor(private readonly reader: OrderReader) {}
    async execute(id: string, trackingToken: string | undefined, staff: boolean) {
        const order = await this.reader.get(id);
        if (!order || (!staff && order.trackingToken !== trackingToken))
            throw new BusinessError('not_found', 'Order not found');
        return orderResponse(order);
    }
    async list() {
        return (await this.reader.list()).map(orderSummaryResponse);
    }
}
