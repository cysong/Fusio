import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { TickerData } from './interfaces/ticker.interface';
import { OrderBookData } from './interfaces/orderbook.interface';
import { KlineData } from './interfaces/kline.interface';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/market',
})
export class MarketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MarketGateway.name);
  private connectedClients = 0;

  handleConnection(client: Socket) {
    this.connectedClients++;
    this.logger.log(
      `Client connected: ${client.id} (Total: ${this.connectedClients})`,
    );
  }

  handleDisconnect(client: Socket) {
    this.connectedClients--;
    this.logger.log(
      `Client disconnected: ${client.id} (Total: ${this.connectedClients})`,
    );
  }

  broadcastTicker(data: TickerData): void {
    this.server.emit('ticker', data);
  }

  broadcastOrderBook(data: OrderBookData): void {
    this.server.emit('orderbook', data);
  }

  broadcastKline(data: KlineData): void {
    this.server.emit('kline', data);
  }
}
