import { Logger } from '@nestjs/common';
import { TickerData } from '../interfaces/ticker.interface';
import { OrderBookData } from '../interfaces/orderbook.interface';
import { KlineData } from '../interfaces/kline.interface';
import { ExchangeConfig } from '../interfaces/exchange-config.interface';

/**
 * Base class for exchange adapters
 * Provides common functionality and enforces interface for all exchange integrations
 */
export abstract class BaseExchangeAdapter {
  protected logger: Logger;
  protected ws: any = null;
  protected orderbookWs: any = null;
  protected klineWs: any = null;

  // K-line subscription management
  protected klineSubscriptions: Set<string> = new Set();
  protected klineConnectionPromise: Promise<void> | null = null;
  protected klineNativeSymbol: string | null = null;
  protected klineStandardSymbol: string | null = null;

  protected reconnectAttempts = 0;
  protected reconnectTimer: NodeJS.Timeout | null = null;
  protected orderbookReconnectAttempts = 0;
  protected orderbookReconnectTimer: NodeJS.Timeout | null = null;
  protected klineReconnectAttempts = 0;
  protected klineReconnectTimer: NodeJS.Timeout | null = null;
  protected isConnected = false;
  protected isOrderbookConnected = false;
  protected isKlineConnected = false;

  constructor(
    protected readonly config: ExchangeConfig,
    protected readonly onTickerUpdate: (data: TickerData) => void,
    protected readonly onOrderBookUpdate?: (data: OrderBookData) => void,
    protected readonly onKlineUpdate?: (data: KlineData) => void,
    protected readonly onError?: (error: Error) => void,
  ) {
    this.logger = new Logger(`${config.name}Adapter`);
  }

  /**
   * Connect to exchange WebSocket for ticker
   */
  abstract connect(nativeSymbol: string, standardSymbol: string): Promise<void>;

  /**
   * Connect to exchange WebSocket for orderbook
   */
  abstract connectOrderBook(nativeSymbol: string, standardSymbol: string, depth?: number): Promise<void>;

  /**
   * Connect to exchange WebSocket for kline
   */
  abstract connectKline(nativeSymbol: string, standardSymbol: string, interval: string): Promise<void>;

  /**
   * Fetch historical kline data via REST API
   */
  abstract fetchKlineHistory(
    nativeSymbol: string,
    standardSymbol: string,
    interval: string,
    limit: number,
  ): Promise<KlineData[]>;

  /**
   * Disconnect from exchange WebSocket
   */
  abstract disconnect(): void;

  /**
   * Normalize raw ticker data to standard format
   */
  protected abstract normalizeTickerData(raw: any, standardSymbol: string): TickerData;

  /**
   * Normalize raw orderbook data to standard format
   */
  protected abstract normalizeOrderBookData(raw: any, standardSymbol: string): OrderBookData;

  /**
   * Normalize raw kline data to standard format
   */
  protected abstract normalizeKlineData(raw: any, standardSymbol: string, interval: string): KlineData;

  /**
   * Get WebSocket URL for specific symbol
   */
  protected abstract getWebSocketUrl(nativeSymbol: string): string;

  /**
   * Get WebSocket URL for orderbook
   */
  protected abstract getOrderBookWebSocketUrl(nativeSymbol: string): string;

  /**
   * Common reconnection logic
   */
  protected scheduleReconnect(nativeSymbol: string, standardSymbol: string): void {
    if (this.reconnectAttempts >= this.config.reconnect.maxAttempts) {
      this.logger.error(
        `Max reconnection attempts (${this.config.reconnect.maxAttempts}) reached for ${standardSymbol}`,
      );
      return;
    }

    this.reconnectAttempts++;
    this.logger.warn(
      `Scheduling reconnection attempt ${this.reconnectAttempts}/${this.config.reconnect.maxAttempts} in ${this.config.reconnect.delayMs}ms`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect(nativeSymbol, standardSymbol).catch((err) => {
        this.logger.error(`Reconnection failed: ${err.message}`);
        this.scheduleReconnect(nativeSymbol, standardSymbol);
      });
    }, this.config.reconnect.delayMs);
  }

  /**
   * Common reconnection logic for orderbook streams
   */
  protected scheduleOrderbookReconnect(
    nativeSymbol: string,
    standardSymbol: string,
    depth?: number,
  ): void {
    if (this.orderbookReconnectAttempts >= this.config.reconnect.maxAttempts) {
      this.logger.error(
        `Max orderbook reconnection attempts (${this.config.reconnect.maxAttempts}) reached for ${standardSymbol}`,
      );
      return;
    }

    this.orderbookReconnectAttempts++;
    this.logger.warn(
      `Scheduling orderbook reconnection attempt ${this.orderbookReconnectAttempts}/${this.config.reconnect.maxAttempts} in ${this.config.reconnect.delayMs}ms`,
    );

    this.orderbookReconnectTimer = setTimeout(() => {
      this.connectOrderBook(nativeSymbol, standardSymbol, depth).catch((err) => {
        this.logger.error(`Orderbook reconnection failed: ${err.message}`);
        this.scheduleOrderbookReconnect(nativeSymbol, standardSymbol, depth);
      });
    }, this.config.reconnect.delayMs);
  }

  /**
   * Clear reconnection timer
   */
  protected clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Clear orderbook reconnection timer
   */
  protected clearOrderbookReconnectTimer(): void {
    if (this.orderbookReconnectTimer) {
      clearTimeout(this.orderbookReconnectTimer);
      this.orderbookReconnectTimer = null;
    }
  }

  /**
   * Reset reconnection attempts counter
   */
  protected resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }

  /**
   * Reset orderbook reconnection attempts counter
   */
  protected resetOrderbookReconnectAttempts(): void {
    this.orderbookReconnectAttempts = 0;
  }

  /**
   * Common reconnection logic for kline streams
   */
  protected scheduleKlineReconnect(
    nativeSymbol: string,
    standardSymbol: string,
    interval: string,
  ): void {
    if (this.klineReconnectAttempts >= this.config.reconnect.maxAttempts) {
      this.logger.error(
        `Max kline reconnection attempts (${this.config.reconnect.maxAttempts}) reached for ${standardSymbol}`,
      );
      return;
    }

    this.klineReconnectAttempts++;
    this.logger.warn(
      `Scheduling kline reconnection attempt ${this.klineReconnectAttempts}/${this.config.reconnect.maxAttempts} in ${this.config.reconnect.delayMs}ms`,
    );

    this.klineReconnectTimer = setTimeout(() => {
      this.connectKline(nativeSymbol, standardSymbol, interval).catch((err) => {
        this.logger.error(`Kline reconnection failed: ${err.message}`);
        this.scheduleKlineReconnect(nativeSymbol, standardSymbol, interval);
      });
    }, this.config.reconnect.delayMs);
  }

  /**
   * Clear kline reconnection timer
   */
  protected clearKlineReconnectTimer(): void {
    if (this.klineReconnectTimer) {
      clearTimeout(this.klineReconnectTimer);
      this.klineReconnectTimer = null;
    }
  }

  /**
   * Reset kline reconnection attempts counter
   */
  protected resetKlineReconnectAttempts(): void {
    this.klineReconnectAttempts = 0;
  }

  /**
   * Wait for K-line WebSocket connection to be established
   */
  protected async waitForKlineConnection(timeout = 10000): Promise<void> {
    if (this.isKlineConnected) {
      return Promise.resolve();
    }

    if (this.klineConnectionPromise) {
      return this.klineConnectionPromise;
    }

    this.klineConnectionPromise = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.klineConnectionPromise = null;
        reject(new Error('K-line WebSocket connection timeout'));
      }, timeout);

      const checkInterval = setInterval(() => {
        if (this.isKlineConnected) {
          clearTimeout(timeoutId);
          clearInterval(checkInterval);
          this.klineConnectionPromise = null;
          resolve();
        }
      }, 100);
    });

    return this.klineConnectionPromise;
  }

  /**
   * Check if a specific interval is already subscribed
   */
  protected isKlineIntervalSubscribed(nativeSymbol: string, interval: string): boolean {
    const key = `${nativeSymbol}:${interval}`;
    return this.klineSubscriptions.has(key);
  }

  /**
   * Mark an interval as subscribed
   */
  protected markKlineIntervalSubscribed(nativeSymbol: string, interval: string): void {
    const key = `${nativeSymbol}:${interval}`;
    this.klineSubscriptions.add(key);
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get exchange name
   */
  public getExchangeName(): string {
    return this.config.name;
  }
}
