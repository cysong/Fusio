import WebSocket from 'ws';
import { Logger } from '@nestjs/common';
import { TickerData } from '../interfaces/ticker.interface';

export class BinanceAdapter {
  private readonly logger = new Logger(BinanceAdapter.name);
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 3000;

  private readonly WS_URL = 'wss://stream.binance.com:9443/ws';

  constructor(
    private readonly onDataCallback: (data: TickerData) => void,
    private readonly onErrorCallback?: (error: Error) => void,
  ) {}

  connect(symbol: string): void {
    const stream = `${symbol.toLowerCase()}@ticker`;
    const url = `${this.WS_URL}/${stream}`;

    this.logger.log(`Connecting to Binance WebSocket: ${url}`);

    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      this.logger.log('Binance WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const raw = JSON.parse(data.toString());
        const normalized = this.normalizeTickerData(raw);
        this.onDataCallback(normalized);
      } catch (error) {
        this.logger.error('Failed to parse message', error);
      }
    });

    this.ws.on('error', (error) => {
      this.logger.error('WebSocket error', error);
      this.onErrorCallback?.(error);
    });

    this.ws.on('close', () => {
      this.logger.warn('WebSocket closed');
      this.scheduleReconnect(symbol);
    });
  }

  private normalizeTickerData(raw: any): TickerData {
    return {
      exchange: 'binance',
      symbol: raw.s,
      price: parseFloat(raw.c),
      priceChange: parseFloat(raw.p),
      priceChangePercent: parseFloat(raw.P),
      volume: parseFloat(raw.v),
      timestamp: raw.E,
    };
  }

  private scheduleReconnect(symbol: string): void {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.logger.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.logger.log(
      `Reconnecting in ${this.RECONNECT_DELAY}ms (attempt ${this.reconnectAttempts})`,
    );

    setTimeout(() => {
      this.connect(symbol);
    }, this.RECONNECT_DELAY);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
