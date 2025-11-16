export const CACHE_TTL_CONFIG = {
    kline: {
        '1m': 60,
        '15m': 300,
        '1h': 300,
        '4h': 600,
        '1d': 1800,
        '1w': 3600,
        '1M': 7200,
    },
    default: 300,
} as const;

export function getKlineCacheTTL(interval: string): number {
    const ttlSeconds = CACHE_TTL_CONFIG.kline[interval as keyof typeof CACHE_TTL_CONFIG.kline]
        || CACHE_TTL_CONFIG.default;
    return ttlSeconds * 1000;
}

