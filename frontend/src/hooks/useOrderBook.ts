import { useEffect } from 'react';
import { useTradingStore, type OrderBookData } from '@/stores/tradingStore';
import { socketClient } from '@/lib/socket';
import { useRef } from 'react';

/**
 * Hook to subscribe to OrderBook updates via WebSocket
 * Automatically updates the trading store when new orderbook data arrives
 */
export function useOrderBook() {
  const frameRef = useRef<number | null>(null);
  const latestRef = useRef<OrderBookData | null>(null);

  const flush = () => {
    if (!latestRef.current) return;
    const data = latestRef.current;
    const key = `${data.exchange}:${data.symbol}`;
    useTradingStore.getState().updateOrderBook(key, data);
    latestRef.current = null;
    frameRef.current = null;
  };

  useEffect(() => {
    const socket = socketClient.connect();

    const handleOrderBook = (data: OrderBookData) => {
      latestRef.current = data;
      if (frameRef.current == null) {
        frameRef.current = requestAnimationFrame(flush);
      }
    };

    // Subscribe to orderbook events
    socket.on('orderbook', handleOrderBook);

    // Cleanup on unmount
    return () => {
      socket.off('orderbook', handleOrderBook);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, []); // Empty deps - socket connection should only happen once
}
