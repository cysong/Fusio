import { ExchangesConfiguration } from '../modules/market/interfaces/exchange-config.interface';

/**
 * Supported K-line intervals (全局配置)
 * 方案2B: 全时间维度覆盖 (分钟→月), 所有三大交易所(Binance/Bybit/OKX)都支持
 */
export const SUPPORTED_INTERVALS = ['1m', '15m', '1h', '4h', '1d', '1w', '1M'] as const;

/**
 * Supported intervals type
 */
export type SupportedInterval = typeof SUPPORTED_INTERVALS[number];

/**
 * Cache TTL Configuration (缓存过期时间配置)
 * Redis 缓存过期时间，根据数据更新频率设置
 */
export const CACHE_TTL_CONFIG = {
  // Ticker 和 OrderBook 的 TTL（秒）
  ticker: 10,      // 10 seconds - 实时价格数据更新频繁
  orderbook: 10,   // 10 seconds - 订单薄数据更新频繁

  // K线缓存 TTL（根据周期，秒）
  // 周期越长，数据更新频率越低，TTL 可以设置更长
  kline: {
    '1m': 60,      // 1 minute - 1分钟周期，数据更新频繁
    '15m': 300,    // 5 minutes - 15分钟周期
    '1h': 300,     // 5 minutes - 1小时周期
    '4h': 600,      // 10 minutes - 4小时周期
    '1d': 1800,    // 30 minutes - 日线周期
    '1w': 3600,    // 1 hour - 周线周期
    '1M': 7200,    // 2 hours - 月线周期
  },

  // 默认 TTL（当周期未配置时使用）
  default: 300,    // 5 minutes
} as const;

/**
 * K-line API Configuration (K线API配置)
 */
export const KLINE_CONFIG = {
  // 默认周期
  defaultInterval: '1m' as SupportedInterval,

  // Limit 参数配置
  defaultLimit: 500,   // 默认返回 500 条
  minLimit: 1,         // 最小 1 条
  maxLimit: 1000,      // 最大 1000 条
} as const;

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
      // K-line interval mapping (Binance uses same format as standard)
      intervalMapping: {
        toExchange: {
          '1m': '1m',
          '15m': '15m',
          '1h': '1h',
          '4h': '4h',
          '1d': '1d',
          '1w': '1w',
          '1M': '1M',
        },
        fromExchange: {
          '1m': '1m',
          '15m': '15m',
          '1h': '1h',
          '4h': '4h',
          '1d': '1d',
          '1w': '1w',
          '1M': '1M',
        },
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
      // K-line interval mapping (Bybit uses numbers and letters)
      intervalMapping: {
        toExchange: {
          '1m': '1',      // 1 minute
          '15m': '15',    // 15 minutes
          '1h': '60',     // 60 minutes
          '4h': '240',    // 240 minutes
          '1d': 'D',      // Day
          '1w': 'W',      // Week
          '1M': 'M',      // Month
        },
        fromExchange: {
          '1': '1m',
          '15': '15m',
          '60': '1h',
          '240': '4h',
          'D': '1d',
          'W': '1w',
          'M': '1M',
        },
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
      // K-line interval mapping (OKX uses uppercase suffixes)
      intervalMapping: {
        toExchange: {
          '1m': '1m',
          '15m': '15m',
          '1h': '1H',     // Uppercase H
          '4h': '4H',     // Uppercase H
          '1d': '1D',     // Uppercase D
          '1w': '1W',     // Uppercase W
          '1M': '1M',     // Uppercase M
        },
        fromExchange: {
          '1m': '1m',
          '15m': '15m',
          '1H': '1h',
          '4H': '4h',
          '1D': '1d',
          '1W': '1w',
          '1M': '1M',
        },
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
