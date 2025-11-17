import {
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { OrderEntity } from './entities/order.entity';

@WebSocketGateway({
  namespace: '/orders',
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
})
export class OrderGateway {
  @WebSocketServer()
  server: Server;

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
