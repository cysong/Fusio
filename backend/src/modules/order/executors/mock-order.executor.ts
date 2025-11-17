import { Injectable } from '@nestjs/common';
import { OrderEntity } from '../entities/order.entity';
import { OrderStatus } from '../constants/order-status.enum';

export interface MockExecuteResult {
  status: OrderStatus;
  filledQuantity: number;
  avgPrice?: number;
  fee?: number;
  exchangeOrderId?: string;
  errorCode?: string;
  errorMessage?: string;
}

interface MockConfig {
  successRate: number;
  partialFillRate: number;
  minLatencyMs: number;
  maxLatencyMs: number;
}

@Injectable()
export class MockOrderExecutor {
  private readonly config: MockConfig = {
    successRate: 0.9,
    partialFillRate: 0.1,
    minLatencyMs: 50,
    maxLatencyMs: 1500,
  };

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private pickLatency(): number {
    const { minLatencyMs, maxLatencyMs } = this.config;
    return Math.floor(Math.random() * (maxLatencyMs - minLatencyMs + 1)) + minLatencyMs;
  }

  private generateExchangeId(): string {
    return `mock_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  }

  async execute(order: OrderEntity): Promise<MockExecuteResult> {
    // Simulate network/processing latency
    await this.sleep(this.pickLatency());

    const roll = Math.random();
    if (roll > this.config.successRate) {
      return {
        status: OrderStatus.REJECTED,
        filledQuantity: 0,
        errorCode: 'MOCK_REJECTED',
        errorMessage: 'Mock exchange rejected the order',
      };
    }

    const exchangeOrderId = this.generateExchangeId();

    // Partial fill branch
    if (roll > this.config.successRate - this.config.partialFillRate) {
      const filledQuantity = Number(order.quantity) * (0.2 + Math.random() * 0.5); // 20%-70%
      const avgPrice = order.price || Number((Math.random() * 1000).toFixed(2));
      const fee = avgPrice * filledQuantity * 0.0005; // 5 bps
      return {
        status: OrderStatus.PARTIALLY_FILLED,
        filledQuantity,
        avgPrice,
        fee,
        exchangeOrderId,
      };
    }

    // Full fill
    const avgPrice = order.price || Number((Math.random() * 1000).toFixed(2));
    const fee = avgPrice * Number(order.quantity) * 0.0005;
    return {
      status: OrderStatus.FILLED,
      filledQuantity: Number(order.quantity),
      avgPrice,
      fee,
      exchangeOrderId,
    };
  }
}
