import './TradingLayout.css';

interface TradingLayoutProps {
  header: React.ReactNode;
  orderBook: React.ReactNode;
  chart: React.ReactNode;
  tradingForm: React.ReactNode;
  orderManagement: React.ReactNode;
}

export default function TradingLayout({
  header,
  orderBook,
  chart,
  tradingForm,
  orderManagement,
}: TradingLayoutProps) {
  return (
    <div className="trading-layout">
      {/* Top Header - Full Width */}
      <div className="trading-header">{header}</div>

      {/* Main Content Area */}
      <div className="trading-main">
        {/* Left: Order Book */}
        <div className="trading-orderbook">{orderBook}</div>

        {/* Center: Chart */}
        <div className="trading-chart">{chart}</div>

        {/* Right: Trading Form */}
        <div className="trading-form">{tradingForm}</div>
      </div>

      {/* Bottom: Order Management */}
      <div className="trading-orders">{orderManagement}</div>
    </div>
  );
}
