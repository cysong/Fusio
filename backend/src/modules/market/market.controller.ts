import { Controller, Get, Param, Query } from '@nestjs/common';
import { MarketService } from './market.service';
import { TickerData } from './interfaces/ticker.interface';
import { KlineData } from './interfaces/kline.interface';

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  /**
   * Get ticker for a specific exchange and trading pair
   * GET /api/market/ticker/:exchange/:base/:quote
   * Example: /api/market/ticker/binance/BTC/USDT
   */
  @Get('ticker/:exchange/:base/:quote')
  async getTicker(
    @Param('exchange') exchange: string,
    @Param('base') base: string,
    @Param('quote') quote: string,
  ) {
    const symbol = `${base}/${quote}`;
    const data = await this.marketService.getLatestTicker(exchange, symbol);

    if (!data) {
      return {
        success: false,
        message: 'No data available',
      };
    }

    return {
      success: true,
      data,
    };
  }

  /**
   * Get tickers from all exchanges for a specific trading pair
   * GET /api/market/ticker/:base/:quote/all
   * Example: /api/market/ticker/BTC/USDT/all
   */
  @Get('ticker/:base/:quote/all')
  async getAllExchangeTickers(
    @Param('base') base: string,
    @Param('quote') quote: string,
  ): Promise<{ success: boolean; data: TickerData[] }> {
    const symbol = `${base}/${quote}`;
    const data = await this.marketService.getAllExchangeTickers(symbol);

    return {
      success: true,
      data,
    };
  }

  /**
   * Get connection status for all streams
   * GET /api/market/status
   */
  @Get('status')
  getStatus(): Record<string, boolean> {
    return this.marketService.getConnectionStatus();
  }

  /**
   * Get historical kline data for a specific exchange and trading pair
   * GET /api/market/kline/:exchange/:base/:quote
   * Example: /api/market/kline/binance/BTC/USDT?interval=1m&limit=500
   */
  @Get('kline/:exchange/:base/:quote')
  async getKline(
    @Param('exchange') exchange: string,
    @Param('base') base: string,
    @Param('quote') quote: string,
    @Query('interval') interval: string = '1m',
    @Query('limit') limit: string = '500',
  ): Promise<KlineData[]> {
    const symbol = `${base}/${quote}`;
    const limitNumber = parseInt(limit, 10);
    
    if (isNaN(limitNumber) || limitNumber <= 0 || limitNumber > 1000) {
      throw new Error('Invalid limit parameter. Must be between 1 and 1000.');
    }

    const validIntervals = ['1s', '1m', '15m', '1h', '1d', '1w'];
    if (!validIntervals.includes(interval)) {
      throw new Error(`Invalid interval. Must be one of: ${validIntervals.join(', ')}`);
    }

    return await this.marketService.fetchKlineHistory(
      exchange,
      symbol,
      interval,
      limitNumber,
    );
  }
}
