import { Card, Statistic, Tag, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { TickerData } from '@/types/market';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;

interface PriceCardProps {
  ticker: TickerData;
}

export default function PriceCard({ ticker }: PriceCardProps) {
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

  return (
    <Card
      style={{
        transition: 'all 0.3s',
        backgroundColor: flash ? (isPositive ? '#f6ffed' : '#fff2f0') : 'white',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <Tag color={getSymbolColor(ticker.symbol)}>{ticker.symbol.replace('USDT', '/USDT')}</Tag>
        <Tag color="default">{ticker.exchange.toUpperCase()}</Tag>
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
          <div style={{ fontSize: 14 }}>{ticker.volume.toFixed(2)} BTC</div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Updated: {dayjs(ticker.timestamp).fromNow()}
        </Text>
      </div>
    </Card>
  );
}
