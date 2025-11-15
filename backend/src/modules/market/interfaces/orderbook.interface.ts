export interface OrderBookData {
  exchange: string; // Exchange identifier
  symbol: string; // Standardized symbol 'BTC/USDT'
  bids: [string, string][]; // [price, quantity] array
  asks: [string, string][]; // [price, quantity] array
  timestamp: number; // Timestamp
  source: {
    // Original data source
    nativeSymbol: string; // Native symbol format
    exchangeTimestamp: number; // Exchange timestamp
    updateId?: number; // Update ID for consistency checks
  };
}
