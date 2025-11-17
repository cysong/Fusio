import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from '../dto/create-order.dto';

export interface RiskResult {
  pass: boolean;
  code?: string;
  message?: string;
}

@Injectable()
export class RiskEngine {
  async validateNewOrder(_userId: string, _dto: CreateOrderDto): Promise<RiskResult> {
    // Placeholder for future rules (balance/minimum size/price protection)
    return { pass: true };
  }

  async validateCancel(_userId: string, _orderId: string): Promise<RiskResult> {
    return { pass: true };
  }
}
