export interface TickerData {
  exchange: string; // Exchange identifier
  symbol: string; // Standardized symbol 'BTC/USDT'
  price: number; // Current price
  priceChange: number; // Price change
  priceChangePercent: number; // Price change percentage
  volume: number; // 24h volume
  high24h?: number; // 24h high price
  low24h?: number; // 24h low price
  timestamp: number; // Timestamp
  source: {
    // Original data source
    nativeSymbol: string; // Native symbol format
    exchangeTimestamp: number; // Exchange timestamp
  };
}
