import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderSide, OrderStatus, OrderType } from '../constants/order-status.enum';

export class QueryOrdersDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  exchange?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(OrderSide)
  side?: OrderSide;

  @IsOptional()
  @IsEnum(OrderType)
  type?: OrderType;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  symbol?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  pageSize?: string;
}
