import { ExchangesConfiguration } from '../modules/market/interfaces/exchange-config.interface';

/**
 * Exchanges and trading pairs configuration
 * This file drives the multi-exchange aggregation system
 */
export const EXCHANGES_CONFIG: ExchangesConfiguration = {
  exchanges: {
    binance: {
      id: 'binance',
      name: 'Binance',
      enabled: true,
      wsEndpoint: 'wss://stream.binance.com:9443/ws',
      restEndpoint: 'https://api.binance.com/api/v3',
      reconnect: {
        maxAttempts: 5,
        delayMs: 5000,
      },
      rateLimit: {
        requestsPerSecond: 20,
      },
    },
    bybit: {
      id: 'bybit',
      name: 'Bybit',
      enabled: true,
      wsEndpoint: 'wss://stream.bybit.com/v5/public/spot',
      restEndpoint: 'https://api.bybit.com/v5',
      reconnect: {
        maxAttempts: 5,
        delayMs: 5000,
      },
      rateLimit: {
        requestsPerSecond: 10,
      },
    },
    okx: {
      id: 'okx',
      name: 'OKX',
      enabled: true,
      wsEndpoint: 'wss://ws.okx.com:8443/ws/v5/public',
      restEndpoint: 'https://www.okx.com/api/v5',
      reconnect: {
        maxAttempts: 5,
        delayMs: 5000,
      },
      rateLimit: {
        requestsPerSecond: 10,
      },
    },
  },
  tradingPairs: {
    'BTC/USDT': {
      symbol: 'BTC/USDT',
      enabled: true,
      exchanges: {
        binance: {
          enabled: true,
          nativeSymbol: 'btcusdt',
        },
        bybit: {
          enabled: true,
          nativeSymbol: 'BTCUSDT',
        },
        okx: {
          enabled: true,
          nativeSymbol: 'BTC-USDT',
        },
      },
    },
    'ETH/USDT': {
      symbol: 'ETH/USDT',
      enabled: true,
      exchanges: {
        binance: {
          enabled: true,
          nativeSymbol: 'ethusdt',
        },
        bybit: {
          enabled: true,
          nativeSymbol: 'ETHUSDT',
        },
        okx: {
          enabled: true,
          nativeSymbol: 'ETH-USDT',
        },
      },
    },
  },
};

/**
 * Get all enabled exchanges
 */
export function getEnabledExchanges() {
  return Object.values(EXCHANGES_CONFIG.exchanges).filter((ex) => ex.enabled);
}

/**
 * Get all enabled trading pairs
 */
export function getEnabledTradingPairs() {
  return Object.values(EXCHANGES_CONFIG.tradingPairs).filter((pair) => pair.enabled);
}

/**
 * Get native symbol for a specific exchange and standard symbol
 */
export function getNativeSymbol(exchange: string, standardSymbol: string): string | null {
  const pair = EXCHANGES_CONFIG.tradingPairs[standardSymbol];
  if (!pair || !pair.exchanges[exchange]) return null;
  return pair.exchanges[exchange].nativeSymbol;
}

/**
 * Get exchange configuration by ID
 */
export function getExchangeConfig(exchangeId: string) {
  return EXCHANGES_CONFIG.exchanges[exchangeId];
}
