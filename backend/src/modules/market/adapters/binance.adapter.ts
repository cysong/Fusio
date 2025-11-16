import WebSocket from 'ws';
import axios from 'axios';
import { BaseExchangeAdapter } from './base-exchange.adapter';
import { TickerData } from '../interfaces/ticker.interface';
import { OrderBookData } from '../interfaces/orderbook.interface';
import { KlineData } from '../interfaces/kline.interface';

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

  async connectKline(nativeSymbol: string, standardSymbol: string, interval: string): Promise<void> {
    // Check if already subscribed
    if (this.isKlineIntervalSubscribed(nativeSymbol, interval)) {
      this.logger.log(`Already subscribed to ${interval} for ${standardSymbol}`);
      return;
    }

    // Store symbol for reconnection
    if (!this.klineNativeSymbol) {
      this.klineNativeSymbol = nativeSymbol;
      this.klineStandardSymbol = standardSymbol;
    }

    // If WebSocket is not created or not connected, initialize it
    if (!this.klineWs || !this.isKlineConnected) {
      await this.initKlineWebSocket(nativeSymbol, standardSymbol);
    }

    // Wait for connection
    await this.waitForKlineConnection();

    // Subscribe to this interval (Binance uses combined stream, so just mark as subscribed)
    this.markKlineIntervalSubscribed(nativeSymbol, interval);
    this.logger.log(`Subscribed to ${interval} kline for ${standardSymbol}`);
  }

  /**
   * Initialize K-line WebSocket with combined stream for all intervals
   */
  private async initKlineWebSocket(nativeSymbol: string, standardSymbol: string): Promise<void> {
    if (this.klineWs && this.isKlineConnected) {
      return;
    }

    // Binance combined stream URL (we'll add subscriptions dynamically)
    // For now, start with a single stream, we can't subscribe to all at once in URL
    // We need to use a different approach: separate connections or combined stream endpoint
    // Let's use combined stream: wss://stream.binance.com:9443/stream
    // But for simplicity, we'll create separate connections (Binance doesn't support subscription messages)

    // Actually, Binance WebSocket doesn't support subscription after connection
    // So we need to reconnect with all streams in the URL
    // For now, let's use a workaround: create connection when first interval is requested

    const mappedInterval = this.mapInterval('1m'); // Start with 1m, will be updated
    const wsUrl = `${this.config.wsEndpoint}/${nativeSymbol}@kline_${mappedInterval}`;
    this.logger.log(`Initializing Kline WebSocket: ${wsUrl}`);

    this.klineWs = new WebSocket(wsUrl);

    this.klineWs.on('open', () => {
      this.isKlineConnected = true;
      this.resetKlineReconnectAttempts();
      this.clearKlineReconnectTimer();
      this.logger.log(`Kline WebSocket connected for ${standardSymbol}`);
    });

    this.klineWs.on('message', (data: WebSocket.Data) => {
      try {
        const raw = JSON.parse(data.toString());
        // Binance kline data is nested under 'k' property
        if (raw.k) {
          // Determine interval from the response
          const interval = this.reverseMapInterval(raw.k.i);
          const normalized = this.normalizeKlineData(raw.k, standardSymbol, interval);
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
      this.logger.warn(`Kline WebSocket closed for ${standardSymbol}`);
      // Reconnect with all subscribed intervals
      this.reconnectKlineWithAllIntervals(nativeSymbol, standardSymbol);
    });
  }

  /**
   * Reconnect K-line WebSocket with all subscribed intervals
   * Binance doesn't support dynamic subscription, so we need to reconnect with combined stream
   */
  private reconnectKlineWithAllIntervals(nativeSymbol: string, standardSymbol: string): void {
    // Get all subscribed intervals
    const intervals: string[] = [];
    for (const key of this.klineSubscriptions) {
      const [symbol, interval] = key.split(':');
      if (symbol === nativeSymbol) {
        intervals.push(interval);
      }
    }

    if (intervals.length === 0) {
      return;
    }

    // Build combined stream URL
    const streams = intervals.map(interval => {
      const mappedInterval = this.mapInterval(interval);
      return `${nativeSymbol}@kline_${mappedInterval}`;
    }).join('/');

    const wsUrl = `${this.config.wsEndpoint}/stream?streams=${streams}`;
    this.logger.log(`Reconnecting Kline WebSocket with ${intervals.length} streams: ${wsUrl}`);

    // Close existing connection
    if (this.klineWs) {
      this.klineWs.removeAllListeners();
      this.klineWs.close();
    }

    // Create new connection
    this.isKlineConnected = false;
    this.klineWs = new WebSocket(wsUrl);

    this.klineWs.on('open', () => {
      this.isKlineConnected = true;
      this.resetKlineReconnectAttempts();
      this.clearKlineReconnectTimer();
      this.logger.log(`Kline WebSocket reconnected for ${standardSymbol} with ${intervals.length} intervals`);
    });

    this.klineWs.on('message', (data: WebSocket.Data) => {
      try {
        const raw = JSON.parse(data.toString());
        // Combined stream format: { stream: "btcusdt@kline_1m", data: {...} }
        if (raw.data && raw.data.k) {
          const interval = this.reverseMapInterval(raw.data.k.i);
          const normalized = this.normalizeKlineData(raw.data.k, standardSymbol, interval);
          if (this.onKlineUpdate) {
            this.onKlineUpdate(normalized);
          }
        } else if (raw.k) {
          // Single stream format
          const interval = this.reverseMapInterval(raw.k.i);
          const normalized = this.normalizeKlineData(raw.k, standardSymbol, interval);
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
      this.logger.warn(`Kline WebSocket closed for ${standardSymbol}`);
      this.scheduleKlineReconnect(nativeSymbol, standardSymbol, 'all');
    });
  }

  async fetchKlineHistory(
    nativeSymbol: string,
    standardSymbol: string,
    interval: string,
    limit: number,
  ): Promise<KlineData[]> {
    const mappedInterval = this.mapInterval(interval);
    const url = 'https://api.binance.com/api/v3/klines';

    try {
      this.logger.log(`Fetching ${limit} ${interval} klines for ${standardSymbol} from Binance REST API`);

      const response = await axios.get(url, {
        params: {
          symbol: nativeSymbol.toUpperCase(),
          interval: mappedInterval,
          limit: Math.min(limit, 1000), // Binance max is 1000
        },
      });

      // Binance kline format: [
      //   [timestamp, open, high, low, close, volume, closeTime, quoteVolume, trades, takerBuyBase, takerBuyQuote, ignore]
      // ]
      return response.data.map((kline: any[]) => ({
        exchange: this.config.id,
        symbol: standardSymbol,
        interval,
        timestamp: kline[0], // Opening time
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
        isClosed: true, // Historical data is always closed
        source: {
          nativeSymbol: nativeSymbol,
          exchangeTimestamp: kline[6], // Closing time
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

  protected normalizeKlineData(raw: any, standardSymbol: string, interval: string): KlineData {
    return {
      exchange: this.config.id,
      symbol: standardSymbol,
      interval,
      timestamp: raw.t, // Opening time
      open: parseFloat(raw.o),
      high: parseFloat(raw.h),
      low: parseFloat(raw.l),
      close: parseFloat(raw.c),
      volume: parseFloat(raw.v),
      isClosed: raw.x, // Is this kline closed? (critical field!)
      source: {
        nativeSymbol: raw.s?.toLowerCase() || '',
        exchangeTimestamp: raw.T, // Closing time
      },
    };
  }

  /**
   * Map standard interval format to Binance-specific format
   * Now uses configuration from ExchangeConfig
   */
  private mapInterval(interval: string): string {
    return this.config.intervalMapping.toExchange[interval] || '1m';
  }

  /**
   * Map Binance interval format back to standard format
   * Now uses configuration from ExchangeConfig
   */
  private reverseMapInterval(binanceInterval: string): string {
    return this.config.intervalMapping.fromExchange[binanceInterval] || '1m';
  }
}
