import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  createChart, 
  ColorType, 
  IChartApi, 
  ISeriesApi, 
  UTCTimestamp,
  CandlestickSeries,
  HistogramSeries,
  AreaSeries,
  LineSeries,
  SeriesMarker
} from 'lightweight-charts';
import { useTimeseries } from '@/hooks/use-osrs-query';
import { TimeStep } from '@/services/osrs-api';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart2, LineChart, Activity, Layers } from 'lucide-react';
import { calculateSMA, calculateEMA, calculateMACD } from '@/lib/technical-analysis';
import { cn } from '@/lib/utils';

interface PriceChartProps {
  itemId: number;
}

type ChartView = 'candles' | 'spread' | 'line';

const PriceChart = ({ itemId }: PriceChartProps) => {
  const [timeframe, setTimeframe] = useState<TimeStep>('5m');
  const [view, setView] = useState<ChartView>('spread'); // Default to spread for flipping
  const [showSMA, setShowSMA] = useState(false);
  const [showEMA, setShowEMA] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  
  const chartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);
  
  // Series Refs
  const mainSeriesRef = useRef<ISeriesApi<"Candlestick" | "Area" | "Line"> | null>(null);
  const lowLineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null); // For Spread view
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  // MACD Series Refs
  const macdSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const signalSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const histogramSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const { data: timeseries, isLoading } = useTimeseries(itemId, timeframe);

  // Prepare Data
  const chartData = useMemo(() => {
    if (!timeseries || timeseries.length === 0) return null;

    // Sort by timestamp
    const sortedData = [...timeseries].sort((a, b) => a.timestamp - b.timestamp);

    // Generate Candle Data with better OSRS logic
    const candles: { time: UTCTimestamp; open: number; high: number; low: number; close: number }[] = [];
    const prices: number[] = []; // For indicators
    
    let prevClose = 0;

    sortedData.forEach((t, i) => {
        // If no data at all for this bucket, skip (leaves a gap on chart)
        if (!t.avgHighPrice && !t.avgLowPrice) return;

        // Calculate Representative Price (VWAP) for "Close"
        const highVol = t.highPriceVolume || 0;
        const lowVol = t.lowPriceVolume || 0;
        const totalVol = highVol + lowVol;
        
        let close = 0;
        if (totalVol > 0 && t.avgHighPrice && t.avgLowPrice) {
            close = ((t.avgHighPrice * highVol) + (t.avgLowPrice * lowVol)) / totalVol;
        } else {
            // Fallback if missing one side or volume
            close = (t.avgHighPrice || t.avgLowPrice || 0);
        }

        // Initialize prevClose on first valid candle
        if (prevClose === 0) prevClose = close;

        // Open is previous close
        const open = prevClose;
        
        // High/Low should encompass the trade range AND the movement
        // OSRS API gives avgHigh (Sold) and avgLow (Bought).
        const tradeHigh = t.avgHighPrice || t.avgLowPrice || highVol; // Fallback
        const tradeLow = t.avgLowPrice || t.avgHighPrice || lowVol;   // Fallback

        // The candle wick must reach the highest trade average
        // But also must contain the Open/Close body
        const high = Math.max(tradeHigh, open, close);
        const low = Math.min(tradeLow, open, close);

        candles.push({
            time: t.timestamp as UTCTimestamp,
            open,
            high,
            low,
            close
        });

        // Add to price array for indicators
        prices.push(close);
        
        // Update for next
        prevClose = close;
    });

    if (candles.length === 0) return null;

    // Indicators
    const smaData = showSMA ? calculateSMA(prices, 20) : [];
    const emaData = showEMA ? calculateEMA(prices, 12) : [];
    const macdData = showMACD ? calculateMACD(prices) : null;

    // Align indicators with timestamps
    // available timestamps map to 'candles' array
    const alignData = (indicatorData: number[]) => {
        const offset = candles.length - indicatorData.length;
        if (offset < 0) return []; // Should not happen
        return indicatorData.map((val, i) => ({
            time: candles[offset + i].time,
            value: val
        }));
    };

    return {
        candles, // Pre-calculated candles
        raw: sortedData, // Still keep raw for spread/volume views if needed
        sma: alignData(smaData),
        ema: alignData(emaData),
        macd: macdData ? {
            macd: alignData(macdData.macd),
            signal: alignData(macdData.signal),
            histogram: alignData(macdData.histogram)
        } : null
    };
  }, [timeseries, showSMA, showEMA, showMACD]);

  // Initialize/Update Main Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. Create Chart if not exists
    if (!chartRef.current) {
        chartRef.current = createChart(chartContainerRef.current, {
            layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#94a3b8' },
            grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
            width: chartContainerRef.current.clientWidth,
            height: 300,
            timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#334155' },
            rightPriceScale: { borderColor: '#334155', scaleMargins: { top: 0.1, bottom: 0.2 } }, // Leave room for volume
        });

        // Volume Series (Always present)
        volumeRef.current = chartRef.current.addSeries(HistogramSeries, {
            priceFormat: { type: 'volume' },
            priceScaleId: '', // Overlay
        });
        volumeRef.current.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    }

    const chart = chartRef.current;

    // 2. Clean up old main series if type changed
    if (mainSeriesRef.current) {
        chart.removeSeries(mainSeriesRef.current);
        mainSeriesRef.current = null;
    }
    if (lowLineSeriesRef.current) {
        chart.removeSeries(lowLineSeriesRef.current);
        lowLineSeriesRef.current = null;
    }

    // 3. Add Series based on View
    if (!chartData) return;

    if (view === 'candles') {
        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981', downColor: '#ef4444',
            borderVisible: false, wickUpColor: '#10b981', wickDownColor: '#ef4444',
        });
        
        series.setData(chartData.candles);
        mainSeriesRef.current = series;

    } else if (view === 'spread') {
        // High Line (Sell Price)
        const highSeries = chart.addSeries(LineSeries, {
            color: '#10b981', lineWidth: 2, title: 'Sell (High)'
        });
        const highData = chartData.raw
            .filter(d => d.avgHighPrice && d.avgHighPrice > 0)
            .map(d => ({ time: d.timestamp as UTCTimestamp, value: d.avgHighPrice! }));
        highSeries.setData(highData);
        mainSeriesRef.current = highSeries;

        // Low Line (Buy Price)
        const lowSeries = chart.addSeries(LineSeries, {
            color: '#3b82f6', lineWidth: 2, title: 'Buy (Low)'
        });
        const lowData = chartData.raw
            .filter(d => d.avgLowPrice && d.avgLowPrice > 0)
            .map(d => ({ time: d.timestamp as UTCTimestamp, value: d.avgLowPrice! }));
        lowSeries.setData(lowData);
        lowLineSeriesRef.current = lowSeries;

    } else {
        // Simple Area (Avg Price)
        const series = chart.addSeries(AreaSeries, {
            topColor: 'rgba(16, 185, 129, 0.56)', bottomColor: 'rgba(16, 185, 129, 0.04)',
            lineColor: '#10b981', lineWidth: 2,
        });
        const data = chartData.raw.map(d => ({
            time: d.timestamp as UTCTimestamp,
            value: (d.avgHighPrice || 0 + (d.avgLowPrice || 0)) / (d.avgHighPrice && d.avgLowPrice ? 2 : 1)
        }));
        series.setData(data);
        mainSeriesRef.current = series;
    }

    // 4. Update Indicators
    // SMA
    if (showSMA) {
        if (!smaSeriesRef.current) smaSeriesRef.current = chart.addSeries(LineSeries, { color: '#fbbf24', lineWidth: 1, title: 'SMA (20)' });
        smaSeriesRef.current.setData(chartData.sma);
    } else if (smaSeriesRef.current) {
        chart.removeSeries(smaSeriesRef.current);
        smaSeriesRef.current = null;
    }

    // EMA
    if (showEMA) {
        if (!emaSeriesRef.current) emaSeriesRef.current = chart.addSeries(LineSeries, { color: '#a855f7', lineWidth: 1, title: 'EMA (12)' });
        emaSeriesRef.current.setData(chartData.ema);
    } else if (emaSeriesRef.current) {
        chart.removeSeries(emaSeriesRef.current);
        emaSeriesRef.current = null;
    }

    // Volume
    const volumes = chartData.raw.map(t => ({
        time: t.timestamp as UTCTimestamp,
        value: (t.highPriceVolume || 0) + (t.lowPriceVolume || 0),
        color: (t.avgHighPrice || 0) >= (t.avgLowPrice || 0) ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
    }));
    volumeRef.current?.setData(volumes);

    chart.timeScale().fitContent();

  }, [chartData, view, showSMA, showEMA]);

  // Initialize/Update MACD Chart
  useEffect(() => {
    if (!macdContainerRef.current) return;

    if (showMACD && chartData?.macd) {
        if (!macdChartRef.current) {
            macdChartRef.current = createChart(macdContainerRef.current, {
                layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#94a3b8' },
                grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
                width: macdContainerRef.current.clientWidth,
                height: 100, // Shorter height for indicator
                timeScale: { visible: false, timeVisible: true, secondsVisible: false }, // Hide time scale, sync manually?
                rightPriceScale: { borderColor: '#334155' },
            });

            histogramSeriesRef.current = macdChartRef.current.addSeries(HistogramSeries, { color: '#94a3b8' });
            macdSeriesRef.current = macdChartRef.current.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1 });
            signalSeriesRef.current = macdChartRef.current.addSeries(LineSeries, { color: '#f97316', lineWidth: 1 });
        }

        // Sync visible range? 
        // Lightweight charts doesn't auto-sync two charts easily without handlers.
        // For simplicity in this version, we fit content. 
        // Ideally, we'd use `subscribeVisibleTimeRangeChange` to sync.
        
        histogramSeriesRef.current?.setData(chartData.macd.histogram.map(d => ({
            ...d, color: d.value >= 0 ? '#10b981' : '#ef4444'
        })));
        macdSeriesRef.current?.setData(chartData.macd.macd);
        signalSeriesRef.current?.setData(chartData.macd.signal);
        
        macdChartRef.current.timeScale().fitContent();

    } else {
        if (macdChartRef.current) {
            macdChartRef.current.remove();
            macdChartRef.current = null;
        }
    }
  }, [showMACD, chartData]);

  // Resize Handler
  useEffect(() => {
      const handleResize = () => {
          if (chartContainerRef.current && chartRef.current) {
              chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
          }
          if (macdContainerRef.current && macdChartRef.current) {
              macdChartRef.current.applyOptions({ width: macdContainerRef.current.clientWidth });
          }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-full mt-4 flex flex-col h-full min-h-[400px]">
      {/* Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-4 gap-4">
        
        <div className="flex flex-wrap gap-2">
            <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as ChartView)} className="bg-slate-950 p-1 rounded-lg border border-slate-800">
                <ToggleGroupItem value="spread" size="sm" className="data-[state=on]:bg-slate-800 text-xs">
                    <Activity size={14} className="mr-1" /> Spread
                </ToggleGroupItem>
                <ToggleGroupItem value="candles" size="sm" className="data-[state=on]:bg-slate-800 text-xs">
                    <BarChart2 size={14} className="mr-1" /> Candles
                </ToggleGroupItem>
                <ToggleGroupItem value="line" size="sm" className="data-[state=on]:bg-slate-800 text-xs">
                    <LineChart size={14} className="mr-1" /> Line
                </ToggleGroupItem>
            </ToggleGroup>

            <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setShowSMA(!showSMA)}
                    className={cn("h-8 text-xs px-2", showSMA ? "text-amber-400 bg-amber-950/30" : "text-slate-500")}
                >
                    SMA
                </Button>
                <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setShowEMA(!showEMA)}
                    className={cn("h-8 text-xs px-2", showEMA ? "text-purple-400 bg-purple-950/30" : "text-slate-500")}
                >
                    EMA
                </Button>
                <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setShowMACD(!showMACD)}
                    className={cn("h-8 text-xs px-2", showMACD ? "text-blue-400 bg-blue-950/30" : "text-slate-500")}
                >
                    MACD
                </Button>
            </div>
        </div>

        <ToggleGroup type="single" value={timeframe} onValueChange={(v) => v && setTimeframe(v as TimeStep)} className="flex-wrap">
            <ToggleGroupItem value="5m" className="h-7 px-3 text-xs data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-400 hover:bg-slate-800">
                Live (5m)
            </ToggleGroupItem>
            <ToggleGroupItem value="1h" className="h-7 px-3 text-xs data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-400 hover:bg-slate-800">
                1W (1h)
            </ToggleGroupItem>
            <ToggleGroupItem value="6h" className="h-7 px-3 text-xs data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-400 hover:bg-slate-800">
                1M (6h)
            </ToggleGroupItem>
             <ToggleGroupItem value="24h" className="h-7 px-3 text-xs data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-400 hover:bg-slate-800">
                1Y (24h)
            </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Main Chart */}
      <div className="relative h-[300px] w-full border border-slate-800 rounded-t-lg overflow-hidden bg-slate-950/50">
         {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80">
                <Loader2 className="animate-spin text-emerald-500 h-8 w-8" />
            </div>
         )}
         <div ref={chartContainerRef} className="w-full h-full" />
      </div>

      {/* MACD Chart (Conditional) */}
      {showMACD && (
          <div className="h-[100px] w-full border-x border-b border-slate-800 rounded-b-lg overflow-hidden bg-slate-950/30">
              <div ref={macdContainerRef} className="w-full h-full" />
          </div>
      )}
      
      {!showMACD && (
        <div className="h-1 bg-slate-800 rounded-b-lg w-full" />
      )}

      <div className="mt-2 text-[10px] text-slate-600 flex justify-between px-1">
         <span>Source: OSRS Wiki Prices</span>
         <span className="flex items-center gap-2">
             {view === 'spread' && <><span className="text-blue-500">● Buy</span> <span className="text-emerald-500">● Sell</span></>}
             {showSMA && <span className="text-amber-500">● SMA(20)</span>}
             {showEMA && <span className="text-purple-500">● EMA(12)</span>}
         </span>
      </div>
    </div>
  );
};

export default PriceChart;