import { Injectable, Logger } from '@nestjs/common';
import { BaseExchangeAdapter } from '../adapters/base-exchange.adapter';
import { BinanceAdapter } from '../adapters/binance.adapter';
import { BybitAdapter } from '../adapters/bybit.adapter';
import { OkxAdapter } from '../adapters/okx.adapter';
import { TickerData } from '../interfaces/ticker.interface';
import { OrderBookData } from '../interfaces/orderbook.interface';
import { KlineData } from '../interfaces/kline.interface';
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
    onOrderBookUpdate?: (data: OrderBookData) => void,
    onKlineUpdate?: (data: KlineData) => void,
    onError?: (error: Error) => void,
  ): BaseExchangeAdapter {
    this.logger.log(`Creating adapter for ${config.name}`);

    switch (config.id) {
      case 'binance':
        return new BinanceAdapter(config, onTickerUpdate, onOrderBookUpdate, onKlineUpdate, onError);
      case 'bybit':
        return new BybitAdapter(config, onTickerUpdate, onOrderBookUpdate, onKlineUpdate, onError);
      case 'okx':
        return new OkxAdapter(config, onTickerUpdate, onOrderBookUpdate, onKlineUpdate, onError);
      default:
        throw new Error(`Unsupported exchange: ${config.id}`);
    }
  }
}
