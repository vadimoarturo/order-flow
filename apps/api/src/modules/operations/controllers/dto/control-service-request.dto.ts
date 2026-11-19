import { IsBoolean } from 'class-validator';
import { RecoveryRequestDto } from './recovery-request.dto';
export enum IntegrationService {
    Inventory = 'inventory',
    Delivery = 'delivery',
}
export class ControlServiceRequestDto extends RecoveryRequestDto {
    @IsBoolean()
    available!: boolean;
}
