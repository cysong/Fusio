import { useState } from "react";
import { useOrderStore } from "@/stores/orderStore";
import { useTradingStore } from "@/stores/tradingStore";

const SIDE_OPTIONS = [
  { label: "Buy", value: "buy" as const },
  { label: "Sell", value: "sell" as const },
];

const TYPE_OPTIONS = [
  { label: "Market", value: "market" as const },
  { label: "Limit", value: "limit" as const },
];

export default function OrderForm() {
  const { selectedExchange, selectedSymbol } = useTradingStore();
  const { submit, creating, error, setError } = useOrderStore();

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [type, setType] = useState<"market" | "limit">("limit");
  const [price, setPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    const qtyNum = parseFloat(quantity);
    const priceNum = parseFloat(price);
    if (!selectedSymbol || !selectedExchange) {
      setError("Select symbol and exchange");
      return;
    }
    if (!qtyNum || qtyNum <= 0) {
      setError("Quantity must be > 0");
      return;
    }
    if (type === "limit" && (!priceNum || priceNum <= 0)) {
      setError("Limit order requires price > 0");
      return;
    }

    await submit({
      exchange: selectedExchange,
      symbol: selectedSymbol,
      side,
      type,
      quantity: qtyNum,
      price: type === "limit" ? priceNum : undefined,
    });
  };

  return (
    <div className="order-form">
      <div className="order-form__header">
        <h3>Place Order</h3>
        <div className="order-form__pair">
          <span>{selectedSymbol}</span>
          <span className="exchange-tag">{selectedExchange.toUpperCase()}</span>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="order-form__body">
        <div className="field">
          <label>Side</label>
          <div className="segmented">
            {SIDE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={side === opt.value ? "active" : ""}
                onClick={() => setSide(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Type</label>
          <div className="segmented">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={type === opt.value ? "active" : ""}
                onClick={() => setType(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {type === "limit" && (
          <div className="field">
            <label>Price</label>
            <input
              type="number"
              step="0.0001"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter price"
            />
          </div>
        )}

        <div className="field">
          <label>Quantity</label>
          <input
            type="number"
            step="0.0001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter quantity"
          />
        </div>

        {error && <div className="order-form__error">{error}</div>}

        <button type="submit" disabled={creating} className="submit-btn">
          {creating ? "Submitting..." : "Submit Order"}
        </button>
      </form>
    </div>
  );
}
