import { Controller, Get, Param } from '@nestjs/common';
import { MarketService } from './market.service';
import { TickerData } from './interfaces/ticker.interface';

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
}
