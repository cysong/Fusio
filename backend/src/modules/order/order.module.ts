import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderEntity } from './entities/order.entity';
import { MockOrderExecutor } from './executors/mock-order.executor';
import { RiskEngine } from './risk/risk-engine';

@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity])],
  controllers: [OrderController],
  providers: [OrderService, MockOrderExecutor, RiskEngine],
})
export class OrderModule {}
