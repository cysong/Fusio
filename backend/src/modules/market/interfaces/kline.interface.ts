/**
 * K-line (Candlestick) Data Interface
 * Standardized format for all exchanges
 */
export interface KlineData {
  exchange: string; // Exchange identifier (e.g., 'binance')
  symbol: string; // Standardized symbol 'BTC/USDT'
  interval: string; // Time interval: '1s', '1m', '15m', '1h', '1d', '1w'
  timestamp: number; // Opening timestamp (milliseconds)
  open: number; // Opening price
  high: number; // Highest price
  low: number; // Lowest price
  close: number; // Closing price
  volume: number; // Trading volume
  isClosed: boolean; // Is this candle closed? (false = forming, true = completed)
  source?: {
    // Original data source
    nativeSymbol: string; // Native symbol format
    exchangeTimestamp: number; // Exchange timestamp
    updateId?: number; // Update ID for consistency checks
  };
}

