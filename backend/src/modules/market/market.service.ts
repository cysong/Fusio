import { Injectable, Logger, OnModuleInit, OnModuleDestroy, NotFoundException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { MarketGateway } from './market.gateway';
import { TickerData } from './interfaces/ticker.interface';
import { OrderBookData } from './interfaces/orderbook.interface';
import { KlineData } from './interfaces/kline.interface';
import { BaseExchangeAdapter } from './adapters/base-exchange.adapter';
import { ExchangeAdapterFactory } from './factories/exchange-adapter.factory';
import {
  EXCHANGES_CONFIG,
  SUPPORTED_INTERVALS,
  CACHE_TTL_CONFIG,
  getEnabledExchanges,
  getEnabledTradingPairs,
} from '../../config/exchanges.config';

/**
 * Market Service
 * Manages multi-exchange WebSocket connections and market data aggregation
 */
@Injectable()
export class MarketService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketService.name);

  // Store all adapter instances: Map<'exchange:symbol', adapter>
  private adapters: Map<string, BaseExchangeAdapter> = new Map();
  // In-memory cache for latest tickers
  private tickerCache: Map<string, TickerData> = new Map();

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly marketGateway: MarketGateway,
    private readonly adapterFactory: ExchangeAdapterFactory,
  ) { }

  async onModuleInit() {
    this.logger.log('Initializing market data streams...');
    await this.startAllStreams();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down market data streams...');
    this.stopAllStreams();
  }

  /**
   * Start all enabled exchange and trading pair streams
   */
  private async startAllStreams(): Promise<void> {
    const enabledExchanges = getEnabledExchanges();
    const enabledPairs = getEnabledTradingPairs();

    this.logger.log(
      `Starting streams for ${enabledExchanges.length} exchanges, ${enabledPairs.length} pairs`,
    );

    for (const exchange of enabledExchanges) {
      for (const pair of enabledPairs) {
        // Check if this pair is enabled for this exchange
        const exchangePairConfig = pair.exchanges[exchange.id];
        if (!exchangePairConfig || !exchangePairConfig.enabled) {
          continue;
        }

        const nativeSymbol = exchangePairConfig.nativeSymbol;
        const standardSymbol = pair.symbol;

        this.startStream(exchange.id, nativeSymbol, standardSymbol);
      }
    }
  }

  /**
   * Start a single data stream
   */
  private async startStream(
    exchangeId: string,
    nativeSymbol: string,
    standardSymbol: string,
  ): Promise<void> {
    const key = `${exchangeId}:${standardSymbol}`;

    if (this.adapters.has(key)) {
      this.logger.warn(`Stream already exists for ${key}`);
      return;
    }

    const exchangeConfig = EXCHANGES_CONFIG.exchanges[exchangeId];
    if (!exchangeConfig) {
      this.logger.error(`Exchange config not found for ${exchangeId}`);
      return;
    }

    try {
      const adapter = this.adapterFactory.createAdapter(
        exchangeConfig,
        (data: TickerData) => this.handleTickerUpdate(data),
        (data: OrderBookData) => this.handleOrderBookUpdate(data),
        (data: KlineData) => this.handleKlineUpdate(data),
        (error: Error) => this.handleAdapterError(exchangeId, standardSymbol, error),
      );

      // Connect ticker stream
      adapter.connect(nativeSymbol, standardSymbol);

      // Connect orderbook stream
      adapter.connectOrderBook(nativeSymbol, standardSymbol);

      // Connect kline streams for all supported intervals
      // Use global configuration for consistency
      for (const interval of SUPPORTED_INTERVALS) {
        try {
          await adapter.connectKline(nativeSymbol, standardSymbol, interval);
          this.logger.log(`✅ Subscribed to ${interval} kline for ${standardSymbol} on ${exchangeId}`);
        } catch (error) {
          this.logger.warn(`Failed to subscribe ${interval} kline for ${standardSymbol}: ${error.message}`);
        }
      }

      this.adapters.set(key, adapter);

      this.logger.log(`Started stream: ${key} (${nativeSymbol})`);
    } catch (error) {
      this.logger.error(`Failed to start stream ${key}: ${error.message}`);
    }
  }

  /**
   * Stop all data streams
   */
  private stopAllStreams(): void {
    for (const [key, adapter] of this.adapters.entries()) {
      try {
        adapter.disconnect();
        this.logger.log(`Stopped stream: ${key}`);
      } catch (error) {
        this.logger.error(`Error stopping stream ${key}: ${error.message}`);
      }
    }
    this.adapters.clear();
  }

  /**
   * Handle ticker data update
   */
  private async handleTickerUpdate(data: TickerData): Promise<void> {
    try {
      // In-memory cache for latest ticker
      const cacheKey = `${data.exchange}:${data.symbol}`;
      this.tickerCache.set(cacheKey, data);

      // Broadcast to WebSocket clients
      this.marketGateway.broadcastTicker(data);

      if (Math.random() < 0.01) {
        this.logger.debug(
          `${data.exchange} ${data.symbol}: $${data.price.toFixed(2)} (${data.priceChangePercent.toFixed(2)}%)`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to handle ticker update: ${error.message}`);
    }
  }

  /**
   * Handle orderbook data update
   */
  private async handleOrderBookUpdate(data: OrderBookData): Promise<void> {
    try {
      // Redis cache key: orderbook:exchange:symbol
      // const cacheKey = `orderbook:${data.exchange}:${data.symbol}`;
      // await this.redis.setex(cacheKey, CACHE_TTL_CONFIG.orderbook, JSON.stringify(data));

      // Broadcast to WebSocket clients
      this.marketGateway.broadcastOrderBook(data);

      if (Math.random() < 0.01) {
        const bestBid = data.bids[0] ? parseFloat(data.bids[0][0]) : 0;
        const bestAsk = data.asks[0] ? parseFloat(data.asks[0][0]) : 0;
        // Only calculate spread if both bid and ask exist
        const spread = (data.bids[0] && data.asks[0]) ? bestAsk - bestBid : 0;
        this.logger.debug(
          `${data.exchange} ${data.symbol} orderbook: bid $${bestBid.toFixed(2)} / ask $${bestAsk.toFixed(2)} / spread $${spread.toFixed(2)}`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to handle orderbook update: ${error.message}`);
    }
  }

  /**
   * Handle kline data update
   */
  private async handleKlineUpdate(data: KlineData): Promise<void> {
    try {
      // Redis cache key: kline:exchange:symbol:interval (latest kline)
      // const cacheKey = `kline:${data.exchange}:${data.symbol}:${data.interval}:latest`;
      // const ttl = this.getKlineCacheTTL(data.interval);
      // await this.redis.setex(cacheKey, ttl, JSON.stringify(data));

      // Broadcast to WebSocket clients
      this.marketGateway.broadcastKline(data);

      if (Math.random() < 0.01) {
        this.logger.debug(
          `${data.exchange} ${data.symbol} ${data.interval} kline: O=${data.open.toFixed(2)} H=${data.high.toFixed(2)} L=${data.low.toFixed(2)} C=${data.close.toFixed(2)} isClosed=${data.isClosed}`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to handle kline update: ${error.message}`);
    }
  }

  /**
   * Handle adapter error
   */
  private handleAdapterError(exchange: string, symbol: string, error: Error): void {
    this.logger.error(`Adapter error [${exchange}:${symbol}]: ${error.message}`);
  }

  /**
   * Get latest ticker data
   */
  async getLatestTicker(exchange: string, symbol: string): Promise<TickerData | null> {
    const cacheKey = `${exchange}:${symbol}`;
    return this.tickerCache.get(cacheKey) || null;
  }

  /**
   * Get all exchange tickers for a specific trading pair
   */
  async getAllExchangeTickers(symbol: string): Promise<TickerData[]> {
    const enabledExchanges = getEnabledExchanges();
    const results: TickerData[] = [];

    for (const exchange of enabledExchanges) {
      const cacheKey = `${exchange.id}:${symbol}`;
      const ticker = this.tickerCache.get(cacheKey);
      if (ticker) {
        results.push(ticker);
      }
    }

    return results;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};

    for (const [key, adapter] of this.adapters.entries()) {
      status[key] = adapter.getConnectionStatus();
    }

    return status;
  }

  /**
   * Fetch historical kline data
   */
  async fetchKlineHistory(
    exchange: string,
    symbol: string,
    interval: string,
    limit: number,
  ): Promise<KlineData[]> {
    // Check Redis cache first
    const cacheKey = `kline:${exchange}:${symbol}:${interval}:history`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Kline cache hit for ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger.warn(`Failed to read kline cache: ${error.message}`);
    }

    // Find adapter
    const adapterKey = `${exchange}:${symbol}`;
    const adapter = this.adapters.get(adapterKey);

    if (!adapter) {
      throw new NotFoundException(`No adapter found for ${exchange}:${symbol}`);
    }

    // Get native symbol from config
    const exchangeConfig = EXCHANGES_CONFIG.exchanges[exchange];
    if (!exchangeConfig) {
      throw new NotFoundException(`Exchange ${exchange} not found`);
    }

    const tradingPairs = getEnabledTradingPairs();
    const pair = tradingPairs.find(p => p.symbol === symbol);
    if (!pair || !pair.exchanges[exchange]) {
      throw new NotFoundException(`Trading pair ${symbol} not found on ${exchange}`);
    }

    const nativeSymbol = pair.exchanges[exchange].nativeSymbol;

    // Fetch from exchange REST API
    try {
      const data = await adapter.fetchKlineHistory(nativeSymbol, symbol, interval, limit);

      // Cache the result
      const ttl = this.getKlineCacheTTL(interval);
      await this.redis.setex(cacheKey, ttl, JSON.stringify(data));

      this.logger.log(`Fetched ${data.length} ${interval} klines for ${exchange}:${symbol}`);

      return data;
    } catch (error) {
      this.logger.error(`Failed to fetch kline history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get kline cache TTL based on interval
   * Now uses configuration from exchanges.config.ts
   */
  private getKlineCacheTTL(interval: string): number {
    return CACHE_TTL_CONFIG.kline[interval as keyof typeof CACHE_TTL_CONFIG.kline]
      || CACHE_TTL_CONFIG.default;
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use getLatestTicker instead
   */
  async getLatestPrice(exchange: string, symbol: string): Promise<TickerData | null> {
    return this.getLatestTicker(exchange, symbol);
  }
}
