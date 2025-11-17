import axios from 'axios';
import type { Order } from '@/types/order';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
});

export interface CreateOrderPayload {
  exchange: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  quantity: number;
  price?: number;
  clientOrderId?: string;
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const res = await apiClient.post('/orders', payload);
  return res.data.data;
}

export interface ListOrdersQuery {
  exchange?: string;
  status?: string;
  side?: string;
  type?: string;
  symbol?: string;
  page?: number;
  pageSize?: number;
}

export async function listOrders(query: ListOrdersQuery): Promise<{ data: Order[]; total: number }> {
  const res = await apiClient.get('/orders', { params: query });
  return res.data.data;
}

export async function cancelOrder(id: string): Promise<Order> {
  const res = await apiClient.post(`/orders/${id}/cancel`);
  return res.data.data;
}
