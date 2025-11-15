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
    const mappedInterval = this.mapInterval(interval);
    const wsUrl = `${this.config.wsEndpoint}/${nativeSymbol}@kline_${mappedInterval}`;
    this.logger.log(`Connecting to Kline ${wsUrl}`);

    this.klineWs = new WebSocket(wsUrl);

    this.klineWs.on('open', () => {
      this.isKlineConnected = true;
      this.resetKlineReconnectAttempts();
      this.clearKlineReconnectTimer();
      this.logger.log(`Kline connected to ${standardSymbol} ${interval}`);
    });

    this.klineWs.on('message', (data: WebSocket.Data) => {
      try {
        const raw = JSON.parse(data.toString());
        // Binance kline data is nested under 'k' property
        if (raw.k) {
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
   */
  private mapInterval(interval: string): string {
    const intervalMap: Record<string, string> = {
      '1s': '1s',
      '1m': '1m',
      '15m': '15m',
      '1h': '1h',
      '1d': '1d',
      '1w': '1w',
    };
    return intervalMap[interval] || '1m';
  }
}
