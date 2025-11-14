import WebSocket from 'ws';
import { BaseExchangeAdapter } from './base-exchange.adapter';
import { TickerData } from '../interfaces/ticker.interface';

/**
 * Binance WebSocket adapter
 * Implements Binance-specific WebSocket connection and data normalization
 */
export class BinanceAdapter extends BaseExchangeAdapter {
  async connect(nativeSymbol: string, standardSymbol: string): Promise<void> {
    const wsUrl = this.getWebSocketUrl(nativeSymbol);
    this.logger.log(`Connecting to ${wsUrl}`);

    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      this.isConnected = true;
      this.resetReconnectAttempts();
      this.clearReconnectTimer();
      this.logger.log(`Connected to ${standardSymbol}`);
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const raw = JSON.parse(data.toString());
        const normalized = this.normalizeTickerData(raw, standardSymbol);
        this.onTickerUpdate(normalized);
      } catch (error) {
        this.logger.error(`Failed to parse message: ${error.message}`);
        if (this.onError) {
          this.onError(error);
        }
      }
    });

    this.ws.on('error', (error: Error) => {
      this.logger.error(`WebSocket error for ${standardSymbol}: ${error.message}`);
      if (this.onError) {
        this.onError(error);
      }
    });

    this.ws.on('close', () => {
      this.isConnected = false;
      this.logger.warn(`WebSocket closed for ${standardSymbol}`);
      this.scheduleReconnect(nativeSymbol, standardSymbol);
    });
  }

  disconnect(): void {
    this.clearReconnectTimer();
    if (this.ws) {
      this.isConnected = false;
      this.ws.close();
      this.ws = null;
      this.logger.log('Disconnected');
    }
  }

  protected getWebSocketUrl(nativeSymbol: string): string {
    return `${this.config.wsEndpoint}/${nativeSymbol}@ticker`;
  }

  protected normalizeTickerData(raw: any, standardSymbol: string): TickerData {
    return {
      exchange: this.config.id,
      symbol: standardSymbol,
      price: parseFloat(raw.c),
      priceChange: parseFloat(raw.p),
      priceChangePercent: parseFloat(raw.P),
      volume: parseFloat(raw.v),
      high24h: parseFloat(raw.h),
      low24h: parseFloat(raw.l),
      timestamp: Date.now(),
      source: {
        nativeSymbol: raw.s,
        exchangeTimestamp: raw.E,
      },
    };
  }
}
