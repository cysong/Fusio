import WebSocket from 'ws';
import axios from 'axios';
import { BaseExchangeAdapter } from './base-exchange.adapter';
import { TickerData } from '../interfaces/ticker.interface';
import { OrderBookData } from '../interfaces/orderbook.interface';
import { KlineData } from '../interfaces/kline.interface';

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

        // Process kline data
        if (raw.arg && raw.arg.channel && raw.arg.channel.startsWith('candle') && raw.data && raw.data.length > 0) {
          const channelParts = raw.arg.channel.split('candle');
          const interval = this.reverseMapInterval(channelParts[1]);
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

  async connectKline(nativeSymbol: string, standardSymbol: string, interval: string): Promise<void> {
    const wsUrl = this.getWebSocketUrl(nativeSymbol);
    this.logger.log(`Connecting to Kline ${wsUrl}`);

    this.klineWs = new WebSocket(wsUrl);

    this.klineWs.on('open', () => {
      this.isKlineConnected = true;
      this.resetKlineReconnectAttempts();
      this.clearKlineReconnectTimer();
      this.logger.log(`Kline connected to ${standardSymbol} ${interval}`);

      // Subscribe to candle channel
      const mappedInterval = this.mapInterval(interval);
      const subscribeMsg = {
        op: 'subscribe',
        args: [
          {
            channel: `candle${mappedInterval}`,
            instId: nativeSymbol,
          },
        ],
      };
      this.klineWs.send(JSON.stringify(subscribeMsg));
      this.logger.log(`Subscribed to candle${mappedInterval} channel for ${nativeSymbol}`);

      // Start ping interval
      this.startKlinePingInterval();
    });

    this.klineWs.on('message', (data: WebSocket.Data) => {
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
          this.logger.log(`Kline subscription confirmed for ${raw.arg?.instId}`);
          return;
        }

        // Handle error
        if (raw.event === 'error') {
          this.logger.error(`OKX Kline error: ${raw.msg} (code: ${raw.code})`);
          return;
        }

        // Process kline data
        if (raw.arg && raw.arg.channel && raw.arg.channel.startsWith('candle') && raw.data && raw.data.length > 0) {
          const channelParts = raw.arg.channel.split('candle');
          const standardInterval = this.reverseMapInterval(channelParts[1]);
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
    const url = 'https://www.okx.com/api/v5/market/candles';
    
    try {
      this.logger.log(`Fetching ${limit} ${interval} klines for ${standardSymbol} from OKX REST API`);
      
      const response = await axios.get(url, {
        params: {
          instId: nativeSymbol,
          bar: mappedInterval,
          limit: Math.min(limit, 300), // OKX max is 300
        },
      });

      const data = response.data.data;
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid response format from OKX API');
      }

      // OKX kline format (array): [timestamp, open, high, low, close, volume, volCcy, volCcyQuote, confirm]
      // Index 8: confirm ('0' = not closed, '1' = closed)
      // Note: OKX returns in descending order (newest first), so we need to reverse
      return data.reverse().map((kline: any[]) => ({
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

  protected normalizeKlineData(raw: any, standardSymbol: string, interval: string): KlineData {
    // OKX kline data format: { arg, data: [array of kline] }
    // Each kline: [timestamp, open, high, low, close, volume, volCcy, volCcyQuote, confirm]
    const klineArray = raw.data;
    if (!klineArray || klineArray.length === 0) {
      throw new Error('Invalid kline data from OKX');
    }

    const kline = klineArray[0]; // Usually only one kline per update
    
    return {
      exchange: this.config.id,
      symbol: standardSymbol,
      interval,
      timestamp: parseInt(kline[0]), // Start time
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
      isClosed: kline[8] === '1', // OKX uses '0' = not closed, '1' = closed
      source: {
        nativeSymbol: standardSymbol.replace('/', '-'),
        exchangeTimestamp: parseInt(kline[0]),
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

  private startKlinePingInterval(): void {
    this.klinePingInterval = setInterval(() => {
      if (this.klineWs && this.isKlineConnected) {
        this.klineWs.send('ping');
      }
    }, 15000); // Ping every 15 seconds
  }

  private stopKlinePingInterval(): void {
    if (this.klinePingInterval) {
      clearInterval(this.klinePingInterval);
      this.klinePingInterval = null;
    }
  }

  /**
   * Map standard interval format to OKX-specific format
   */
  private mapInterval(interval: string): string {
    const intervalMap: Record<string, string> = {
      '1s': '1s',
      '1m': '1m',
      '15m': '15m',
      '1h': '1H',
      '1d': '1D',
      '1w': '1W',
    };
    return intervalMap[interval] || '1m';
  }

  /**
   * Reverse map OKX interval format to standard format
   */
  private reverseMapInterval(okxInterval: string): string {
    const reverseMap: Record<string, string> = {
      '1s': '1s',
      '1m': '1m',
      '15m': '15m',
      '1H': '1h',
      '1D': '1d',
      '1W': '1w',
    };
    return reverseMap[okxInterval] || '1m';
  }
}
