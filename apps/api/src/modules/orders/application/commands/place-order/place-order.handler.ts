import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateOrderCommand } from './place-order.command';
import { PlaceOrder } from '../../place-order.use-case';
@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> {
    constructor(private readonly place: PlaceOrder) {}
    execute(command: CreateOrderCommand) {
        return this.place.execute(command.input, command.traceId);
    }
}
