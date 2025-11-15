import WebSocket from 'ws';
import axios from 'axios';
import { BaseExchangeAdapter } from './base-exchange.adapter';
import { TickerData } from '../interfaces/ticker.interface';
import { OrderBookData } from '../interfaces/orderbook.interface';
import { KlineData } from '../interfaces/kline.interface';

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
  private klinePingInterval: NodeJS.Timeout | null = null;

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

        // Process kline data
        if (raw.topic && raw.topic.startsWith('kline.')) {
          const topicParts = raw.topic.split('.');
          const interval = this.reverseMapInterval(topicParts[1]);
          const normalized = this.normalizeKlineData(raw, standardSymbol, interval);
          if (this.onKlineUpdate) {
            this.onKlineUpdate(normalized);
          }
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

  async connectKline(nativeSymbol: string, standardSymbol: string, interval: string): Promise<void> {
    const wsUrl = this.getWebSocketUrl(nativeSymbol);
    this.logger.log(`Connecting to Kline ${wsUrl}`);

    this.klineWs = new WebSocket(wsUrl);

    this.klineWs.on('open', () => {
      this.isKlineConnected = true;
      this.resetKlineReconnectAttempts();
      this.clearKlineReconnectTimer();
      this.logger.log(`Kline connected to ${standardSymbol} ${interval}`);

      // Subscribe to kline
      const mappedInterval = this.mapInterval(interval);
      const subscribeMsg = {
        op: 'subscribe',
        args: [`kline.${mappedInterval}.${nativeSymbol}`],
      };
      this.klineWs.send(JSON.stringify(subscribeMsg));
      this.logger.log(`Subscribed to kline.${mappedInterval}.${nativeSymbol}`);

      // Start ping interval
      this.startKlinePingInterval();
    });

    this.klineWs.on('message', (data: WebSocket.Data) => {
      try {
        const raw = JSON.parse(data.toString());

        // Handle subscription confirmation
        if (raw.op === 'subscribe') {
          this.logger.log(`Kline subscription confirmed: ${raw.success}`);
          return;
        }

        // Handle pong response
        if (raw.op === 'pong') {
          return;
        }

        // Process kline data
        if (raw.topic && raw.topic.startsWith('kline.')) {
          const topicParts = raw.topic.split('.');
          const mappedInterval = topicParts[1];
          const standardInterval = this.reverseMapInterval(mappedInterval);
          const normalized = this.normalizeKlineData(raw, standardSymbol, standardInterval);
          if (this.onKlineUpdate) {
            this.onKlineUpdate(normalized);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to parse kline message: ${error.message}`);
        if (this.onError) {
          this.onError(error);
        }
      }
    });

    this.klineWs.on('error', (error: Error) => {
      this.logger.error(`Kline WebSocket error for ${standardSymbol}: ${error.message}`);
      if (this.onError) {
        this.onError(error);
      }
    });

    this.klineWs.on('close', () => {
      this.isKlineConnected = false;
      this.stopKlinePingInterval();
      this.logger.warn(`Kline WebSocket closed for ${standardSymbol}`);
      this.scheduleKlineReconnect(nativeSymbol, standardSymbol, interval);
    });
  }

  async fetchKlineHistory(
    nativeSymbol: string,
    standardSymbol: string,
    interval: string,
    limit: number,
  ): Promise<KlineData[]> {
    const mappedInterval = this.mapInterval(interval);
    const url = 'https://api.bybit.com/v5/market/kline';
    
    try {
      this.logger.log(`Fetching ${limit} ${interval} klines for ${standardSymbol} from Bybit REST API`);
      
      const response = await axios.get(url, {
        params: {
          category: 'spot',
          symbol: nativeSymbol,
          interval: mappedInterval,
          limit: Math.min(limit, 1000), // Bybit max is 1000
        },
      });

      const list = response.data.result.list;
      if (!list || !Array.isArray(list)) {
        throw new Error('Invalid response format from Bybit API');
      }

      // Bybit kline format (array): [startTime, open, high, low, close, volume, turnover]
      // Note: Bybit returns in descending order (newest first), so we need to reverse
      return list.reverse().map((kline: any[]) => ({
        exchange: this.config.id,
        symbol: standardSymbol,
        interval,
        timestamp: parseInt(kline[0]), // Start time
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
        isClosed: true, // Historical data is always closed
        source: {
          nativeSymbol: nativeSymbol,
          exchangeTimestamp: parseInt(kline[0]),
        },
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch kline history: ${error.message}`);
      throw error;
    }
  }

  disconnect(): void {
    this.clearReconnectTimer();
    this.clearOrderbookReconnectTimer();
    this.clearKlineReconnectTimer();
    this.stopPingInterval();
    this.stopOrderbookPingInterval();
    this.stopKlinePingInterval();
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
    if (this.klineWs) {
      this.isKlineConnected = false;
      this.klineWs.close();
      this.klineWs = null;
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

  protected normalizeKlineData(raw: any, standardSymbol: string, interval: string): KlineData {
    // Bybit kline data format: { topic, type, data: [array of kline], ts }
    // Each kline: { start, end, interval, open, close, high, low, volume, turnover, confirm, timestamp }
    const klineArray = raw.data;
    if (!klineArray || klineArray.length === 0) {
      throw new Error('Invalid kline data from Bybit');
    }

    const kline = klineArray[0]; // Usually only one kline per update
    
    return {
      exchange: this.config.id,
      symbol: standardSymbol,
      interval,
      timestamp: kline.start, // Start time
      open: parseFloat(kline.open),
      high: parseFloat(kline.high),
      low: parseFloat(kline.low),
      close: parseFloat(kline.close),
      volume: parseFloat(kline.volume),
      isClosed: kline.confirm, // Bybit uses 'confirm' field (true = closed)
      source: {
        nativeSymbol: standardSymbol.replace('/', ''),
        exchangeTimestamp: kline.timestamp || kline.end,
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

  private startKlinePingInterval(): void {
    this.klinePingInterval = setInterval(() => {
      if (this.klineWs && this.isKlineConnected) {
        this.klineWs.send(JSON.stringify({ op: 'ping' }));
      }
    }, 20000); // Ping every 20 seconds
  }

  private stopKlinePingInterval(): void {
    if (this.klinePingInterval) {
      clearInterval(this.klinePingInterval);
      this.klinePingInterval = null;
    }
  }

  /**
   * Map standard interval format to Bybit-specific format
   */
  private mapInterval(interval: string): string {
    const intervalMap: Record<string, string> = {
      '1s': '1',      // Bybit uses just the number
      '1m': '1',
      '15m': '15',
      '1h': '60',
      '1d': 'D',
      '1w': 'W',
    };
    return intervalMap[interval] || '1';
  }

  /**
   * Reverse map Bybit interval format to standard format
   */
  private reverseMapInterval(bybitInterval: string): string {
    const reverseMap: Record<string, string> = {
      '1': '1m',
      '15': '15m',
      '60': '1h',
      'D': '1d',
      'W': '1w',
    };
    return reverseMap[bybitInterval] || '1m';
  }
}
