import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { OrderEntity } from './entities/order.entity';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/orders',
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
})
export class OrderGateway {
  private readonly logger = new Logger(OrderGateway.name);

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() data: { room?: string; userId?: string },
    @ConnectedSocket() client: any,
  ) {
    const room = data?.room || (data?.userId ? `user:${data.userId}` : null);
    if (!room) {
      this.logger.warn(`Join event missing room/userId from client ${client.id}`);
      return;
    }
    client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
  }

  broadcastUpdate(order: OrderEntity) {
    // TODO: replace mock user room with real auth/rooms
    const room = `user:${order.userId}`;
    this.server.to(room).emit('orders:update', {
      id: order.id,
      status: order.status,
      symbol: order.symbol,
      exchange: order.exchange,
      side: order.side,
      type: order.type,
      price: order.price,
      quantity: order.quantity,
      filledQuantity: order.filledQuantity,
      avgPrice: order.avgPrice,
      fee: order.fee,
      errorCode: order.errorCode,
      errorMessage: order.errorMessage,
      updatedAt: order.updatedAt,
    });
  }
}
