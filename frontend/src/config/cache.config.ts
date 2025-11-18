export const CACHE_TTL_CONFIG = {
    kline: {
        '1m': 300,
        '15m': 1800,
        '1h': 1800,
        '4h': 3600,
        '1d': 7200,
        '1w': 14400,
        '1M': 28800,
    },
    default: 300,
} as const;

export function getKlineCacheTTL(interval: string): number {
    const ttlSeconds = CACHE_TTL_CONFIG.kline[interval as keyof typeof CACHE_TTL_CONFIG.kline]
        || CACHE_TTL_CONFIG.default;
    return ttlSeconds * 1000;
}

