import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import TradingLayout from '@/components/TradingLayout';
import TradingHeader from '@/components/TradingHeader';

export default function TradingPage() {
  const { symbol } = useParams<{ symbol?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Convert URL symbol format (BTC-USDT) back to display format (BTC/USDT)
  const initialSymbol = symbol ? symbol.replace('-', '/') : 'BTC/USDT';
  const initialExchange = searchParams.get('exchange') || 'binance';

  // Local state for symbol and exchange
  const [currentSymbol, setCurrentSymbol] = useState(initialSymbol);
  const [currentExchange, setCurrentExchange] = useState(initialExchange);

  useEffect(() => {
    console.log('Trading Page:', { symbol: currentSymbol, exchange: currentExchange });
  }, [currentSymbol, currentExchange]);

  // Handle symbol change - update URL
  const handleSymbolChange = (newSymbol: string) => {
    setCurrentSymbol(newSymbol);
    const urlSymbol = newSymbol.replace('/', '-');
    navigate(`/app/trading/${urlSymbol}?exchange=${currentExchange}`, { replace: true });
  };

  // Handle exchange change - update URL
  const handleExchangeChange = (newExchange: string) => {
    setCurrentExchange(newExchange);
    const urlSymbol = currentSymbol.replace('/', '-');
    navigate(`/app/trading/${urlSymbol}?exchange=${newExchange}`, { replace: true });
  };

  return (
    <TradingLayout
      header={
        <TradingHeader
          symbol={currentSymbol}
          exchange={currentExchange}
          onSymbolChange={handleSymbolChange}
          onExchangeChange={handleExchangeChange}
        />
      }
      orderBook={
        <div style={{ padding: 16 }}>
          <h3>Order Book</h3>
          <p style={{ color: '#888' }}>Coming in Stage 2-3</p>
        </div>
      }
      chart={
        <div style={{ padding: 16 }}>
          <h3>K-Line Chart</h3>
          <p style={{ color: '#888' }}>Coming in Stage 4</p>
        </div>
      }
      tradingForm={
        <div style={{ padding: 16 }}>
          <h3>Trading Form</h3>
          <p style={{ color: '#888' }}>Coming in Stage 5</p>
        </div>
      }
      orderManagement={
        <div>
          <h3>Order Management</h3>
          <p style={{ color: '#888' }}>Coming in Stage 5</p>
        </div>
      }
    />
  );
}
