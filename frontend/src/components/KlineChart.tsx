import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import type { IChartApi, CandlestickData, Time } from "lightweight-charts";
import { useKlineStore } from "@/stores/klineStore";
import { useTradingStore } from "@/stores/tradingStore";
import "./KlineChart.css";

// TODO: Currently only 1m interval is supported due to backend WebSocket architecture limitations
// See: backend/docs/KLINE-MULTI-INTERVAL-ARCHITECTURE-ISSUE.md
const INTERVALS = ["1m"]; // Temporarily limited to 1m
// const INTERVALS = ["1s", "1m", "15m", "1h", "1d", "1w"]; // Full list (to be enabled after refactor)

export default function KlineChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);

  const [interval, setInterval] = useState("1m");

  const { selectedSymbol, selectedExchange } = useTradingStore();
  const { klines, loading, loadHistory } = useKlineStore();

  const key = `${selectedExchange}:${selectedSymbol}:${interval}`;
  const currentKlines = Array.isArray(klines[key]) ? klines[key] : [];
  const isLoading = loading[key];

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "#1E2329" },
        textColor: "#EAECEF",
      },
      grid: {
        vertLines: { color: "#2B3139" },
        horzLines: { color: "#2B3139" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: interval === "1s",
      },
    });

    // Create candlestick series (v5 API - use addSeries with CandlestickSeries)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#0ECB81",
      downColor: "#F6465D",
      borderUpColor: "#0ECB81",
      borderDownColor: "#F6465D",
      wickUpColor: "#0ECB81",
      wickDownColor: "#F6465D",
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [interval]);

  // Load historical data when exchange/symbol/interval changes
  useEffect(() => {
    loadHistory(selectedExchange, selectedSymbol, interval);
  }, [selectedExchange, selectedSymbol, interval, loadHistory]);

  // Update chart data when klines change
  useEffect(() => {
    if (!seriesRef.current || currentKlines.length === 0) return;

    try {
      // Convert to lightweight-charts format
      const chartData: CandlestickData<Time>[] = currentKlines.map((k) => ({
        time: Math.floor(k.timestamp / 1000) as Time, // Convert to seconds and cast to Time
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
      }));

      // Sort by time to ensure correct order
      chartData.sort((a, b) => (a.time as number) - (b.time as number));

      // Set data
      seriesRef.current.setData(chartData);

      // Auto-scroll to latest data
      if (chartRef.current) {
        chartRef.current.timeScale().scrollToRealTime();
      }
    } catch (error) {
      console.error("[KlineChart] Failed to update chart:", error);
    }
  }, [currentKlines]);

  // Handle interval change
  const handleIntervalChange = (newInterval: string) => {
    setInterval(newInterval);
  };

  return (
    <div className="kline-chart-container">
      {/* Interval selector */}
      <div className="kline-header">
        <div className="kline-title">
          {selectedSymbol} - {selectedExchange.toUpperCase()}
        </div>
        <div className="kline-intervals">
          {INTERVALS.map((int) => (
            <button
              key={int}
              className={`interval-btn ${interval === int ? "active" : ""}`}
              onClick={() => handleIntervalChange(int)}
              disabled={isLoading}
            >
              {int}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      <div className="kline-chart-wrapper">
        <div ref={chartContainerRef} className="kline-chart" />

        {/* Loading overlay */}
        {isLoading && (
          <div className="kline-loading">
            <div className="loading-spinner"></div>
            <p>Loading {interval} klines...</p>
          </div>
        )}

        {/* No data message */}
        {!isLoading && currentKlines.length === 0 && (
          <div className="kline-no-data">
            <p>No kline data available</p>
            <p className="hint">
              Trying to load data from {selectedExchange}...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
