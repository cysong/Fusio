import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity } from './entities/order.entity';
import { MockOrderExecutor } from './executors/mock-order.executor';
import { OrderGateway } from './order.gateway';
import { OrderStatus } from './constants/order-status.enum';

@Processor('orders')
export class OrderProcessor {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    private readonly executor: MockOrderExecutor,
    private readonly gateway: OrderGateway,
  ) {}

  @Process('create')
  async handleCreate(job: Job<{ orderId: string }>) {
    const { orderId } = job.data;
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) {
      return;
    }

    // Skip if already terminal
    if ([OrderStatus.FILLED, OrderStatus.CANCELED, OrderStatus.REJECTED, OrderStatus.EXPIRED].includes(order.status)) {
      return;
    }

    const result = await this.executor.execute(order);

    order.status = result.status;
    order.filledQuantity = result.filledQuantity;
    order.avgPrice = result.avgPrice;
    order.fee = result.fee;
    order.exchangeOrderId = result.exchangeOrderId;
    order.errorCode = result.errorCode;
    order.errorMessage = result.errorMessage;

    const saved = await this.orderRepo.save(order);
    this.gateway.broadcastUpdate(saved);
  }
}
