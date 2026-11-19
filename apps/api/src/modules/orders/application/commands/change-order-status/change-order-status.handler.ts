import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateOrderStatusCommand } from './change-order-status.command';
import { ChangeOrderStatus } from '../../change-order-status.use-case';
@CommandHandler(UpdateOrderStatusCommand)
export class UpdateOrderStatusHandler implements ICommandHandler<UpdateOrderStatusCommand> {
    constructor(private readonly change: ChangeOrderStatus) {}
    execute(command: UpdateOrderStatusCommand) {
        return this.change.execute(command.id, command.input, command.actor, command.traceId);
    }
}
