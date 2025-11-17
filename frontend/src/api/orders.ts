import apiClient from '../lib/axios';
import type { Order } from '@/types/order';

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
  return apiClient.post('/orders', payload);
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
  return apiClient.get('/orders', { params: query });
}

export async function cancelOrder(id: string): Promise<Order> {
  return apiClient.post(`/orders/${id}/cancel`);
}
