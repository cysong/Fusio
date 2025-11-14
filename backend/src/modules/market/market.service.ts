import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { BinanceAdapter } from './adapters/binance.adapter';
import { MarketGateway } from './market.gateway';
import { TickerData } from './interfaces/ticker.interface';

@Injectable()
export class MarketService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketService.name);
  private adapters: Map<string, BinanceAdapter> = new Map();

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly marketGateway: MarketGateway,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing Market Service');
    this.startBinanceStreams();
  }

  onModuleDestroy() {
    this.logger.log('Stopping Market Service');
    this.adapters.forEach((adapter) => adapter.disconnect());
    this.adapters.clear();
  }

  private startBinanceStreams(): void {
    const symbols = ['BTCUSDT', 'ETHUSDT'];

    symbols.forEach((symbol) => {
      const adapter = new BinanceAdapter(
        (data) => this.handleTickerData(data),
        (error) => this.handleError(error),
      );

      adapter.connect(symbol);
      this.adapters.set(symbol, adapter);
    });
  }

  private async handleTickerData(data: TickerData): Promise<void> {
    try {
      const key = `market:ticker:${data.exchange}:${data.symbol}`;
      await this.redis.setex(key, 10, JSON.stringify(data));

      this.marketGateway.broadcastTicker(data);

      if (Math.random() < 0.01) {
        this.logger.debug(
          `Ticker: ${data.symbol} ${data.price} (${data.priceChangePercent}%)`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to handle ticker data', error);
    }
  }

  private handleError(error: Error): void {
    this.logger.error('Market data error', error);
  }

  async getLatestPrice(
    exchange: string,
    symbol: string,
  ): Promise<TickerData | null> {
    const key = `market:ticker:${exchange}:${symbol}`;
    const cached = await this.redis.get(key);

    if (!cached) {
      return null;
    }

    return JSON.parse(cached);
  }
}
