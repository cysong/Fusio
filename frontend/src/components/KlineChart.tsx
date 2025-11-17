import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
} from "lightweight-charts";
import type {
  IChartApi,
  CandlestickData,
  HistogramData,
  Time,
} from "lightweight-charts";
import { useKlineStore } from "@/stores/klineStore";
import { useTradingStore } from "@/stores/tradingStore";
import "./KlineChart.css";

// Supported intervals (鍏ㄦ椂闂寸淮搴﹁鐩栵細鍒嗛挓鈫掓湀)
// 鎵€鏈変笁澶т氦鏄撴墍(Binance/Bybit/OKX)閮芥敮鎸佽繖浜涘懆鏈?
const INTERVALS = ["1m", "15m", "1h", "4h", "1d", "1w", "1M"];

export default function KlineChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const lastFetchedAtRef = useRef<number | undefined>(undefined);
  const prevPairRef = useRef<{ exchange: string; symbol: string }>({
    exchange: "",
    symbol: "",
  });

  const [interval, setInterval] = useState("1m");

  const { selectedSymbol, selectedExchange } = useTradingStore();
  const { klines, loading, loadHistory, clearKlines } = useKlineStore();

  const key = `${selectedExchange}:${selectedSymbol}:${interval}`;
  const cached = klines[key];
  const currentKlines =
    cached?.data && Array.isArray(cached.data) ? cached.data : [];
  const isLoading = loading[key];
  const isStale = cached?.stale;
  // Detect browser local timezone for display (data stays as UTC seconds)
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lastDataLengthRef = useRef<number>(0);
  const lastCandleTimestamp =
    currentKlines.length > 0
      ? currentKlines[currentKlines.length - 1].timestamp
      : 0;

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const formatAxisTime = (unixSeconds: number) => {
      const isDailyOrAbove = ["1d", "1w", "1M"].includes(interval);
      const showSeconds = interval === "1s";
      const formatter = new Intl.DateTimeFormat(undefined, {
        timeZone,
        hour12: false,
        month: isDailyOrAbove ? "2-digit" : undefined,
        day: isDailyOrAbove ? "2-digit" : undefined,
        hour: isDailyOrAbove ? undefined : "2-digit",
        minute: isDailyOrAbove ? undefined : "2-digit",
        second: showSeconds ? "2-digit" : undefined,
      });
      return formatter.format(new Date(unixSeconds * 1000));
    };

    const formatTooltipTime = (unixSeconds: number) => {
      const formatter = new Intl.DateTimeFormat(undefined, {
        timeZone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      return formatter.format(new Date(unixSeconds * 1000));
    };

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
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: "#758696",
          style: 0,
          labelBackgroundColor: "#1E2329",
        },
        horzLine: {
          width: 1,
          color: "#758696",
          style: 0,
          labelBackgroundColor: "#1E2329",
        },
      },
      rightPriceScale: {
        borderColor: "#2B3139",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        entireTextOnly: false,
        ticksVisible: true,
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: interval === "1s",
        rightOffset: 10,
        barSpacing: 6,
        minBarSpacing: 2,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: false,
        allowBoldLabels: true,
        borderVisible: true,
        borderColor: "#2B3139",
        tickMarkFormatter: (time: number) => formatAxisTime(time),
      },
      localization: {
        timeFormatter: (time: any) =>
          typeof time === "number" ? formatAxisTime(time) : "",
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#0ECB81",
      downColor: "#F6465D",
      borderUpColor: "#0ECB81",
      borderDownColor: "#F6465D",
      wickUpColor: "#0ECB81",
      wickDownColor: "#F6465D",
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
      priceLineVisible: true,
      lastValueVisible: true,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;
    lastDataLengthRef.current = 0;

    const tooltip = document.createElement("div");
    tooltip.className = "kline-tooltip";
    tooltip.style.cssText = `
      position: absolute;
      display: none;
      padding: 8px 12px;
      background: rgba(30, 35, 41, 0.95);
      border: 1px solid #2B3139;
      border-radius: 4px;
      font-size: 12px;
      color: #EAECEF;
      pointer-events: none;
      z-index: 1000;
      font-family: 'Roboto Mono', monospace;
    `;
    chartContainerRef.current.appendChild(tooltip);
    tooltipRef.current = tooltip;

    const handleCrosshairMove = (param: any) => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.y < 0
      ) {
        tooltip.style.display = "none";
        return;
      }

      const data = param.seriesData.get(candlestickSeries);
      if (data && "open" in data) {
        const candle = data as CandlestickData<Time>;
        const timeStr = formatTooltipTime(candle.time as number);
        tooltip.innerHTML = `
          <div style="margin-bottom: 4px; font-weight: 600;">${timeStr}</div>
          <div>O: <span style="color: #EAECEF;">${candle.open.toFixed(
            2
          )}</span></div>
          <div>H: <span style="color: #0ECB81;">${candle.high.toFixed(
            2
          )}</span></div>
          <div>L: <span style="color: #F6465D;">${candle.low.toFixed(
            2
          )}</span></div>
          <div>C: <span style="color: ${
            candle.close >= candle.open ? "#0ECB81" : "#F6465D"
          };">${candle.close.toFixed(2)}</span></div>
        `;
        tooltip.style.display = "block";

        const containerRect =
          chartContainerRef.current?.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        if (containerRect) {
          let left = param.point.x + 10;
          let top = param.point.y + 10;

          if (left + tooltipRect.width > containerRect.width) {
            left = param.point.x - tooltipRect.width - 10;
          }
          if (top + tooltipRect.height > containerRect.height) {
            top = param.point.y - tooltipRect.height - 10;
          }

          tooltip.style.left = Math.max(0, left) + "px";
          tooltip.style.top = Math.max(0, top) + "px";
        } else {
          tooltip.style.left = param.point.x + 10 + "px";
          tooltip.style.top = param.point.y + 10 + "px";
        }
      } else {
        tooltip.style.display = "none";
      }
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

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
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      if (tooltipRef.current && tooltipRef.current.parentNode) {
        tooltipRef.current.parentNode.removeChild(tooltipRef.current);
      }
      chart.remove();
    };
  }, [interval]);

  // Clear chart and cache when switching trading pair (exchange/symbol)
  useEffect(() => {
    const prev = prevPairRef.current;
    if (
      prev.exchange &&
      prev.symbol &&
      (prev.exchange !== selectedExchange || prev.symbol !== selectedSymbol)
    ) {
      clearKlines(prev.exchange, prev.symbol);
      if (seriesRef.current) {
        seriesRef.current.setData([]);
      }
      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.setData([]);
      }
      lastDataLengthRef.current = 0;
      lastFetchedAtRef.current = undefined;
    }
    prevPairRef.current = {
      exchange: selectedExchange,
      symbol: selectedSymbol,
    };
  }, [selectedExchange, selectedSymbol, clearKlines]);

  useEffect(() => {
    loadHistory(selectedExchange, selectedSymbol, interval);
    lastDataLengthRef.current = 0;
  }, [selectedExchange, selectedSymbol, interval, loadHistory]);

  useEffect(() => {
    if (!seriesRef.current || !cached?.data || currentKlines.length === 0)
      return;

    // Reset incremental counters when a fresh history fetch landed
    if (cached.fetchedAt && cached.fetchedAt !== lastFetchedAtRef.current) {
      lastDataLengthRef.current = 0;
      lastFetchedAtRef.current = cached.fetchedAt;
    }

    try {
      const convertToChartTime = (utcTimestamp: number): number => {
        // Keep UTC seconds; formatting handles local tz
        return Math.floor(utcTimestamp);
      };

      const validateKlineData = (k: any): boolean => {
        return (
          k.timestamp > 0 &&
          k.open > 0 &&
          k.high > 0 &&
          k.low > 0 &&
          k.close > 0 &&
          k.high >= k.low &&
          k.high >= Math.max(k.open, k.close) &&
          k.low <= Math.min(k.open, k.close) &&
          k.volume >= 0
        );
      };

      const chartData: CandlestickData<Time>[] = currentKlines
        .filter(validateKlineData)
        .map((k) => ({
          time: convertToChartTime(Math.floor(k.timestamp / 1000)) as Time,
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
        }));

      const volumeData: HistogramData<Time>[] = currentKlines
        .filter(validateKlineData)
        .map((k) => ({
          time: convertToChartTime(Math.floor(k.timestamp / 1000)) as Time,
          value: k.volume,
          color:
            k.close >= k.open
              ? "rgba(14, 203, 129, 0.5)"
              : "rgba(246, 70, 93, 0.5)",
        }));

      const currentLength = chartData.length;
      const lastLength = lastDataLengthRef.current;

      if (lastLength === 0 || currentLength < lastLength) {
        seriesRef.current.setData(chartData);
        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.setData(volumeData);
        }
        console.log(`[KlineChart] Set data: ${currentLength} candles`);
      } else if (currentLength > lastLength) {
        const newData = chartData.slice(lastLength);
        const newVolumeData = volumeData.slice(lastLength);
        newData.forEach((data) => {
          seriesRef.current.update(data);
        });
        if (volumeSeriesRef.current) {
          newVolumeData.forEach((data) => {
            volumeSeriesRef.current.update(data);
          });
        }
        console.log(`[KlineChart] Added ${newData.length} new candles`);
      } else {
        const lastData = chartData[chartData.length - 1];
        const lastVolumeData = volumeData[volumeData.length - 1];
        seriesRef.current.update(lastData);
        if (volumeSeriesRef.current && lastVolumeData) {
          volumeSeriesRef.current.update(lastVolumeData);
        }
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
  }, [
    cached?.fetchedAt,
    cached?.lastUpdatedAt,
    lastCandleTimestamp,
    currentKlines.length,
  ]);

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

        {/* Stale data warning */}
        {!isLoading && isStale && (
          <div className="kline-loading">
            <p>Load failed. Data may be stale.</p>
            <button
              onClick={() =>
                loadHistory(selectedExchange, selectedSymbol, interval)
              }
            >
              Retry
            </button>
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
