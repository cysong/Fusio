import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-order.dto';
import { OrderStatus, OrderType } from './constants/order-status.enum';
import { MockOrderExecutor } from './executors/mock-order.executor';
import { RiskEngine } from './risk/risk-engine';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    private readonly mockExecutor: MockOrderExecutor,
    private readonly riskEngine: RiskEngine,
  ) { }

  async createOrder(dto: CreateOrderDto, userId: string): Promise<OrderEntity> {
    if (dto.type === OrderType.LIMIT && !dto.price) {
      throw new BadRequestException('Limit order requires price');
    }

    const risk = await this.riskEngine.validateNewOrder(userId, dto);
    if (!risk.pass) {
      throw new BadRequestException(risk.message || 'Order rejected by risk');
    }

    const order = this.orderRepo.create({
      userId,
      exchange: dto.exchange,
      symbol: dto.symbol,
      side: dto.side,
      type: dto.type,
      price: dto.price,
      quantity: dto.quantity,
      status: OrderStatus.SUBMITTED,
      clientOrderId: dto.clientOrderId,
    });

    await this.orderRepo.save(order);

    const result = await this.mockExecutor.execute(order);

    order.status = result.status;
    order.filledQuantity = result.filledQuantity;
    order.avgPrice = result.avgPrice;
    order.fee = result.fee;
    order.exchangeOrderId = result.exchangeOrderId;
    order.errorCode = result.errorCode;
    order.errorMessage = result.errorMessage;

    return this.orderRepo.save(order);
  }

  async cancelOrder(id: string, userId: string): Promise<OrderEntity> {
    const order = await this.orderRepo.findOne({ where: { id, userId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if ([OrderStatus.FILLED, OrderStatus.CANCELED, OrderStatus.REJECTED, OrderStatus.EXPIRED].includes(order.status)) {
      return order; // immutable terminal state
    }

    order.status = OrderStatus.CANCELED;
    order.errorCode = undefined;
    order.errorMessage = undefined;

    return this.orderRepo.save(order);
  }

  async getOrderById(id: string, userId: string): Promise<OrderEntity> {
    const order = await this.orderRepo.findOne({ where: { id, userId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async listOrders(query: QueryOrdersDto, userId: string): Promise<{ data: OrderEntity[]; total: number }> {
    const page = Math.max(parseInt(query.page || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(query.pageSize || '20', 10), 1), 100);

    const qb = this.orderRepo.createQueryBuilder('order').where('order.userId = :userId', { userId });

    if (query.exchange) qb.andWhere('order.exchange = :exchange', { exchange: query.exchange });
    if (query.status) qb.andWhere('order.status = :status', { status: query.status });
    if (query.side) qb.andWhere('order.side = :side', { side: query.side });
    if (query.type) qb.andWhere('order.type = :type', { type: query.type });
    if (query.symbol) qb.andWhere('order.symbol = :symbol', { symbol: query.symbol });

    qb.orderBy('order.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }
}
