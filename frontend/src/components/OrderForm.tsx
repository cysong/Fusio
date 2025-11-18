import { useMemo, useState } from "react";
import { Button, Form, InputNumber, Segmented, Space, Tag, Typography, Divider, Slider } from "antd";
import { CaretUpOutlined, CaretDownOutlined } from "@ant-design/icons";
import { useOrderStore } from "@/stores/orderStore";
import { useTradingStore } from "@/stores/tradingStore";
import { getSymbolPrecision } from "@/config/symbolPrecision";

const TYPE_OPTIONS = [
  { label: "Market", value: "market" as const },
  { label: "Limit", value: "limit" as const },
];

const SIDE_COLOR: Record<"buy" | "sell", string> = {
  buy: "#0ECB81",
  sell: "#F6465D",
};

export default function OrderForm() {
  const { selectedExchange, selectedSymbol } = useTradingStore();
  const { submit, creating, error, setError } = useOrderStore();

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [type, setType] = useState<"market" | "limit">("limit");
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [quantity, setQuantity] = useState<number | undefined>(undefined);

  const pairLabel = useMemo(() => `${selectedSymbol} · ${selectedExchange.toUpperCase()}`, [selectedSymbol, selectedExchange]);
  const priceKey = useMemo(() => `${selectedExchange}:${selectedSymbol}`, [selectedExchange, selectedSymbol]);
  const ticker = useTradingStore((s) => s.tickers[priceKey]);
  const orderBook = useTradingStore((s) => s.orderBooks[priceKey]);
  const precision = useMemo(() => getSymbolPrecision(selectedSymbol), [selectedSymbol]);

  const currentPrice = useMemo(() => {
    if (ticker?.price) return ticker.price;
    const bestBid = orderBook?.bids?.[0]?.[0];
    const bestAsk = orderBook?.asks?.[0]?.[0];
    if (bestBid && bestAsk) {
      const mid = (parseFloat(bestBid) + parseFloat(bestAsk)) / 2;
      return Number(mid.toFixed(4));
    }
    if (bestAsk) return Number(parseFloat(bestAsk).toFixed(4));
    if (bestBid) return Number(parseFloat(bestBid).toFixed(4));
    return undefined;
  }, [ticker, orderBook]);

  const handleSubmit = async (submitSide: "buy" | "sell") => {
    setError(undefined);
    if (!selectedSymbol || !selectedExchange) {
      setError("Select symbol and exchange");
      return;
    }
    if (!quantity || quantity <= 0) {
      setError("Quantity must be > 0");
      return;
    }
    if (type === "limit" && (!price || price <= 0)) {
      setError("Limit order requires price > 0");
      return;
    }

    await submit({
      exchange: selectedExchange,
      symbol: selectedSymbol,
      side: submitSide,
      type,
      quantity,
      price: type === "limit" ? price : undefined,
    });
  };

  return (
    <div className="order-form" style={{ padding: 16, background: "var(--ant-color-bg-container)", borderRadius: 8 }}>
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography.Title level={4} style={{ margin: 0, color: "var(--ant-color-text)" }}>
            Place Order
          </Typography.Title>
          <Tag color="blue">{pairLabel}</Tag>
        </div>

        <div>
          <Typography.Text style={{ color: "var(--ant-color-text)" }}>Type</Typography.Text>
          <Segmented
            block
            options={TYPE_OPTIONS}
            value={type}
            onChange={(val) => setType(val as "limit" | "market")}
          />
        </div>

        {type === "limit" && (
          <Form layout="vertical">
            <Form.Item
              label={
                <Space style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                  <Typography.Text style={{ color: "var(--ant-color-text)" }}>Price</Typography.Text>
                  {currentPrice && (
                    <Button size="small" onClick={() => setPrice(currentPrice)}>
                      Use last {currentPrice.toFixed(precision.price)}
                    </Button>
                  )}
                </Space>
              }
            >
              <Space.Compact block>
                <Button icon={<CaretDownOutlined />} onClick={() => setPrice((p) => (p && p > 0.0001 ? Number((p - 0.0001).toFixed(4)) : 0.0001))} />
                <InputNumber
                  style={{ flex: 1 }}
                  min={0}
                  step={0.0001}
                  controls={false}
                  value={price}
                  onChange={(v) => setPrice(typeof v === "number" ? v : undefined)}
                  placeholder="Enter price"
                />
                <Button icon={<CaretUpOutlined />} onClick={() => setPrice((p) => Number(((p || 0) + 0.0001).toFixed(4)))} />
              </Space.Compact>
            </Form.Item>
          </Form>
        )}

        <Form layout="vertical" style={{ marginBottom: 4 }}>
          <Form.Item label={<Typography.Text style={{ color: "var(--ant-color-text)" }}>Quantity</Typography.Text>}>
            <Space.Compact block>
              <Button icon={<CaretDownOutlined />} onClick={() => setQuantity((q) => (q && q > 0.0001 ? Number((q - 0.0001).toFixed(4)) : 0.0001))} />
                <InputNumber
                  style={{ flex: 1 }}
                  min={0}
                  step={0.0001}
                  controls={false}
                  value={quantity}
                  onChange={(v) => setQuantity(typeof v === "number" ? v : undefined)}
                  placeholder="Enter quantity"
                />
              <Button icon={<CaretUpOutlined />} onClick={() => setQuantity((q) => Number(((q || 0) + 0.0001).toFixed(4)))} />
            </Space.Compact>
          </Form.Item>
          <div style={{ margin: "4px 4px 8px 4px" }}>
            <Slider
              marks={{
                0: "0%",
                25: "25%",
                50: "50%",
                75: "75%",
                100: "100%",
              }}
              step={null}
              onChange={(val) => {
                const pct = Array.isArray(val) ? val[0] : val;
                if (!pct && pct !== 0) return;
                if (quantity && quantity > 0) {
                  setQuantity(Number((quantity * (pct / 100)).toFixed(4)));
                } else {
                  setQuantity(Number((pct / 100).toFixed(4)));
                }
              }}
              defaultValue={0}
            />
          </div>
        </Form>

        {error && <Typography.Text type="danger">{error}</Typography.Text>}

        <div style={{ display: "flex", width: "100%", gap: 12 }}>
          <Button
            type="primary"
            size="large"
            loading={creating}
            style={{ background: SIDE_COLOR.buy, borderColor: SIDE_COLOR.buy, flex: 1, textAlign: "center" }}
            onClick={() => {
              setSide("buy");
              void handleSubmit("buy");
            }}
          >
            BUY
          </Button>
          <Button
            type="primary"
            size="large"
            loading={creating}
            style={{ background: SIDE_COLOR.sell, borderColor: SIDE_COLOR.sell, flex: 1, textAlign: "center" }}
            onClick={() => {
              setSide("sell");
              void handleSubmit("sell");
            }}
          >
            SELL
          </Button>
        </div>
      </Space>
      <Divider style={{ borderColor: "var(--ant-color-border)" }} />
    </div>
  );
}
