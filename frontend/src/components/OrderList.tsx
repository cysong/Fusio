import { useEffect } from "react";
import { Table, Tag, Button, Space, Typography, Alert } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useOrderStore } from "@/stores/orderStore";
import { useTradingStore } from "@/stores/tradingStore";
import type { Order } from "@/types/order";

const SIDE_COLOR: Record<"buy" | "sell", string> = {
  buy: "green",
  sell: "red",
};

const STATUS_COLOR: Record<string, string> = {
  submitted: "blue",
  partially_filled: "gold",
  filled: "green",
  canceled: "default",
  rejected: "red",
  expired: "volcano",
  pending: "processing",
};

export default function OrderList() {
  const { selectedExchange, selectedSymbol } = useTradingStore();
  const { orders, fetch, loading, cancel, error } = useOrderStore();

  useEffect(() => {
    if (selectedExchange) {
      fetch({ exchange: selectedExchange, symbol: selectedSymbol });
    }
    // fetch comes from zustand; do not include to avoid infinite re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExchange, selectedSymbol]);

  const columns: ColumnsType<Order> = [
    {
      title: "Exch",
      dataIndex: "exchange",
      key: "exchange",
      render: (v) => v.toUpperCase(),
    },
    {
      title: "Symbol",
      dataIndex: "symbol",
      key: "symbol",
    },
    {
      title: "Side",
      dataIndex: "side",
      key: "side",
      render: (v: Order["side"]) => <Tag color={SIDE_COLOR[v]}>{v.toUpperCase()}</Tag>,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (v) => v.toUpperCase(),
    },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      render: (v) => v ?? "-",
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      key: "quantity",
    },
    {
      title: "Filled",
      dataIndex: "filledQuantity",
      key: "filledQuantity",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v) => <Tag color={STATUS_COLOR[v] || "default"}>{v}</Tag>,
    },
    {
      title: "Avg Price",
      dataIndex: "avgPrice",
      key: "avgPrice",
      render: (v) => v ?? "-",
    },
    {
      title: "Fee",
      dataIndex: "fee",
      key: "fee",
      render: (v) => v ?? "-",
    },
    {
      title: "Updated",
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: (v, record) => {
        const ts = v || record.createdAt;
        if (!ts) return "-";
        const d = new Date(ts);
        return d.toLocaleString();
      },
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => {
        const cancellable = ["submitted", "partially_filled", "pending"].includes(
          (record.status || "").toLowerCase()
        );
        const isRejected = (record.status || "").toLowerCase() === "rejected";
        return (
          <Space>
            {cancellable && !isRejected && (
              <Button danger size="small" onClick={() => cancel(record.id)}>
                Cancel
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 16, background: "var(--ant-color-bg-container)", borderRadius: 8, height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography.Title level={4} style={{ margin: 0, color: "var(--ant-color-text)" }}>
          Orders
        </Typography.Title>
        <Typography.Text type="secondary">Recent orders</Typography.Text>
      </div>
      {error && (
        <Alert
          type="error"
          message="Failed to load orders"
          description={error}
          showIcon
          style={{ marginBottom: 4 }}
        />
      )}
      <Table
        size="small"
        loading={loading}
        columns={columns}
        dataSource={orders}
        rowKey="id"
        pagination={false}
        scroll={{ y: 180 }}
        locale={{ emptyText: "No orders" }}
        style={{ flex: 1 }}
      />
      <div style={{ textAlign: "right", marginTop: 4 }}>
        <Button type="link" size="small" href="/app/trading/orders" style={{ padding: 0 }}>
          View more
        </Button>
      </div>
    </div>
  );
}
