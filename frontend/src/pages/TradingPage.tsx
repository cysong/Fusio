import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import TradingLayout from "@/components/TradingLayout";
import TradingHeader from "@/components/TradingHeader";
import OrderBook from "@/components/OrderBook";
import KlineChart from "@/components/KlineChart";
import { useOrderBook } from "@/hooks/useOrderBook";
import { useKlineUpdates } from "@/hooks/useKlineUpdates";
import { useTradingStore } from "@/stores/tradingStore";

export default function TradingPage() {
  const { symbol } = useParams<{ symbol?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Convert URL symbol format (BTC-USDT) back to display format (BTC/USDT)
  const initialSymbol = symbol ? symbol.replace("-", "/") : "BTC/USDT";
  const initialExchange = searchParams.get("exchange") || "binance";

  // 🔧 FIX: Initialize store IMMEDIATELY (before any state/effects run)
  // This ensures KlineChart reads correct values when it mounts
  const storeRef = useTradingStore.getState();
  if (
    storeRef.selectedSymbol !== initialSymbol ||
    storeRef.selectedExchange !== initialExchange
  ) {
    storeRef.setSelectedSymbol(initialSymbol);
    storeRef.setSelectedExchange(initialExchange);
    console.log("🔄 Store initialized from URL:", {
      symbol: initialSymbol,
      exchange: initialExchange,
    });
  }

  // Local state for symbol and exchange
  const [currentSymbol, setCurrentSymbol] = useState(initialSymbol);
  const [currentExchange, setCurrentExchange] = useState(initialExchange);

  // Subscribe to WebSocket updates
  useOrderBook();
  useKlineUpdates();

  // Update global trading store when symbol/exchange changes
  useEffect(() => {
    useTradingStore.getState().setSelectedSymbol(currentSymbol);
    useTradingStore.getState().setSelectedExchange(currentExchange);
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
        <div style={{ padding: 16 }}>
          <h3>Trading Form</h3>
          <p style={{ color: "#888" }}>Coming in Stage 5</p>
        </div>
      }
      orderManagement={
        <div>
          <h3>Order Management</h3>
          <p style={{ color: "#888" }}>Coming in Stage 5</p>
        </div>
      }
    />
  );
}
