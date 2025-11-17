import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { OrderSide, OrderType } from '../constants/order-status.enum';

export class CreateOrderDto {
  @IsString()
  @MaxLength(30)
  exchange: string; // e.g. mock/binance/bybit/okx

  @IsString()
  @MaxLength(50)
  symbol: string; // e.g. BTC/USDT

  @IsEnum(OrderSide)
  side: OrderSide;

  @IsEnum(OrderType)
  type: OrderType;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number; // required for limit by controller guard

  @IsOptional()
  @IsString()
  @MaxLength(120)
  clientOrderId?: string;
}
