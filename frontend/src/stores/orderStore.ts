import { create } from 'zustand';
import type { Order } from '@/types/order';
import { createOrder, cancelOrder, listOrders, type CreateOrderPayload } from '@/api/orders';

interface OrderState {
  orders: Order[];
  loading: boolean;
  creating: boolean;
  error?: string;
  fetch: (params: { exchange: string; symbol?: string }) => Promise<void>;
  submit: (payload: CreateOrderPayload) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  upsert: (order: Order) => void;
  setError: (msg?: string) => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  loading: false,
  creating: false,
  error: undefined,

  async fetch(params) {
    set({ loading: true, error: undefined });
    try {
      const { data } = await listOrders({
        exchange: params.exchange,
        symbol: params.symbol,
        page: 1,
        pageSize: 50,
      });
      set({ orders: data, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err?.message || 'Failed to load orders' });
    }
  },

  async submit(payload) {
    set({ creating: true, error: undefined });
    try {
      const order = await createOrder(payload);
      // insert/update with de-duplication
      get().upsert(order);
      set({ creating: false });
    } catch (err: any) {
      set({ creating: false, error: err?.message || 'Failed to create order' });
    }
  },

  async cancel(id: string) {
    set({ error: undefined });
    try {
      const order = await cancelOrder(id);
      get().upsert(order);
    } catch (err: any) {
      set({ error: err?.message || 'Failed to cancel order' });
    }
  },

  upsert(order: Order) {
    set((state) => {
      const idx = state.orders.findIndex((o) => o.id === order.id);
      if (idx >= 0) {
        const copy = [...state.orders];
        copy[idx] = order;
        return { orders: copy };
      }
      return { orders: [order, ...state.orders] };
    });
  },

  setError(msg) {
    set({ error: msg });
  },
}));
