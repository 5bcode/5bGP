import React, { useEffect, useRef, useState } from 'react';
import { 
  createChart, 
  ColorType, 
  IChartApi, 
  ISeriesApi, 
  UTCTimestamp,
  CandlestickSeries,
  HistogramSeries
} from 'lightweight-charts';
import { useTimeseries } from '@/hooks/use-osrs-query';
import { TimeStep } from '@/services/osrs-api';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2 } from 'lucide-react';

interface PriceChartProps {
  itemId: number;
}

const PriceChart = ({ itemId }: PriceChartProps) => {
  const [timeframe, setTimeframe] = useState<TimeStep>('5m');
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const { data: timeseries, isLoading } = useTimeseries(itemId, timeframe);

  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#334155',
      },
      rightPriceScale: {
        borderColor: '#334155',
      },
    });

    // v5 API: Use addSeries(SeriesType, options)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '', // Overlay mode
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, 
        bottom: 0,
      },
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;
    volumeRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update Data
  useEffect(() => {
    if (!seriesRef.current || !volumeRef.current || !timeseries || timeseries.length === 0) return;

    const candles = timeseries
      .filter(t => t.avgHighPrice && t.avgLowPrice)
      .map(t => {
        return {
            time: t.timestamp as UTCTimestamp,
            open: t.avgLowPrice || 0,
            high: (t.avgHighPrice || t.avgLowPrice || 0) * 1.01,
            low: (t.avgLowPrice || 0) * 0.99,
            close: t.avgHighPrice || 0,
        };
      }).sort((a, b) => a.time - b.time);

    const cleanCandles = candles.filter(c => c.high >= c.low);

    const volumes = timeseries.map(t => ({
        time: t.timestamp as UTCTimestamp,
        value: (t.highPriceVolume || 0) + (t.lowPriceVolume || 0),
        color: '#334155'
    })).sort((a, b) => a.time - b.time);

    seriesRef.current.setData(cleanCandles);
    volumeRef.current.setData(volumes);
    
    if (chartRef.current) chartRef.current.timeScale().fitContent();

  }, [timeseries]);

  return (
    <div className="w-full mt-4 flex flex-col h-full min-h-[350px]">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-slate-500">Candles: Spread Range (Low to High)</span>
        </div>

        <ToggleGroup type="single" value={timeframe} onValueChange={(v) => v && setTimeframe(v as TimeStep)}>
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

      <div className="relative h-[300px] w-full border border-slate-800 rounded-lg overflow-hidden bg-slate-950/50">
         {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80">
                <Loader2 className="animate-spin text-emerald-500 h-8 w-8" />
            </div>
         )}
         <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
};

export default PriceChart;