import { useEffect } from 'react';
import { useTradingStore, type OrderBookData } from '@/stores/tradingStore';
import { socketClient } from '@/lib/socket';

/**
 * Hook to subscribe to OrderBook updates via WebSocket
 * Automatically updates the trading store when new orderbook data arrives
 */
export function useOrderBook() {
  useEffect(() => {
    const socket = socketClient.connect();

    const handleOrderBook = (data: OrderBookData) => {
      const key = `${data.exchange}:${data.symbol}`;
      // Get the function directly from the store to avoid dependency issues
      useTradingStore.getState().updateOrderBook(key, data);
    };

    // Subscribe to orderbook events
    socket.on('orderbook', handleOrderBook);

    // Cleanup on unmount
    return () => {
      socket.off('orderbook', handleOrderBook);
    };
  }, []); // Empty deps - socket connection should only happen once
}
