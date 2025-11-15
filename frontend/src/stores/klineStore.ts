import { create } from 'zustand';
import axios from 'axios';

export interface KlineData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
  exchange?: string;
  symbol?: string;
  interval?: string;
}

interface KlineState {
  // Kline data cache: "exchange:symbol:interval" -> KlineData[]
  klines: Record<string, KlineData[]>;

  // Loading state
  loading: Record<string, boolean>;

  // Actions
  loadHistory: (exchange: string, symbol: string, interval: string) => Promise<void>;
  updateKline: (data: KlineData & { exchange: string; symbol: string; interval: string }) => void;
  clearKlines: (exchange: string, symbol: string) => void;
}

export const useKlineStore = create<KlineState>((set, get) => ({
  klines: {},
  loading: {},

  /**
   * Load historical kline data from REST API
   */
  loadHistory: async (exchange: string, symbol: string, interval: string) => {
    const key = `${exchange}:${symbol}:${interval}`;

    // Check if already loaded
    if (get().klines[key]?.length > 0) {
      console.log('[KlineStore] Cache hit:', key);
      return;
    }

    // Check if already loading
    if (get().loading[key]) {
      console.log('[KlineStore] Already loading:', key);
      return;
    }

    // Set loading state
    set((state) => ({
      loading: { ...state.loading, [key]: true },
    }));

    try {
      const [base, quote] = symbol.split('/');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const url = `${apiUrl}/api/market/kline/${exchange}/${base}/${quote}`;

      console.log(`[KlineStore] Loading history for ${key} from ${url}`);

      const response = await axios.get(url, {
        params: {
          interval,
          limit: 500,
        },
      });

      if (response.data.success && response.data.data) {
        // Ensure data is an array
        const klineData = Array.isArray(response.data.data) ? response.data.data : [];
        console.log(`[KlineStore] Loaded ${klineData.length} klines for ${key}`);

        set((state) => ({
          klines: { ...state.klines, [key]: klineData },
          loading: { ...state.loading, [key]: false },
        }));
      } else {
        throw new Error(response.data.message || 'Failed to load kline data');
      }
    } catch (error: any) {
      console.error(`[KlineStore] Load failed for ${key}:`, error?.message || error);
      if (error?.response) {
        console.error('[KlineStore] Response data:', error.response.data);
        console.error('[KlineStore] Response status:', error.response.status);
      }
      set((state) => ({
        klines: { ...state.klines, [key]: [] }, // Set empty array on error
        loading: { ...state.loading, [key]: false },
      }));
      // Don't throw - allow component to continue rendering
    }
  },

  /**
   * Update kline data from WebSocket
   * Core logic: incremental updates based on isClosed field
   */
  updateKline: (data) => {
    const key = `${data.exchange}:${data.symbol}:${data.interval}`;
    const existing = get().klines[key];

    // If no history loaded or not an array, silently ignore update
    // This is normal when receiving data for exchanges/intervals not currently displayed
    if (!existing || !Array.isArray(existing) || existing.length === 0) {
      return;
    }

    const updated = [...existing];
    const lastCandle = updated[updated.length - 1];

    // Determine if this is a new candle or an update
    if (data.timestamp > lastCandle.timestamp) {
      // Case 1: New candle (timestamp is greater)
      console.log('[KlineStore] New candle:', new Date(data.timestamp).toLocaleTimeString());
      updated.push(data);

      // Maintain fixed window of 500 candles
      if (updated.length > 500) {
        updated.shift(); // Remove oldest
      }
    } else if (data.timestamp === lastCandle.timestamp) {
      // Case 2: Update current candle (timestamp matches)
      updated[updated.length - 1] = data;
    } else {
      // Case 3: Historical data (shouldn't happen in normal operation)
      console.warn('[KlineStore] Received old candle, ignoring');
      return;
    }

    // Update store
    set((state) => ({
      klines: { ...state.klines, [key]: updated },
    }));
  },

  /**
   * Clear klines for a specific exchange and symbol (all intervals)
   */
  clearKlines: (exchange: string, symbol: string) => {
    const prefix = `${exchange}:${symbol}:`;

    set((state) => {
      const newKlines = { ...state.klines };
      const newLoading = { ...state.loading };

      Object.keys(newKlines).forEach((key) => {
        if (key.startsWith(prefix)) {
          delete newKlines[key];
          delete newLoading[key];
        }
      });

      return { klines: newKlines, loading: newLoading };
    });

    console.log('[KlineStore] Cleared klines for:', prefix);
  },
}));

