import { Card, Statistic, Tag, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { TickerData } from '@/types/market';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

interface PriceCardProps {
  ticker: TickerData;
}

export default function PriceCard({ ticker }: PriceCardProps) {
  const navigate = useNavigate();
  const [previousPrice, setPreviousPrice] = useState(ticker.price);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (ticker.price !== previousPrice) {
      setFlash(true);
      setPreviousPrice(ticker.price);

      const timer = setTimeout(() => setFlash(false), 300);
      return () => clearTimeout(timer);
    }
  }, [ticker.price, previousPrice]);

  const isPositive = ticker.priceChangePercent >= 0;
  const valueColor = isPositive ? '#3f8600' : '#cf1322';

  const getSymbolColor = (symbol: string) => {
    if (symbol.includes('BTC')) return 'orange';
    if (symbol.includes('ETH')) return 'blue';
    return 'purple';
  };

  // Extract base currency from symbol (e.g., "BTC/USDT" -> "BTC")
  const getBaseCurrency = (symbol: string): string => {
    return symbol.split('/')[0];
  };

  // Format number with thousand separators
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleClick = () => {
    // Navigate to trading page with symbol and exchange
    // Symbol format: BTC/USDT -> BTC-USDT for URL
    const urlSymbol = ticker.symbol.replace('/', '-');
    navigate(`/app/trading/${urlSymbol}?exchange=${ticker.exchange}`);
  };

  return (
    <Card
      onClick={handleClick}
      style={{
        transition: 'all 0.3s',
        backgroundColor: flash ? (isPositive ? '#f6ffed' : '#fff2f0') : 'white',
        cursor: 'pointer',
      }}
      hoverable
    >
      <div style={{ marginBottom: 16 }}>
        <Tag color={getSymbolColor(ticker.symbol)}>{ticker.symbol}</Tag>
      </div>

      <Statistic
        value={ticker.price}
        precision={2}
        prefix="$"
        valueStyle={{
          color: valueColor,
          fontSize: 32,
          fontWeight: 'bold',
        }}
      />

      <div style={{ marginTop: 16, display: 'flex', gap: 16 }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            24h Change
          </Text>
          <div style={{ color: valueColor, fontSize: 14, fontWeight: 500 }}>
            {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {ticker.priceChangePercent.toFixed(2)}%
          </div>
        </div>

        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            24h Volume
          </Text>
          <div style={{ fontSize: 14 }}>
            {formatNumber(ticker.volume)} {getBaseCurrency(ticker.symbol)}
          </div>
        </div>
      </div>
    </Card>
  );
}
