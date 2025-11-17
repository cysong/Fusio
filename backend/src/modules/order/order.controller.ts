import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-order.dto';
import { OrderEntity } from './entities/order.entity';

@Controller('orders')
export class OrderController {
  // TODO: replace with real auth context
  private readonly mockUserId = 'demo-user';

  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@Body() dto: CreateOrderDto): Promise<OrderEntity> {
    return this.orderService.createOrder(dto, this.mockUserId);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string): Promise<OrderEntity> {
    return this.orderService.cancelOrder(id, this.mockUserId);
  }

  @Get()
  list(@Query() query: QueryOrdersDto) {
    return this.orderService.listOrders(query, this.mockUserId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.getOrderById(id, this.mockUserId);
  }
}
