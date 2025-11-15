import WebSocket from 'ws';
import { BaseExchangeAdapter } from './base-exchange.adapter';
import { TickerData } from '../interfaces/ticker.interface';
import { OrderBookData } from '../interfaces/orderbook.interface';

/**
 * Bybit WebSocket V5 Spot Ticker Adapter
 *
 * Documentation: https://bybit-exchange.github.io/docs/v5/websocket/public/ticker
 *
 * Subscribe message format:
 * {
 *   "op": "subscribe",
 *   "args": ["tickers.BTCUSDT"]
 * }
 *
 * Response data format:
 * {
 *   "topic": "tickers.BTCUSDT",
 *   "type": "snapshot",
 *   "data": {
 *     "symbol": "BTCUSDT",
 *     "lastPrice": "43000.00",
 *     "highPrice24h": "44000.00",
 *     "lowPrice24h": "42000.00",
 *     "price24hPcnt": "0.0234",
 *     "volume24h": "12345.67",
 *     ...
 *   },
 *   "ts": 1234567890123
 * }
 */
export class BybitAdapter extends BaseExchangeAdapter {
  private pingInterval: NodeJS.Timeout | null = null;
  private orderbookPingInterval: NodeJS.Timeout | null = null;

  async connect(nativeSymbol: string, standardSymbol: string): Promise<void> {
    const wsUrl = this.getWebSocketUrl(nativeSymbol);
    this.logger.log(`Connecting to ${wsUrl}`);

    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      this.isConnected = true;
      this.resetReconnectAttempts();
      this.clearReconnectTimer();
      this.logger.log(`Connected to ${standardSymbol}`);

      // Bybit requires subscription message
      const subscribeMsg = {
        op: 'subscribe',
        args: [`tickers.${nativeSymbol}`],
      };
      this.ws.send(JSON.stringify(subscribeMsg));
      this.logger.log(`Subscribed to tickers.${nativeSymbol}`);

      // Start ping interval to keep connection alive
      this.startPingInterval();
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const raw = JSON.parse(data.toString());

        // Handle subscription confirmation
        if (raw.op === 'subscribe') {
          this.logger.log(`Subscription confirmed: ${raw.success}`);
          return;
        }

        // Handle pong response
        if (raw.op === 'pong') {
          return;
        }

        // Process ticker data
        if (raw.topic && raw.topic.startsWith('tickers.')) {
          const normalized = this.normalizeTickerData(raw, standardSymbol);
          this.onTickerUpdate(normalized);
        }
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
      this.stopPingInterval();
      this.logger.warn(`WebSocket closed for ${standardSymbol}`);
      this.scheduleReconnect(nativeSymbol, standardSymbol);
    });
  }

  async connectOrderBook(nativeSymbol: string, standardSymbol: string, depth = 50): Promise<void> {
    const wsUrl = this.getOrderBookWebSocketUrl(nativeSymbol);
    this.logger.log(`Connecting to OrderBook ${wsUrl}`);

    this.orderbookWs = new WebSocket(wsUrl);

    this.orderbookWs.on('open', () => {
      this.isOrderbookConnected = true;
      this.resetOrderbookReconnectAttempts();
      this.clearOrderbookReconnectTimer();
      this.logger.log(`OrderBook connected to ${standardSymbol}`);

      // Subscribe to orderbook with depth (1, 50, or 200)
      const subscribeMsg = {
        op: 'subscribe',
        args: [`orderbook.${depth}.${nativeSymbol}`],
      };
      this.orderbookWs.send(JSON.stringify(subscribeMsg));
      this.logger.log(`Subscribed to orderbook.${depth}.${nativeSymbol}`);

      // Start ping interval
      this.startOrderbookPingInterval();
    });

    this.orderbookWs.on('message', (data: WebSocket.Data) => {
      try {
        const raw = JSON.parse(data.toString());

        // Handle subscription confirmation
        if (raw.op === 'subscribe') {
          this.logger.log(`OrderBook subscription confirmed: ${raw.success}`);
          return;
        }

        // Handle pong response
        if (raw.op === 'pong') {
          return;
        }

        // Process orderbook data
        if (raw.topic && raw.topic.startsWith('orderbook.')) {
          const normalized = this.normalizeOrderBookData(raw, standardSymbol);
          if (this.onOrderBookUpdate) {
            this.onOrderBookUpdate(normalized);
          }
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
      this.stopOrderbookPingInterval();
      this.logger.warn(`OrderBook WebSocket closed for ${standardSymbol}`);
      this.scheduleOrderbookReconnect(nativeSymbol, standardSymbol, depth);
    });
  }

  disconnect(): void {
    this.clearReconnectTimer();
    this.clearOrderbookReconnectTimer();
    this.stopPingInterval();
    this.stopOrderbookPingInterval();
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
    // Bybit V5 doesn't require symbol in URL
    return this.config.wsEndpoint;
  }

  protected getOrderBookWebSocketUrl(nativeSymbol: string): string {
    // Same endpoint for orderbook
    return this.config.wsEndpoint;
  }

  protected normalizeTickerData(raw: any, standardSymbol: string): TickerData {
    const data = raw.data;
    const lastPrice = parseFloat(data.lastPrice);
    const price24hPcnt = parseFloat(data.price24hPcnt);

    return {
      exchange: this.config.id,
      symbol: standardSymbol,
      price: lastPrice,
      priceChange: lastPrice * price24hPcnt, // Bybit only provides percentage, calculate absolute value
      priceChangePercent: price24hPcnt * 100, // Convert to percentage
      volume: parseFloat(data.volume24h),
      high24h: parseFloat(data.highPrice24h),
      low24h: parseFloat(data.lowPrice24h),
      timestamp: Date.now(),
      source: {
        nativeSymbol: data.symbol,
        exchangeTimestamp: raw.ts,
      },
    };
  }

  protected normalizeOrderBookData(raw: any, standardSymbol: string): OrderBookData {
    const data = raw.data;
    return {
      exchange: this.config.id,
      symbol: standardSymbol,
      bids: data.b || [],
      asks: data.a || [],
      timestamp: Date.now(),
      source: {
        nativeSymbol: data.s || standardSymbol.replace('/', ''),
        exchangeTimestamp: raw.ts || Date.now(),
        updateId: data.u,
      },
    };
  }

  /**
   * Bybit requires periodic ping to keep connection alive
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.isConnected) {
        this.ws.send(JSON.stringify({ op: 'ping' }));
      }
    }, 20000); // Ping every 20 seconds
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private startOrderbookPingInterval(): void {
    this.orderbookPingInterval = setInterval(() => {
      if (this.orderbookWs && this.isOrderbookConnected) {
        this.orderbookWs.send(JSON.stringify({ op: 'ping' }));
      }
    }, 20000); // Ping every 20 seconds
  }

  private stopOrderbookPingInterval(): void {
    if (this.orderbookPingInterval) {
      clearInterval(this.orderbookPingInterval);
      this.orderbookPingInterval = null;
    }
  }
}
