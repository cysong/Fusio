import { useEffect } from 'react';
import { useTradingStore, type OrderBookData } from '@/stores/tradingStore';
import { socketClient } from '@/lib/socket';

/**
 * Hook to subscribe to OrderBook updates via WebSocket
 * Automatically updates the trading store when new orderbook data arrives
 */
export function useOrderBook() {
  const updateOrderBook = useTradingStore((state) => state.updateOrderBook);

  useEffect(() => {
    const socket = socketClient.connect();

    const handleOrderBook = (data: OrderBookData) => {
      const key = `${data.exchange}:${data.symbol}`;
      updateOrderBook(key, data);
    };

    // Subscribe to orderbook events
    socket.on('orderbook', handleOrderBook);

    // Cleanup on unmount
    return () => {
      socket.off('orderbook', handleOrderBook);
    };
  }, [updateOrderBook]);
}
