import { useEffect, useState } from "react";
import { Form, Select, Input, Button, Table, Tag, Space, Typography } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { listOrders } from "@/api/orders";
import type { Order } from "@/types/order";
import { useOrderUpdates } from "@/hooks/useOrderUpdates";

const STATUS_COLOR: Record<string, string> = {
  submitted: "blue",
  partially_filled: "gold",
  filled: "green",
  canceled: "default",
  rejected: "red",
  expired: "volcano",
  pending: "processing",
};

export default function OrdersHistory() {
  const [form] = Form.useForm();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 20,
  });

  useOrderUpdates((order) => {
    setOrders((prev) => {
      const idx = prev.findIndex((o) => o.id === order.id);
      if (idx === -1) return prev;
      const copy = [...prev];
      copy[idx] = order;
      return copy;
    });
  });

  const fetchData = async (page = 1, pageSize = 20) => {
    setLoading(true);
    const values = form.getFieldsValue();
    try {
      const res = await listOrders({
        exchange: values.exchange,
        symbol: values.symbol,
        status: values.status,
        side: values.side,
        type: values.type,
        page,
        pageSize,
      });
      setOrders(res.data);
      setTotal(res.total);
      setPagination({ current: page, pageSize });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const columns: ColumnsType<Order> = [
    { title: "Exch", dataIndex: "exchange", key: "exchange", render: (v) => v.toUpperCase() },
    { title: "Symbol", dataIndex: "symbol", key: "symbol" },
    { title: "Side", dataIndex: "side", key: "side", render: (v) => <Tag color={v === "buy" ? "green" : "red"}>{v.toUpperCase()}</Tag> },
    { title: "Type", dataIndex: "type", key: "type", render: (v) => v.toUpperCase() },
    { title: "Price", dataIndex: "price", key: "price", render: (v) => v ?? "-" },
    { title: "Qty", dataIndex: "quantity", key: "quantity" },
    { title: "Filled", dataIndex: "filledQuantity", key: "filledQuantity" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v) => <Tag color={STATUS_COLOR[v] || "default"}>{v}</Tag>,
    },
    { title: "Avg Price", dataIndex: "avgPrice", key: "avgPrice", render: (v) => v ?? "-" },
    { title: "Fee", dataIndex: "fee", key: "fee", render: (v) => v ?? "-" },
    {
      title: "Updated",
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: (v, r) => {
        const ts = v || r.createdAt;
        if (!ts) return "-";
        return new Date(ts).toLocaleString();
      },
    },
  ];

  return (
    <div style={{ padding: 16, background: "var(--ant-color-bg-container)", minHeight: "100%", borderRadius: 8 }}>
      <Typography.Title level={3} style={{ color: "var(--ant-color-text)" }}>
        Order History
      </Typography.Title>
      <Form
        form={form}
        layout="inline"
        style={{ marginBottom: 12 }}
        onFinish={() => fetchData(pagination.current || 1, pagination.pageSize || 20)}
      >
        <Form.Item name="exchange" label="Exchange">
          <Input placeholder="ex: binance" allowClear />
        </Form.Item>
        <Form.Item name="symbol" label="Symbol">
          <Input placeholder="ex: BTC/USDT" allowClear />
        </Form.Item>
        <Form.Item name="status" label="Status">
          <Select
            allowClear
            options={[
              "pending",
              "submitted",
              "partially_filled",
              "filled",
              "canceled",
              "rejected",
              "expired",
            ].map((v) => ({ label: v, value: v }))}
            style={{ width: 160 }}
          />
        </Form.Item>
        <Form.Item name="side" label="Side">
          <Select
            allowClear
            options={[
              { label: "BUY", value: "buy" },
              { label: "SELL", value: "sell" },
            ]}
            style={{ width: 120 }}
          />
        </Form.Item>
        <Form.Item name="type" label="Type">
          <Select
            allowClear
            options={[
              { label: "Market", value: "market" },
              { label: "Limit", value: "limit" },
            ]}
            style={{ width: 140 }}
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" onClick={() => fetchData(1, pagination.pageSize || 20)}>
              Search
            </Button>
            <Button onClick={() => form.resetFields()}>Reset</Button>
          </Space>
        </Form.Item>
      </Form>

      <Table
        size="small"
        loading={loading}
        columns={columns}
        dataSource={orders}
        rowKey="id"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total,
          onChange: (page, pageSize) => fetchData(page, pageSize),
        }}
        scroll={{ y: 400 }}
        style={{ background: "var(--ant-color-bg-container)" }}
      />
    </div>
  );
}
