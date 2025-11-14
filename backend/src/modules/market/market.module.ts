import { Module } from '@nestjs/common';
import { MarketService } from './market.service';
import { MarketGateway } from './market.gateway';
import { MarketController } from './market.controller';
import { ExchangeAdapterFactory } from './factories/exchange-adapter.factory';

@Module({
  controllers: [MarketController],
  providers: [MarketService, MarketGateway, ExchangeAdapterFactory],
  exports: [MarketService],
})
export class MarketModule {}
