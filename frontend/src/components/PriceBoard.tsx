import { useEffect, useState } from 'react';
import { Row, Col, Alert } from 'antd';
import { socketClient } from '@/lib/socket';
import type { TickerData } from '@/types/market';
import PriceCard from './PriceCard';
import ConnectionStatus from './ConnectionStatus';

export default function PriceBoard() {
  const [tickers, setTickers] = useState<Record<string, TickerData>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = socketClient.connect();

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err: Error) => {
      setError('Connection failed: ' + err.message);
    });

    socket.on('ticker', (data: TickerData) => {
      setTickers((prev) => ({
        ...prev,
        [data.symbol]: data,
      }));
    });

    return () => {
      socketClient.disconnect();
    };
  }, []);

  return (
    <div>
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2>Real-time Market Data</h2>
        <ConnectionStatus isConnected={isConnected} />
      </div>

      {error && (
        <Alert
          message="Connection Error"
          description={error}
          type="error"
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]}>
        {Object.keys(tickers).length > 0 ? (
          Object.values(tickers).map((ticker) => (
            <Col key={ticker.symbol} xs={24} sm={12} lg={8}>
              <PriceCard ticker={ticker} />
            </Col>
          ))
        ) : (
          <Col span={24}>
            <Alert
              message="Waiting for Data"
              description="Connecting to exchange to fetch real-time prices..."
              type="info"
            />
          </Col>
        )}
      </Row>
    </div>
  );
}
