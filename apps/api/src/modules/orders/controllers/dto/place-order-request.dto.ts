import { Transform, Type } from 'class-transformer';
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
export class OrderLineRequestDto {
    @IsString() @Length(1, 40) productId!: string;
    @IsInt() @Min(1) @Max(10) quantity!: number;
}
export class PlaceOrderRequestDto {
    @IsUUID() idempotencyKey!: string;
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @Length(2, 100)
    customer!: string;
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @Length(8, 300)
    address!: string;
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(20)
    @ValidateNested({ each: true })
    @Type(() => OrderLineRequestDto)
    items!: OrderLineRequestDto[];
}
