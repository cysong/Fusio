/**
 * Exchange configuration interface
 */
export interface ExchangeConfig {
  id: string; // 'binance' | 'bybit' | 'okx'
  name: string; // Display name
  enabled: boolean; // Whether this exchange is enabled
  wsEndpoint: string; // WebSocket endpoint
  restEndpoint?: string; // REST API endpoint
  reconnect: {
    maxAttempts: number;
    delayMs: number;
  };
  rateLimit?: {
    requestsPerSecond: number;
  };
  // K-line interval mapping configuration
  intervalMapping: {
    toExchange: Record<string, string>;   // Standard format → Exchange-specific format
    fromExchange: Record<string, string>; // Exchange-specific format → Standard format
  };
}

/**
 * Trading pair configuration
 */
export interface TradingPairConfig {
  symbol: string; // Standardized symbol 'BTC/USDT'
  enabled: boolean;
  exchanges: {
    [exchangeId: string]: {
      enabled: boolean;
      nativeSymbol: string; // Exchange-specific symbol format
    };
  };
}

/**
 * Complete exchanges configuration
 */
export interface ExchangesConfiguration {
  exchanges: Record<string, ExchangeConfig>;
  tradingPairs: Record<string, TradingPairConfig>;
}
