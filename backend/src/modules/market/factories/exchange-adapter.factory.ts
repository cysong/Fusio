import { Injectable, Logger } from '@nestjs/common';
import { BaseExchangeAdapter } from '../adapters/base-exchange.adapter';
import { BinanceAdapter } from '../adapters/binance.adapter';
import { BybitAdapter } from '../adapters/bybit.adapter';
import { TickerData } from '../interfaces/ticker.interface';
import { ExchangeConfig } from '../interfaces/exchange-config.interface';

/**
 * Factory for creating exchange adapters
 * Implements the Factory Pattern for dynamic adapter instantiation
 */
@Injectable()
export class ExchangeAdapterFactory {
  private readonly logger = new Logger(ExchangeAdapterFactory.name);

  /**
   * Create an adapter instance for the specified exchange
   */
  createAdapter(
    config: ExchangeConfig,
    onTickerUpdate: (data: TickerData) => void,
    onError?: (error: Error) => void,
  ): BaseExchangeAdapter {
    this.logger.log(`Creating adapter for ${config.name}`);

    switch (config.id) {
      case 'binance':
        return new BinanceAdapter(config, onTickerUpdate, onError);
      case 'bybit':
        return new BybitAdapter(config, onTickerUpdate, onError);
      default:
        throw new Error(`Unsupported exchange: ${config.id}`);
    }
  }
}
