export interface TickerData {
  exchange: string;
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  timestamp: number;
}

export type PriceDirection = 'up' | 'down' | 'neutral';
