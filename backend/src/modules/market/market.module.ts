import { Module } from '@nestjs/common';
import { MarketService } from './market.service';
import { MarketGateway } from './market.gateway';
import { MarketController } from './market.controller';

@Module({
  controllers: [MarketController],
  providers: [MarketService, MarketGateway],
  exports: [MarketService],
})
export class MarketModule {}
