import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity } from './entities/order.entity';
import { MockOrderExecutor } from './executors/mock-order.executor';
import { OrderGateway } from './order.gateway';
import { OrderStatus } from './constants/order-status.enum';

interface OrderJob {
  orderId: string;
}

@Injectable()
export class OrderJobService {
  private readonly logger = new Logger(OrderJobService.name);
  private queue: OrderJob[] = [];
  private processing = false;

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    private readonly executor: MockOrderExecutor,
    private readonly gateway: OrderGateway,
  ) {}

  enqueue(orderId: string) {
    this.queue.push({ orderId });
    void this.process();
  }

  private async process() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) continue;

      const order = await this.orderRepo.findOne({ where: { id: job.orderId } });
      if (!order) {
        this.logger.warn(`Order not found for job: ${job.orderId}`);
        continue;
      }

      // Skip if already in terminal state (e.g., canceled)
      if ([OrderStatus.FILLED, OrderStatus.CANCELED, OrderStatus.REJECTED, OrderStatus.EXPIRED].includes(order.status)) {
        continue;
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

    this.processing = false;
  }
}
