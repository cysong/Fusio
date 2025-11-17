import { useMemo } from "react";
import { useTradingStore } from "@/stores/tradingStore";
import { getSymbolPrecision } from "@/config/symbolPrecision";
import "./OrderBook.css";

interface OrderBookProps {
  symbol: string;
  exchange: string;
}

export default function OrderBook({ symbol, exchange }: OrderBookProps) {
  const { orderBooks, setBuyPrice, setSellPrice } = useTradingStore();

  // Get precision config for current symbol
  const precision = useMemo(() => getSymbolPrecision(symbol), [symbol]);

  const orderBook = orderBooks[`${exchange}:${symbol}`];

  // Get best bid/ask and calculate spread - run on every render
  const { currentPrice, spread } = useMemo(() => {
    const bids = orderBook?.bids ?? [];
    const asks = orderBook?.asks ?? [];

    const bestBid = bids[0]?.[0];
    const bestAsk = asks[0]?.[0];

    const bid = bestBid !== undefined ? parseFloat(bestBid) : null;
    const ask = bestAsk !== undefined ? parseFloat(bestAsk) : null;

    const price =
      bid !== null && bid > 0 ? bid : ask !== null && ask > 0 ? ask : 0;
    const spreadValue =
      bid !== null && ask !== null ? Math.max(ask - bid, 0) : 0;

    return {
      currentPrice: price,
      spread: spreadValue,
    };
  }, [orderBook]);

  // Calculate cumulative quantities for depth visualization
  const asksWithTotal = useMemo(() => {
    if (!orderBook || !orderBook.asks) return [];
    let total = 0;
    return orderBook.asks.map(([price, quantity]) => {
      total += parseFloat(quantity);
      return { price, quantity, total };
    });
  }, [orderBook]);

  const bidsWithTotal = useMemo(() => {
    if (!orderBook || !orderBook.bids) return [];
    let total = 0;
    return orderBook.bids.map(([price, quantity]) => {
      total += parseFloat(quantity);
      return { price, quantity, total };
    });
  }, [orderBook]);

  if (!orderBook) {
    return (
      <div className="orderbook-container">
        <div className="orderbook-header">
          <span>Order Book</span>
        </div>
        <div className="orderbook-loading">
          <p>Waiting for orderbook data...</p>
          <p style={{ fontSize: "12px", color: "#666" }}>
            Exchange: {exchange.toUpperCase()} | Symbol: {symbol}
          </p>
        </div>
      </div>
    );
  }

  // Calculate max total from visible levels only (first 10 items)
  // This ensures depth bars are proportional to visible range, not entire orderbook
  const maxTotal = Math.max(
    asksWithTotal[Math.min(9, asksWithTotal.length - 1)]?.total || 0,
    bidsWithTotal[Math.min(9, bidsWithTotal.length - 1)]?.total || 0
  );

  const handlePriceClick = (price: string, side: "buy" | "sell") => {
    if (side === "buy") {
      setBuyPrice(price);
    } else {
      setSellPrice(price);
    }
  };

  const formatPrice = (price: string) => {
    const p = parseFloat(price);
    if (Number.isNaN(p)) return price;
    return p.toFixed(precision.price);
  };

  const formatQuantity = (quantity: string) => {
    const q = parseFloat(quantity);
    if (Number.isNaN(q)) return quantity;
    return q.toFixed(precision.amount);
  };

  return (
    <div className="orderbook-container">
      <div className="orderbook-header">
        <span>Order Book</span>
        <span className="orderbook-timestamp">
          {new Date(orderBook.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className="orderbook-columns">
        <span className="col-price">Price (USDT)</span>
        <span className="col-amount">Amount ({symbol.split("/")[0]})</span>
      </div>

      {/* Asks (sell orders) - sorted from low to high, displayed in reverse */}
      <div className="orderbook-asks">
        {asksWithTotal
          .slice(0, 10)
          .reverse()
          .map((level, idx) => (
            <div
              key={idx}
              className="orderbook-row ask-row"
              onClick={() => handlePriceClick(level.price, "sell")}
            >
              <div
                className="orderbook-depth-bg ask-bg"
                style={{ width: `${(level.total / maxTotal) * 100}%` }}
              />
              <span className="orderbook-price ask-price">
                {formatPrice(level.price)}
              </span>
              <span className="orderbook-quantity">
                {formatQuantity(level.quantity)}
              </span>
            </div>
          ))}
      </div>

      {/* Spread display - Method C: Left-right aligned, vertically centered */}
      <div className="orderbook-spread">
        <span className="spread-price">
          {currentPrice.toLocaleString("en-US", {
            minimumFractionDigits: precision.price,
            maximumFractionDigits: precision.price,
          })}
        </span>
        <div className="spread-details">
          <span className="spread-label">Spread</span>
          <span className="spread-value">
            {spread.toFixed(precision.price)}
          </span>
        </div>
      </div>

      {/* Bids (buy orders) - sorted from high to low */}
      <div className="orderbook-bids">
        {bidsWithTotal.slice(0, 10).map((level, idx) => (
          <div
            key={idx}
            className="orderbook-row bid-row"
            onClick={() => handlePriceClick(level.price, "buy")}
          >
            <div
              className="orderbook-depth-bg bid-bg"
              style={{ width: `${(level.total / maxTotal) * 100}%` }}
            />
            <span className="orderbook-price bid-price">
              {formatPrice(level.price)}
            </span>
            <span className="orderbook-quantity">
              {formatQuantity(level.quantity)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
