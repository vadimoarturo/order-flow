import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsString, Length, Min } from 'class-validator';
export class ChangeOrderStatusRequestDto {
    @IsIn(['dispatched', 'completed']) status!: 'dispatched' | 'completed';
    @IsInt() @Min(1) version!: number;
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @Length(8, 500)
    reason!: string;
}
