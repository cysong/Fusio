import { create } from 'zustand';
import axios from 'axios';
import { getKlineCacheTTL } from '@/config/cache.config';

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

interface CachedKlineData {
  data: KlineData[];
  timestamp: number;
}

interface KlineState {
  klines: Record<string, CachedKlineData>;
  loading: Record<string, boolean>;
  loadHistory: (exchange: string, symbol: string, interval: string) => Promise<void>;
  updateKline: (data: KlineData & { exchange: string; symbol: string; interval: string }) => void;
  clearKlines: (exchange: string, symbol: string) => void;
}

export const useKlineStore = create<KlineState>((set, get) => ({
  klines: {},
  loading: {},

  loadHistory: async (exchange: string, symbol: string, interval: string) => {
    const key = `${exchange}:${symbol}:${interval}`;
    const now = Date.now();
    const cached = get().klines[key];

    if (cached?.data?.length > 0 && cached.timestamp) {
      const age = now - cached.timestamp;
      const ttl = getKlineCacheTTL(interval);

      if (age < ttl) {
        console.log(
          `[KlineStore] Cache hit (age: ${Math.round(age / 1000)}s, ttl: ${ttl / 1000}s):`,
          key
        );
        return;
      } else {
        console.log(
          `[KlineStore] Cache expired (age: ${Math.round(age / 1000)}s, ttl: ${ttl / 1000}s), reloading:`,
          key
        );
      }
    }

    if (get().loading[key]) {
      console.log('[KlineStore] Already loading:', key);
      return;
    }

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
        const klineData = Array.isArray(response.data.data) ? response.data.data : [];
        console.log(`[KlineStore] Loaded ${klineData.length} klines for ${key}`);

        set((state) => ({
          klines: {
            ...state.klines,
            [key]: {
              data: klineData,
              timestamp: Date.now(),
            },
          },
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
        klines: {
          ...state.klines,
          [key]: {
            data: [],
            timestamp: Date.now(),
          },
        },
        loading: { ...state.loading, [key]: false },
      }));
    }
  },

  updateKline: (data) => {
    const key = `${data.exchange}:${data.symbol}:${data.interval}`;
    const cached = get().klines[key];

    if (!cached?.data || !Array.isArray(cached.data) || cached.data.length === 0) {
      return;
    }

    const updated = [...cached.data];
    const lastCandle = updated[updated.length - 1];

    if (data.timestamp > lastCandle.timestamp) {
      console.log('[KlineStore] New candle:', new Date(data.timestamp).toLocaleTimeString());
      updated.push(data);
      if (updated.length > 500) {
        updated.shift();
      }
    } else if (data.timestamp === lastCandle.timestamp) {
      updated[updated.length - 1] = data;
    } else {
      console.warn('[KlineStore] Received old candle, ignoring');
      return;
    }

    set((state) => ({
      klines: {
        ...state.klines,
        [key]: {
          data: updated,
          timestamp: Date.now(),
        },
      },
    }));
  },

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

