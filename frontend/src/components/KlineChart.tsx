import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import type { IChartApi, CandlestickData, Time } from "lightweight-charts";
import { useKlineStore } from "@/stores/klineStore";
import { useTradingStore } from "@/stores/tradingStore";
import "./KlineChart.css";

// Supported intervals (全时间维度覆盖：分钟→月)
// 所有三大交易所(Binance/Bybit/OKX)都支持这些周期
const INTERVALS = ["1m", "15m", "1h", "4h", "1d", "1w", "1M"];

export default function KlineChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);

  const [interval, setInterval] = useState("1m");

  const { selectedSymbol, selectedExchange } = useTradingStore();
  const { klines, loading, loadHistory } = useKlineStore();

  const key = `${selectedExchange}:${selectedSymbol}:${interval}`;
  const cached = klines[key];
  const currentKlines =
    cached?.data && Array.isArray(cached.data) ? cached.data : [];
  const isLoading = loading[key];
  const lastDataLengthRef = useRef<number>(0);
  const lastCandleTimestamp =
    currentKlines.length > 0
      ? currentKlines[currentKlines.length - 1].timestamp
      : 0;

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
    lastDataLengthRef.current = 0;

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

  useEffect(() => {
    loadHistory(selectedExchange, selectedSymbol, interval);
    lastDataLengthRef.current = 0;
  }, [selectedExchange, selectedSymbol, interval, loadHistory]);

  useEffect(() => {
    if (!seriesRef.current || !cached?.data || currentKlines.length === 0)
      return;

    try {
      const chartData: CandlestickData<Time>[] = currentKlines.map((k) => ({
        time: Math.floor(k.timestamp / 1000) as Time,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
      }));

      chartData.sort((a, b) => (a.time as number) - (b.time as number));

      const currentLength = chartData.length;
      const lastLength = lastDataLengthRef.current;

      if (lastLength === 0 || currentLength < lastLength) {
        seriesRef.current.setData(chartData);
        console.log(`[KlineChart] Set data: ${currentLength} candles`);
      } else if (currentLength > lastLength) {
        const newData = chartData.slice(lastLength);
        newData.forEach((data) => {
          seriesRef.current.update(data);
        });
        console.log(`[KlineChart] Added ${newData.length} new candles`);
      } else {
        const lastData = chartData[chartData.length - 1];
        seriesRef.current.update(lastData);
        console.log(
          `[KlineChart] Updated last candle: ${new Date(
            (lastData.time as number) * 1000
          ).toLocaleTimeString()}`
        );
      }

      lastDataLengthRef.current = currentLength;

      if (chartRef.current) {
        chartRef.current.timeScale().scrollToRealTime();
      }
    } catch (error) {
      console.error("[KlineChart] Failed to update chart:", error);
    }
  }, [cached?.timestamp, lastCandleTimestamp, currentKlines.length]);

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
