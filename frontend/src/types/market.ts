export interface TickerData {
  exchange: string;
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  high24h?: number;
  low24h?: number;
  timestamp: number;
  source: {
    nativeSymbol: string;
    exchangeTimestamp: number;
  };
}

export type PriceDirection = 'up' | 'down' | 'neutral';

export interface ExchangeStatus {
  [key: string]: boolean;
}
