import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetOrderQuery, ListOrdersQuery } from './get-order.query';
import { GetOrder } from '../../get-order.use-case';
@QueryHandler(GetOrderQuery)
export class GetOrderHandler implements IQueryHandler<GetOrderQuery> {
    constructor(private readonly read: GetOrder) {}
    execute(query: GetOrderQuery) {
        return this.read.execute(query.id, query.token, query.staff);
    }
}
@QueryHandler(ListOrdersQuery)
export class ListOrdersHandler implements IQueryHandler<ListOrdersQuery> {
    constructor(private readonly read: GetOrder) {}
    execute() {
        return this.read.list();
    }
}
