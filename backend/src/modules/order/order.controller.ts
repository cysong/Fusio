import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-order.dto';
import { OrderEntity } from './entities/order.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: User): Promise<OrderEntity> {
    return this.orderService.createOrder(dto, user.id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: User): Promise<OrderEntity> {
    return this.orderService.cancelOrder(id, user.id);
  }

  @Get()
  list(@Query() query: QueryOrdersDto, @CurrentUser() user: User) {
    return this.orderService.listOrders(query, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.orderService.getOrderById(id, user.id);
  }
}
