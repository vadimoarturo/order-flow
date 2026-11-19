export class GetOrderQuery {
    constructor(
        public readonly id: string,
        public readonly token: string | undefined,
        public readonly staff: boolean,
    ) {}
}
export class ListOrdersQuery {}
