export type OrderStatus =
  | 'pending'
  | 'submitted'
  | 'partially_filled'
  | 'filled'
  | 'canceled'
  | 'rejected'
  | 'expired';

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'limit' | 'market';

export interface Order {
  id: string;
  exchange: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price?: number;
  quantity: number;
  status: OrderStatus;
  filledQuantity: number;
  avgPrice?: number;
  fee?: number;
  updatedAt?: string;
  createdAt?: string;
  errorCode?: string;
  errorMessage?: string;
}
