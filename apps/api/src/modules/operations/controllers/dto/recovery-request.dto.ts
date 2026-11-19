import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
export enum RecoveryAction {
    Retry = 'retry',
    Skip = 'skip',
}
export class RecoveryRequestDto {
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @Length(8, 500)
    reason!: string;
}
