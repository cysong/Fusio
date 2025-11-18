import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { useOrderStore } from "@/stores/orderStore";
import { useAuthStore } from "@/stores/authStore";
import type { Order } from "@/types/order";

/**
 * Subscribe to order update events via WebSocket and update order store.
 * Optionally propagate updates to local consumers (e.g., history page).
 */
export function useOrderUpdates(onUpdate?: (order: Order) => void) {
  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE || "http://localhost:4000";
    const userId = useAuthStore.getState().user?.id;
    let socket: Socket | null = null;

    try {
      socket = io(`${base}/orders`, {
        transports: ["websocket"],
        upgrade: false,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
        timeout: 10000,
      });

      socket.on("connect", () => {
        console.log("[OrderSocket] Connected");
      });

      socket.on("connect_error", (err) => {
        console.error("[OrderSocket] Connection error:", err?.message || err);
      });

      // Join user-specific room if available
      if (userId) {
        socket.emit("join", { room: `user:${userId}` });
      }

      socket.on("orders:update", (order: Order) => {
        if (!order?.id) return;
        useOrderStore.getState().upsert(order);
        if (onUpdate) {
          onUpdate(order);
        }
      });
    } catch (err) {
      console.error("[OrderSocket] Failed to setup socket:", err);
    }

    return () => {
      if (socket) {
        socket.off("order:update");
        socket.disconnect();
      }
    };
  }, [onUpdate]);
}
