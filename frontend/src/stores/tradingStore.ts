import { create } from 'zustand';

// OrderBook types - matches backend format
export type OrderBookLevel = [string, string]; // [price, quantity]

export interface OrderBookData {
  exchange: string;
  symbol: string;
  bids: OrderBookLevel[]; // Array of [price, quantity] tuples
  asks: OrderBookLevel[]; // Array of [price, quantity] tuples
  timestamp: number;
  source?: {
    nativeSymbol: string;
    exchangeTimestamp: number;
    updateId?: number;
  };
}

// Ticker types (from existing implementation)
export interface TickerData {
  exchange: string;
  symbol: string;
  price: number;
  priceChangePercent: number;
  volume: number;
  high24h?: number;
  low24h?: number;
  timestamp: number;
}

interface TradingState {
  // Current selected symbol and exchange
  selectedSymbol: string;
  selectedExchange: string;

  // All tickers data from WebSocket
  tickers: Record<string, TickerData>; // key: "binance:BTC/USDT"

  // OrderBook data
  orderBooks: Record<string, OrderBookData>; // key: "binance:BTC/USDT"

  // Trading form inputs
  buyPrice: string;
  buyAmount: string;
  sellPrice: string;
  sellAmount: string;

  // WebSocket connection status
  isConnected: boolean;

  // Actions
  setSelectedSymbol: (symbol: string) => void;
  setSelectedExchange: (exchange: string) => void;
  updateTicker: (key: string, data: TickerData) => void;
  updateOrderBook: (key: string, data: OrderBookData) => void;
  setBuyPrice: (price: string) => void;
  setBuyAmount: (amount: string) => void;
  setSellPrice: (price: string) => void;
  setSellAmount: (amount: string) => void;
  setIsConnected: (connected: boolean) => void;
  resetTradingForm: () => void;
}

export const useTradingStore = create<TradingState>((set) => ({
  // Initial state
  selectedSymbol: 'BTC/USDT',
  selectedExchange: 'binance',
  tickers: {},
  orderBooks: {},
  buyPrice: '',
  buyAmount: '',
  sellPrice: '',
  sellAmount: '',
  isConnected: false,

  // Actions
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),

  setSelectedExchange: (exchange) => set({ selectedExchange: exchange }),

  updateTicker: (key, data) =>
    set((state) => ({
      tickers: { ...state.tickers, [key]: data },
    })),

  updateOrderBook: (key, data) =>
    set((state) => ({
      orderBooks: { ...state.orderBooks, [key]: data },
    })),

  setBuyPrice: (price) => set({ buyPrice: price }),

  setBuyAmount: (amount) => set({ buyAmount: amount }),

  setSellPrice: (price) => set({ sellPrice: price }),

  setSellAmount: (amount) => set({ sellAmount: amount }),

  setIsConnected: (connected) => set({ isConnected: connected }),

  resetTradingForm: () =>
    set({
      buyPrice: '',
      buyAmount: '',
      sellPrice: '',
      sellAmount: '',
    }),
}));
