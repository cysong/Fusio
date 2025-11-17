import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderEntity } from './entities/order.entity';
import { MockOrderExecutor } from './executors/mock-order.executor';
import { RiskEngine } from './risk/risk-engine';
import { OrderGateway } from './order.gateway';
import { OrderProcessor } from './order.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity]),
    BullModule.registerQueue({
      name: 'orders',
    }),
  ],
  controllers: [OrderController],
  providers: [OrderService, MockOrderExecutor, RiskEngine, OrderGateway, OrderProcessor],
})
export class OrderModule {}
