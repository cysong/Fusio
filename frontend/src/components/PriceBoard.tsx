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

    // Define event handlers
    const handleConnect = () => {
      setIsConnected(true);
      setError(null);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleConnectError = (err: Error) => {
      setError('Connection failed: ' + err.message);
    };

    const handleTicker = (data: TickerData) => {
      // Use exchange:symbol as key to support multiple exchanges
      const key = `${data.exchange}:${data.symbol}`;
      setTickers((prev) => ({
        ...prev,
        [key]: data,
      }));
    };

    // Register event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('ticker', handleTicker);

    return () => {
      // Remove event listeners before disconnect
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('ticker', handleTicker);

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
            <Col key={`${ticker.exchange}:${ticker.symbol}`} xs={24} sm={12} lg={8}>
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
