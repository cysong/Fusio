import { Logger } from '@nestjs/common';
import { TickerData } from '../interfaces/ticker.interface';
import { OrderBookData } from '../interfaces/orderbook.interface';
import { ExchangeConfig } from '../interfaces/exchange-config.interface';

/**
 * Base class for exchange adapters
 * Provides common functionality and enforces interface for all exchange integrations
 */
export abstract class BaseExchangeAdapter {
  protected logger: Logger;
  protected ws: any = null;
  protected orderbookWs: any = null;
  protected reconnectAttempts = 0;
  protected reconnectTimer: NodeJS.Timeout | null = null;
  protected isConnected = false;
  protected isOrderbookConnected = false;

  constructor(
    protected readonly config: ExchangeConfig,
    protected readonly onTickerUpdate: (data: TickerData) => void,
    protected readonly onOrderBookUpdate?: (data: OrderBookData) => void,
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
   * Clear reconnection timer
   */
  protected clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Reset reconnection attempts counter
   */
  protected resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
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
