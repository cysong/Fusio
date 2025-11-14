import { useEffect, useState, useMemo } from 'react';
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

  // Process tickers data: group by exchange and sort by symbol
  const processedData = useMemo(() => {
    // Get all unique symbols and sort them
    const symbols = Array.from(
      new Set(Object.values(tickers).map((t) => t.symbol))
    ).sort();

    // Fixed exchange order
    const exchanges = ['binance', 'bybit', 'okx'];

    // Group by exchange, each exchange has tickers sorted by symbol
    const columns = exchanges.map((exchange) => ({
      exchange,
      tickers: symbols.map((symbol) => tickers[`${exchange}:${symbol}`] || null),
    }));

    return { columns, symbols };
  }, [tickers]);

  // Get border color for each exchange
  const getExchangeBorderColor = (exchange: string): string => {
    const colors: Record<string, string> = {
      binance: '#faad14', // Gold
      bybit: '#1890ff', // Blue
      okx: '#52c41a', // Green
    };
    return colors[exchange] || '#d9d9d9';
  };

  // Get exchange display name
  const getExchangeDisplayName = (exchange: string): string => {
    const names: Record<string, string> = {
      binance: 'BINANCE',
      bybit: 'BYBIT',
      okx: 'OKX',
    };
    return names[exchange] || exchange.toUpperCase();
  };

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

      {Object.keys(tickers).length > 0 ? (
        <Row gutter={24}>
          {processedData.columns.map((column) => (
            <Col key={column.exchange} xs={24} sm={24} lg={8}>
              <div
                style={{
                  border: `1px solid ${getExchangeBorderColor(column.exchange)}`,
                  borderRadius: '8px',
                  padding: '16px',
                }}
              >
                {/* Exchange header */}
                <h3
                  style={{
                    textAlign: 'center',
                    marginBottom: '16px',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    color: getExchangeBorderColor(column.exchange),
                  }}
                >
                  {getExchangeDisplayName(column.exchange)}
                </h3>

                {/* Exchange tickers */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {column.tickers.map((ticker, idx) =>
                    ticker ? (
                      <PriceCard key={`${ticker.exchange}:${ticker.symbol}`} ticker={ticker} />
                    ) : (
                      <div
                        key={`placeholder-${column.exchange}-${idx}`}
                        style={{
                          height: '120px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0.3,
                          border: '1px dashed #d9d9d9',
                          borderRadius: '8px',
                        }}
                      >
                        Loading...
                      </div>
                    )
                  )}
                </div>
              </div>
            </Col>
          ))}
        </Row>
      ) : (
        <Alert
          message="Waiting for Data"
          description="Connecting to exchange to fetch real-time prices..."
          type="info"
        />
      )}
    </div>
  );
}
