import { useEffect } from "react";
import { useOrderStore } from "@/stores/orderStore";
import { useTradingStore } from "@/stores/tradingStore";
import type { Order } from "@/types/order";

function OrderRow({ order, onCancel }: { order: Order; onCancel: (id: string) => void }) {
  return (
    <tr>
      <td>{order.exchange.toUpperCase()}</td>
      <td>{order.symbol}</td>
      <td>{order.side.toUpperCase()}</td>
      <td>{order.type.toUpperCase()}</td>
      <td>{order.price ?? "-"}</td>
      <td>{order.quantity}</td>
      <td>{order.filledQuantity}</td>
      <td>{order.status}</td>
      <td>{order.avgPrice ?? "-"}</td>
      <td>{order.fee ?? "-"}</td>
      <td>{order.updatedAt || order.createdAt || "-"}</td>
      <td>
        {["submitted", "partially_filled"].includes(order.status) && (
          <button onClick={() => onCancel(order.id)}>Cancel</button>
        )}
      </td>
    </tr>
  );
}

export default function OrderList() {
  const { selectedExchange, selectedSymbol } = useTradingStore();
  const { orders, fetch, loading, cancel, error } = useOrderStore();

  useEffect(() => {
    if (selectedExchange) {
      fetch({ exchange: selectedExchange, symbol: selectedSymbol });
    }
  }, [selectedExchange, selectedSymbol, fetch]);

  return (
    <div className="order-list">
      <div className="order-list__header">
        <h3>Orders</h3>
        <div className="hint">Auto-refresh with WS update planned</div>
      </div>
      {error && <div className="order-list__error">{error}</div>}
      <table>
        <thead>
          <tr>
            <th>Exch</th>
            <th>Symbol</th>
            <th>Side</th>
            <th>Type</th>
            <th>Price</th>
            <th>Qty</th>
            <th>Filled</th>
            <th>Status</th>
            <th>Avg Price</th>
            <th>Fee</th>
            <th>Updated</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 && !loading && (
            <tr>
              <td colSpan={12} style={{ textAlign: "center", color: "#777" }}>
                No orders
              </td>
            </tr>
          )}
          {orders.map((o) => (
            <OrderRow key={o.id} order={o} onCancel={cancel} />
          ))}
        </tbody>
      </table>
      {loading && <div className="order-list__loading">Loading...</div>}
    </div>
  );
}
