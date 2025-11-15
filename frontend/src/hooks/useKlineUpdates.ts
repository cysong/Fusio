import { useEffect } from 'react';
import { throttle } from 'lodash';
import { socketClient } from '@/lib/socket';
import { useKlineStore } from '@/stores/klineStore';

/**
 * Hook to subscribe to real-time kline updates via WebSocket
 * 
 * This hook listens to the 'kline' event from the socket and updates the kline store.
 * Updates are throttled to 500ms to avoid excessive re-renders.
 */
export function useKlineUpdates() {
  useEffect(() => {
    const socket = socketClient.getSocket();

    // Check if socket is available
    if (!socket) {
      console.warn('[useKlineUpdates] Socket not available');
      return;
    }

    // Throttle updates to 500ms to improve performance
    const throttledUpdate = throttle((data: any) => {
      if (!data || !data.exchange || !data.symbol || !data.interval) {
        console.warn('[useKlineUpdates] Invalid kline data:', data);
        return;
      }

      // Get the function directly from the store to avoid dependency issues
      useKlineStore.getState().updateKline(data);
    }, 500);

    // Subscribe to kline events
    const handleKline = (data: any) => {
      throttledUpdate(data);
    };

    socket.on('kline', handleKline);

    console.log('[useKlineUpdates] Subscribed to kline updates');

    // Cleanup
    return () => {
      throttledUpdate.cancel(); // Cancel any pending throttled calls
      socket.off('kline', handleKline);
      console.log('[useKlineUpdates] Unsubscribed from kline updates');
    };
  }, []); // Empty deps - socket connection should only happen once
}

