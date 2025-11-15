import WebSocket from 'ws';
import { BaseExchangeAdapter } from './base-exchange.adapter';
import { TickerData } from '../interfaces/ticker.interface';
import { OrderBookData } from '../interfaces/orderbook.interface';

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

  async connectOrderBook(nativeSymbol: string, standardSymbol: string, depth = 10): Promise<void> {
    const wsUrl = this.getOrderBookWebSocketUrl(nativeSymbol);
    this.logger.log(`Connecting to OrderBook ${wsUrl}`);

    this.orderbookWs = new WebSocket(wsUrl);

    this.orderbookWs.on('open', () => {
      this.isOrderbookConnected = true;
      this.resetOrderbookReconnectAttempts();
      this.clearOrderbookReconnectTimer();
      this.logger.log(`OrderBook connected to ${standardSymbol}`);
    });

    this.orderbookWs.on('message', (data: WebSocket.Data) => {
      try {
        const raw = JSON.parse(data.toString());
        const normalized = this.normalizeOrderBookData(raw, standardSymbol);
        if (this.onOrderBookUpdate) {
          this.onOrderBookUpdate(normalized);
        }
      } catch (error) {
        this.logger.error(`Failed to parse orderbook message: ${error.message}`);
        if (this.onError) {
          this.onError(error);
        }
      }
    });

    this.orderbookWs.on('error', (error: Error) => {
      this.logger.error(`OrderBook WebSocket error for ${standardSymbol}: ${error.message}`);
      if (this.onError) {
        this.onError(error);
      }
    });

    this.orderbookWs.on('close', () => {
      this.isOrderbookConnected = false;
      this.logger.warn(`OrderBook WebSocket closed for ${standardSymbol}`);
      this.scheduleOrderbookReconnect(nativeSymbol, standardSymbol, depth);
    });
  }

  disconnect(): void {
    this.clearReconnectTimer();
    this.clearOrderbookReconnectTimer();
    if (this.ws) {
      this.isConnected = false;
      this.ws.close();
      this.ws = null;
    }
    if (this.orderbookWs) {
      this.isOrderbookConnected = false;
      this.orderbookWs.close();
      this.orderbookWs = null;
    }
    this.logger.log('Disconnected');
  }

  protected getWebSocketUrl(nativeSymbol: string): string {
    return `${this.config.wsEndpoint}/${nativeSymbol}@ticker`;
  }

  protected getOrderBookWebSocketUrl(nativeSymbol: string): string {
    // Use depth10@100ms for 10 levels, updated every 100ms
    return `${this.config.wsEndpoint}/${nativeSymbol}@depth10@100ms`;
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

  protected normalizeOrderBookData(raw: any, standardSymbol: string): OrderBookData {
    return {
      exchange: this.config.id,
      symbol: standardSymbol,
      bids: raw.bids || raw.b || [],
      asks: raw.asks || raw.a || [],
      timestamp: Date.now(),
      source: {
        nativeSymbol: standardSymbol.replace('/', ''),
        exchangeTimestamp: raw.E || Date.now(),
        updateId: raw.lastUpdateId || raw.u,
      },
    };
  }
}
