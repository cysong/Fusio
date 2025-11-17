import { useEffect, useState, useMemo } from "react";
import { Select, Tag } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import { socketClient } from "@/lib/socket";
import type { TickerData } from "@/types/market";
import styles from "./TradingHeader.module.css";

const { Option } = Select;

interface TradingHeaderProps {
  symbol: string;
  exchange: string;
  onSymbolChange: (symbol: string) => void;
  onExchangeChange: (exchange: string) => void;
}

export default function TradingHeader({
  symbol,
  exchange,
  onSymbolChange,
  onExchangeChange,
}: TradingHeaderProps) {
  const [tickers, setTickers] = useState<Record<string, TickerData>>({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = socketClient.connect();

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleTicker = (data: TickerData) => {
      const key = `${data.exchange}:${data.symbol}`;
      setTickers((prev) => ({
        ...prev,
        [key]: data,
      }));
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("ticker", handleTicker);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("ticker", handleTicker);
      socketClient.disconnect();
    };
  }, []);

  // Get current ticker for selected exchange and symbol
  const currentTicker = useMemo(() => {
    return tickers[`${exchange}:${symbol}`];
  }, [tickers, exchange, symbol]);

  // Get all tickers for current symbol across all exchanges
  const allExchangeTickers = useMemo(() => {
    const exchanges = ["binance", "bybit", "okx"];
    return exchanges
      .map((ex) => tickers[`${ex}:${symbol}`])
      .filter((t) => t !== undefined);
  }, [tickers, symbol]);

  // Calculate highest/lowest prices and spread
  const priceComparison = useMemo(() => {
    if (allExchangeTickers.length === 0) {
      return null;
    }

    const prices = allExchangeTickers.map((t) => ({
      exchange: t.exchange,
      price: t.price,
    }));
    const highest = prices.reduce((max, p) => (p.price > max.price ? p : max));
    const lowest = prices.reduce((min, p) => (p.price < min.price ? p : min));
    const spread = highest.price - lowest.price;
    const spreadPercent = (spread / lowest.price) * 100;

    return { highest, lowest, spread, spreadPercent };
  }, [allExchangeTickers]);

  // Available symbols (from backend config)
  const availableSymbols = ["BTC/USDT", "ETH/USDT"];
  const availableExchanges = ["binance", "bybit", "okx"];

  const isPositive = currentTicker?.priceChangePercent >= 0;
  const valueColor = isPositive ? "#3f8600" : "#cf1322";

  const formatPrice = (price: number) => {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className={styles.tradingHeaderContainer}>
      {/* Section 1: Symbol + Current Price */}
      <div className={`${styles.tradingHeaderSection} ${styles.symbolPrice}`}>
        <Select
          value={symbol}
          onChange={onSymbolChange}
          style={{ width: 140 }}
          size="large"
        >
          {availableSymbols.map((sym) => (
            <Option key={sym} value={sym}>
              {sym}
            </Option>
          ))}
        </Select>

        {currentTicker ? (
          <div className={styles.currentPrice}>
            <div className={styles.priceValue} style={{ color: valueColor }}>
              ${formatPrice(currentTicker.price)}
            </div>
            <div className={styles.priceChange} style={{ color: valueColor }}>
              {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              {currentTicker.priceChangePercent.toFixed(2)}%
            </div>
          </div>
        ) : (
          <div className={`${styles.currentPrice} ${styles.loading}`}>Loading...</div>
        )}
      </div>

      {/* Section 2: 24h Statistics */}
      {currentTicker && (
        <div className={`${styles.tradingHeaderSection} ${styles.stats}`}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>24h High</span>
            <span className={styles.statValue}>
              ${formatPrice(currentTicker.high24h || 0)}
            </span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>24h Low</span>
            <span className={styles.statValue}>
              ${formatPrice(currentTicker.low24h || 0)}
            </span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>24h Volume</span>
            <span className={styles.statValue}>
              {formatNumber(currentTicker.volume)} {symbol.split("/")[0]}
            </span>
          </div>
        </div>
      )}

      {/* Section 3: Multi-Exchange Price Comparison (Two Rows) */}
      {priceComparison && (
        <div className={`${styles.tradingHeaderSection} ${styles.priceComparison}`}>
          <div className={styles.priceComparisonLeft}>
            <div className={styles.priceRow}>
              <span className="label">High:</span>
              <Tag color="green">
                {priceComparison.highest.exchange.toUpperCase()}
              </Tag>
              <span className="value">
                ${formatPrice(priceComparison.highest.price)}
              </span>
            </div>
            <div className={styles.priceRow}>
              <span className="label">Low:</span>
              <Tag color="red">
                {priceComparison.lowest.exchange.toUpperCase()}
              </Tag>
              <span className="value">
                ${formatPrice(priceComparison.lowest.price)}
              </span>
            </div>
          </div>
          <div className={styles.priceComparisonRight}>
            <div className={styles.spreadLeft}>Spread</div>
            <div className={styles.spreadRight}>
              <div className={styles.spreadValue}>
                ${formatNumber(priceComparison.spread)}
              </div>
              <div className={styles.spreadPercent}>
                {priceComparison.spreadPercent.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Exchange Selector */}
      <div className={`${styles.tradingHeaderSection} ${styles.exchangeSelector}`}>
        <Select
          value={exchange}
          onChange={onExchangeChange}
          style={{ width: 120 }}
          size="large"
        >
          {availableExchanges.map((ex) => (
            <Option key={ex} value={ex}>
              {ex.toUpperCase()}
            </Option>
          ))}
        </Select>
        <div
          className={`${styles.connectionStatus} ${
            isConnected ? styles.connected : styles.disconnected
          }`}
        >
          {isConnected ? "🟢 Live" : "🔴 Disconnected"}
        </div>
      </div>
    </div>
  );
}
