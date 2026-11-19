import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsInt,
    IsString,
    IsUUID,
    Length,
    Max,
    Min,
    ValidateNested,
} from 'class-validator';
export class ReservationLineRequestDto {
    @IsString() @Length(1, 40) product_id!: string;
    @IsInt() @Min(1) @Max(10) quantity!: number;
}
export class IntegrationRequestDto {
    @IsUUID() orderId!: string;
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(20)
    @ValidateNested({ each: true })
    @Type(() => ReservationLineRequestDto)
    items!: ReservationLineRequestDto[];
}
