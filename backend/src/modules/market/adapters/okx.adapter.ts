import WebSocket from 'ws';
import { BaseExchangeAdapter } from './base-exchange.adapter';
import { TickerData } from '../interfaces/ticker.interface';
import { OrderBookData } from '../interfaces/orderbook.interface';

/**
 * OKX WebSocket V5 Public Ticker Adapter
 *
 * Documentation: https://www.okx.com/docs-v5/en/#public-data-websocket-tickers-channel
 *
 * Subscribe message format:
 * {
 *   "op": "subscribe",
 *   "args": [
 *     {
 *       "channel": "tickers",
 *       "instId": "BTC-USDT"
 *     }
 *   ]
 * }
 *
 * Response data format:
 * {
 *   "arg": {
 *     "channel": "tickers",
 *     "instId": "BTC-USDT"
 *   },
 *   "data": [
 *     {
 *       "instType": "SPOT",
 *       "instId": "BTC-USDT",
 *       "last": "43000.5",
 *       "lastSz": "0.12",
 *       "askPx": "43001",
 *       "askSz": "1.2",
 *       "bidPx": "42999",
 *       "bidSz": "2.1",
 *       "open24h": "42000",
 *       "high24h": "44000",
 *       "low24h": "41800",
 *       "volCcy24h": "123456789.12",
 *       "vol24h": "2890.123",
 *       "ts": "1234567890123",
 *       "sodUtc0": "42500",
 *       "sodUtc8": "42450"
 *     }
 *   ]
 * }
 */
export class OkxAdapter extends BaseExchangeAdapter {
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

      // OKX requires subscription message
      const subscribeMsg = {
        op: 'subscribe',
        args: [
          {
            channel: 'tickers',
            instId: nativeSymbol,
          },
        ],
      };
      this.ws.send(JSON.stringify(subscribeMsg));
      this.logger.log(`Subscribed to tickers channel for ${nativeSymbol}`);

      // Start ping interval to keep connection alive
      this.startPingInterval();
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = data.toString();

        // Handle pong response (plain string, not JSON)
        if (message === 'pong') {
          return;
        }

        // Parse JSON message
        const raw = JSON.parse(message);

        // Handle subscription confirmation
        if (raw.event === 'subscribe') {
          this.logger.log(`Subscription confirmed for ${raw.arg?.instId}`);
          return;
        }

        // Handle error
        if (raw.event === 'error') {
          this.logger.error(`OKX error: ${raw.msg} (code: ${raw.code})`);
          return;
        }

        // Process ticker data
        if (raw.arg && raw.arg.channel === 'tickers' && raw.data && raw.data.length > 0) {
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

  async connectOrderBook(nativeSymbol: string, standardSymbol: string, depth = 5): Promise<void> {
    const wsUrl = this.getOrderBookWebSocketUrl(nativeSymbol);
    this.logger.log(`Connecting to OrderBook ${wsUrl}`);

    this.orderbookWs = new WebSocket(wsUrl);

    this.orderbookWs.on('open', () => {
      this.isOrderbookConnected = true;
      this.resetOrderbookReconnectAttempts();
      this.clearOrderbookReconnectTimer();
      this.logger.log(`OrderBook connected to ${standardSymbol}`);

      // Subscribe to orderbook channel (books5 for 5 levels, books for 400 levels)
      const channel = depth <= 5 ? 'books5' : 'books';
      const subscribeMsg = {
        op: 'subscribe',
        args: [
          {
            channel: channel,
            instId: nativeSymbol,
          },
        ],
      };
      this.orderbookWs.send(JSON.stringify(subscribeMsg));
      this.logger.log(`Subscribed to ${channel} channel for ${nativeSymbol}`);

      // Start ping interval
      this.startOrderbookPingInterval();
    });

    this.orderbookWs.on('message', (data: WebSocket.Data) => {
      try {
        const message = data.toString();

        // Handle pong response
        if (message === 'pong') {
          return;
        }

        // Parse JSON message
        const raw = JSON.parse(message);

        // Handle subscription confirmation
        if (raw.event === 'subscribe') {
          this.logger.log(`OrderBook subscription confirmed for ${raw.arg?.instId}`);
          return;
        }

        // Handle error
        if (raw.event === 'error') {
          this.logger.error(`OKX OrderBook error: ${raw.msg} (code: ${raw.code})`);
          return;
        }

        // Process orderbook data
        if (raw.arg && (raw.arg.channel === 'books' || raw.arg.channel === 'books5') && raw.data && raw.data.length > 0) {
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
    // OKX doesn't require symbol in URL
    return this.config.wsEndpoint;
  }

  protected getOrderBookWebSocketUrl(nativeSymbol: string): string {
    // Same endpoint for orderbook
    return this.config.wsEndpoint;
  }

  protected normalizeTickerData(raw: any, standardSymbol: string): TickerData {
    const data = raw.data[0];
    const lastPrice = parseFloat(data.last);
    const open24h = parseFloat(data.open24h);
    const priceChange = lastPrice - open24h;
    const priceChangePercent = open24h > 0 ? (priceChange / open24h) * 100 : 0;

    return {
      exchange: this.config.id,
      symbol: standardSymbol,
      price: lastPrice,
      priceChange: priceChange,
      priceChangePercent: priceChangePercent,
      volume: parseFloat(data.vol24h),
      high24h: parseFloat(data.high24h),
      low24h: parseFloat(data.low24h),
      timestamp: Date.now(),
      source: {
        nativeSymbol: data.instId,
        exchangeTimestamp: parseInt(data.ts),
      },
    };
  }

  protected normalizeOrderBookData(raw: any, standardSymbol: string): OrderBookData {
    const data = raw.data[0];
    return {
      exchange: this.config.id,
      symbol: standardSymbol,
      bids: data.bids || [],
      asks: data.asks || [],
      timestamp: Date.now(),
      source: {
        nativeSymbol: data.instId || standardSymbol.replace('/', '-'),
        exchangeTimestamp: parseInt(data.ts) || Date.now(),
        updateId: data.seqId,
      },
    };
  }

  /**
   * OKX requires periodic ping to keep connection alive
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.isConnected) {
        this.ws.send('ping');
      }
    }, 15000); // Ping every 15 seconds
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
        this.orderbookWs.send('ping');
      }
    }, 15000); // Ping every 15 seconds
  }

  private stopOrderbookPingInterval(): void {
    if (this.orderbookPingInterval) {
      clearInterval(this.orderbookPingInterval);
      this.orderbookPingInterval = null;
    }
  }
}
