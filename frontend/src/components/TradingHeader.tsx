import { useEffect, useState, useMemo } from 'react';
import { Select, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { socketClient } from '@/lib/socket';
import type { TickerData } from '@/types/market';
import './TradingHeader.css';

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

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('ticker', handleTicker);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('ticker', handleTicker);
      socketClient.disconnect();
    };
  }, []);

  // Get current ticker for selected exchange and symbol
  const currentTicker = useMemo(() => {
    return tickers[`${exchange}:${symbol}`];
  }, [tickers, exchange, symbol]);

  // Get all tickers for current symbol across all exchanges
  const allExchangeTickers = useMemo(() => {
    const exchanges = ['binance', 'bybit', 'okx'];
    return exchanges
      .map((ex) => tickers[`${ex}:${symbol}`])
      .filter((t) => t !== undefined);
  }, [tickers, symbol]);

  // Calculate highest/lowest prices and spread
  const priceComparison = useMemo(() => {
    if (allExchangeTickers.length === 0) {
      return null;
    }

    const prices = allExchangeTickers.map((t) => ({ exchange: t.exchange, price: t.price }));
    const highest = prices.reduce((max, p) => (p.price > max.price ? p : max));
    const lowest = prices.reduce((min, p) => (p.price < min.price ? p : min));
    const spread = highest.price - lowest.price;
    const spreadPercent = (spread / lowest.price) * 100;

    return { highest, lowest, spread, spreadPercent };
  }, [allExchangeTickers]);

  // Available symbols (from backend config)
  const availableSymbols = ['BTC/USDT', 'ETH/USDT'];
  const availableExchanges = ['binance', 'bybit', 'okx'];

  const isPositive = currentTicker?.priceChangePercent >= 0;
  const valueColor = isPositive ? '#3f8600' : '#cf1322';

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="trading-header-container">
      {/* Section 1: Symbol + Current Price */}
      <div className="trading-header-section symbol-price">
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
          <div className="current-price">
            <div className="price-value" style={{ color: valueColor }}>
              ${formatPrice(currentTicker.price)}
            </div>
            <div className="price-change" style={{ color: valueColor }}>
              {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              {currentTicker.priceChangePercent.toFixed(2)}%
            </div>
          </div>
        ) : (
          <div className="current-price loading">Loading...</div>
        )}
      </div>

      {/* Section 2: 24h Statistics */}
      {currentTicker && (
        <div className="trading-header-section stats">
          <div className="stat-item">
            <span className="stat-label">24h High</span>
            <span className="stat-value">
              ${formatPrice(currentTicker.high24h || 0)}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">24h Low</span>
            <span className="stat-value">
              ${formatPrice(currentTicker.low24h || 0)}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">24h Volume</span>
            <span className="stat-value">
              {formatNumber(currentTicker.volume)} {symbol.split('/')[0]}
            </span>
          </div>
        </div>
      )}

      {/* Section 3: Multi-Exchange Price Comparison (Two Rows) */}
      {priceComparison && (
        <div className="trading-header-section price-comparison">
          <div className="price-comparison-left">
            <div className="price-row">
              <span className="label">High:</span>
              <Tag color="green">{priceComparison.highest.exchange.toUpperCase()}</Tag>
              <span className="value">${formatPrice(priceComparison.highest.price)}</span>
            </div>
            <div className="price-row">
              <span className="label">Low:</span>
              <Tag color="red">{priceComparison.lowest.exchange.toUpperCase()}</Tag>
              <span className="value">${formatPrice(priceComparison.lowest.price)}</span>
            </div>
          </div>
          <div className="price-comparison-right">
            <span className="spread-label">Spread</span>
            <span className="spread-value">
              ${formatNumber(priceComparison.spread)}
            </span>
            <span className="spread-percent">
              {priceComparison.spreadPercent.toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {/* Section 4: Exchange Selector */}
      <div className="trading-header-section exchange-selector">
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
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '🟢 Live' : '🔴 Disconnected'}
        </div>
      </div>
    </div>
  );
}
