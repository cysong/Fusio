import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import TradingLayout from "@/components/TradingLayout";
import TradingHeader from "@/components/TradingHeader";
import OrderBook from "@/components/OrderBook";
import KlineChart from "@/components/KlineChart";
import { useOrderBook } from "@/hooks/useOrderBook";
import { useKlineUpdates } from "@/hooks/useKlineUpdates";
import { useOrderUpdates } from "@/hooks/useOrderUpdates";
import { useTradingStore } from "@/stores/tradingStore";
import { useKlineStore } from "@/stores/klineStore";
import OrderForm from "@/components/OrderForm";
import OrderList from "@/components/OrderList";

export default function TradingPage() {
  const { symbol } = useParams<{ symbol?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Convert URL symbol format (BTC-USDT) back to display format (BTC/USDT)
  const initialSymbol = symbol ? symbol.replace("-", "/") : "BTC/USDT";
  const initialExchange = searchParams.get("exchange") || "binance";

  // Local state for symbol and exchange
  const [currentSymbol, setCurrentSymbol] = useState(initialSymbol);
  const [currentExchange, setCurrentExchange] = useState(initialExchange);

  // Sync URL defaults to store once on mount
  useEffect(() => {
    useTradingStore.getState().setSelectedSymbol(initialSymbol);
    useTradingStore.getState().setSelectedExchange(initialExchange);
    console.log("🔄 Store initialized from URL:", {
      symbol: initialSymbol,
      exchange: initialExchange,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to WebSocket updates
  useOrderBook();
  useKlineUpdates();
  useOrderUpdates();

  // Update global trading store when symbol/exchange changes
  useEffect(() => {
    useTradingStore.getState().setSelectedSymbol(currentSymbol);
    useTradingStore.getState().setSelectedExchange(currentExchange);
    // Clear cached kline data for previous pair to avoid heavy re-render
    useKlineStore.getState().clearKlines(currentExchange, currentSymbol);
    console.log("Trading Page:", {
      symbol: currentSymbol,
      exchange: currentExchange,
    });
  }, [currentSymbol, currentExchange]); // Only depend on the actual values, not store functions

  // Handle symbol change - update URL
  const handleSymbolChange = (newSymbol: string) => {
    setCurrentSymbol(newSymbol);
    const urlSymbol = newSymbol.replace("/", "-");
    navigate(`/app/trading/${urlSymbol}?exchange=${currentExchange}`, {
      replace: true,
    });
  };

  // Handle exchange change - update URL
  const handleExchangeChange = (newExchange: string) => {
    setCurrentExchange(newExchange);
    const urlSymbol = currentSymbol.replace("/", "-");
    navigate(`/app/trading/${urlSymbol}?exchange=${newExchange}`, {
      replace: true,
    });
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
        <OrderBook symbol={currentSymbol} exchange={currentExchange} />
      }
      chart={<KlineChart />}
      tradingForm={
        <OrderForm />
      }
      orderManagement={
        <OrderList />
      }
    />
  );
}
