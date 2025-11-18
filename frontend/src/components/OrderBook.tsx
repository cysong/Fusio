import { useMemo } from "react";
import { Typography } from "antd";
import { useTradingStore } from "@/stores/tradingStore";
import { getSymbolPrecision } from "@/config/symbolPrecision";
import styles from "./OrderBook.module.css";

interface OrderBookProps {
  symbol: string;
  exchange: string;
}

export default function OrderBook({ symbol, exchange }: OrderBookProps) {
  const { orderBooks, setBuyPrice, setSellPrice } = useTradingStore();

  const precision = useMemo(() => getSymbolPrecision(symbol), [symbol]);
  const orderBook = orderBooks[`${exchange}:${symbol}`];

  const { currentPrice, spread } = useMemo(() => {
    const bids = orderBook?.bids ?? [];
    const asks = orderBook?.asks ?? [];

    const bestBid = bids[0]?.[0];
    const bestAsk = asks[0]?.[0];

    const bid = bestBid !== undefined ? parseFloat(bestBid) : null;
    const ask = bestAsk !== undefined ? parseFloat(bestAsk) : null;

    const price = bid !== null && bid > 0 ? bid : ask !== null && ask > 0 ? ask : 0;
    const spreadValue = bid !== null && ask !== null ? Math.max(ask - bid, 0) : 0;

    return {
      currentPrice: price,
      spread: spreadValue,
    };
  }, [orderBook]);

  const asksWithTotal = useMemo(() => {
    if (!orderBook?.asks) return [];
    let total = 0;
    return orderBook.asks.map(([price, quantity]) => {
      total += parseFloat(quantity);
      return { price, quantity, total };
    });
  }, [orderBook]);

  const bidsWithTotal = useMemo(() => {
    if (!orderBook?.bids) return [];
    let total = 0;
    return orderBook.bids.map(([price, quantity]) => {
      total += parseFloat(quantity);
      return { price, quantity, total };
    });
  }, [orderBook]);

  if (!orderBook) {
    return (
      <div className={styles.orderbookContainer}>
        <div className={styles.orderbookHeader}>
          <Typography.Title level={4} className={styles.panelTitle}>
            Order Book
          </Typography.Title>
        </div>
        <div className={styles.orderbookLoading}>
          <p>Waiting for orderbook data...</p>
          <p style={{ fontSize: "12px", color: "#666" }}>
            Exchange: {exchange.toUpperCase()} | Symbol: {symbol}
          </p>
        </div>
      </div>
    );
  }

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
    return q.toFixed(precision.quantity);
  };

  return (
    <div className={styles.orderbookContainer}>
      <div className={styles.orderbookHeader}>
        <Typography.Title level={4} className={styles.panelTitle}>
          Order Book
        </Typography.Title>
        <span className={styles.orderbookTimestamp}>
          {new Date(orderBook.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className={styles.orderbookColumns}>
        <span className={styles.colPrice}>Price (USDT)</span>
        <span className={styles.colAmount}>Amount ({symbol.split("/")[0]})</span>
      </div>

      <div className={styles.orderbookAsks}>
        {asksWithTotal
          .slice(0, 10)
          .reverse()
          .map((level, idx) => (
            <div
              key={idx}
              className={`${styles.orderbookRow} ${styles.askRow}`}
              onClick={() => handlePriceClick(level.price, "sell")}
            >
              <div
                className={`${styles.orderbookDepthBg} ${styles.askBg}`}
                style={{ width: `${(level.total / maxTotal) * 100}%` }}
              />
              <span className={`${styles.orderbookPrice} ${styles.askPrice}`}>
                {formatPrice(level.price)}
              </span>
              <span className={styles.orderbookQuantity}>
                {formatQuantity(level.quantity)}
              </span>
            </div>
          ))}
      </div>

      <div className={styles.orderbookSpread}>
        <span className={styles.spreadPrice}>
          {currentPrice.toLocaleString("en-US", {
            minimumFractionDigits: precision.price,
            maximumFractionDigits: precision.price,
          })}
        </span>
        <div className={styles.spreadDetails}>
          <span className={styles.spreadLabel}>Spread</span>
          <span className={styles.spreadValue}>
            {spread.toFixed(precision.price)}
          </span>
        </div>
      </div>

      <div className={styles.orderbookBids}>
        {bidsWithTotal.slice(0, 10).map((level, idx) => (
          <div
            key={idx}
            className={`${styles.orderbookRow} ${styles.bidRow}`}
            onClick={() => handlePriceClick(level.price, "buy")}
          >
            <div
              className={`${styles.orderbookDepthBg} ${styles.bidBg}`}
              style={{ width: `${(level.total / maxTotal) * 100}%` }}
            />
            <span className={`${styles.orderbookPrice} ${styles.bidPrice}`}>
              {formatPrice(level.price)}
            </span>
            <span className={styles.orderbookQuantity}>
              {formatQuantity(level.quantity)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
