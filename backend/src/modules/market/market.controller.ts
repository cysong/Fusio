import { Controller, Get, Param } from '@nestjs/common';
import { MarketService } from './market.service';

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('ticker/:exchange/:symbol')
  async getLatestPrice(
    @Param('exchange') exchange: string,
    @Param('symbol') symbol: string,
  ) {
    const data = await this.marketService.getLatestPrice(exchange, symbol);

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
}
