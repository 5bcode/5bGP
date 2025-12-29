import React, { useEffect, useRef, useState } from 'react';
import { 
  createChart, 
  ColorType, 
  IChartApi, 
  ISeriesApi, 
  UTCTimestamp,
  CandlestickSeries,
  HistogramSeries,
  AreaSeries
} from 'lightweight-charts';
import { useTimeseries } from '@/hooks/use-osrs-query';
import { TimeStep } from '@/services/osrs-api';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2, BarChart2, LineChart } from 'lucide-react';

interface PriceChartProps {
  itemId: number;
}

const PriceChart = ({ itemId }: PriceChartProps) => {
  const [timeframe, setTimeframe] = useState<TimeStep>('5m');
  const [chartType, setChartType] = useState<'candles' | 'area'>('candles');
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick" | "Area"> | null>(null);
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

    // Create Series based on selected type
    let mainSeries: ISeriesApi<"Candlestick" | "Area">;

    if (chartType === 'candles') {
        mainSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
        });
    } else {
        mainSeries = chart.addSeries(AreaSeries, {
            topColor: 'rgba(16, 185, 129, 0.56)',
            bottomColor: 'rgba(16, 185, 129, 0.04)',
            lineColor: '#10b981',
            lineWidth: 2,
        });
    }

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
    seriesRef.current = mainSeries;
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
  }, [chartType]); // Re-create chart when type changes

  // Update Data
  useEffect(() => {
    if (!seriesRef.current || !volumeRef.current || !timeseries || timeseries.length === 0) return;

    // Filter and Sort Data
    const validData = timeseries
      .filter(t => t.avgHighPrice || t.avgLowPrice) 
      .sort((a, b) => a.timestamp - b.timestamp);

    if (chartType === 'candles') {
        const candles = validData.map(t => ({
            time: t.timestamp as UTCTimestamp,
            open: t.avgLowPrice || 0,
            high: (t.avgHighPrice || t.avgLowPrice || 0) * 1.01, // Synthetic high/low if missing
            low: (t.avgLowPrice || 0) * 0.99,
            close: t.avgHighPrice || 0,
        }));
        // Filter out invalid candles
        (seriesRef.current as ISeriesApi<"Candlestick">).setData(candles.filter(c => c.high >= c.low));
    } else {
        const lineData = validData.map(t => ({
            time: t.timestamp as UTCTimestamp,
            // Use average of high/low for Line chart, or just High if selling focus
            value: (t.avgHighPrice && t.avgLowPrice) 
                ? (t.avgHighPrice + t.avgLowPrice) / 2 
                : (t.avgHighPrice || t.avgLowPrice || 0)
        }));
        (seriesRef.current as ISeriesApi<"Area">).setData(lineData);
    }

    const volumes = validData.map(t => ({
        time: t.timestamp as UTCTimestamp,
        value: (t.highPriceVolume || 0) + (t.lowPriceVolume || 0),
        color: (t.avgHighPrice || 0) >= (t.avgLowPrice || 0) ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
    }));

    volumeRef.current.setData(volumes);
    
    if (chartRef.current) chartRef.current.timeScale().fitContent();

  }, [timeseries, chartType]);

  return (
    <div className="w-full mt-4 flex flex-col h-full min-h-[350px]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        
        {/* Chart Type Toggle */}
        <div className="bg-slate-950 p-1 rounded-lg border border-slate-800">
            <ToggleGroup type="single" value={chartType} onValueChange={(v) => v && setChartType(v as 'candles' | 'area')}>
                <ToggleGroupItem value="candles" aria-label="Candlestick Chart" className="h-7 w-9 p-0 data-[state=on]:bg-slate-800">
                    <BarChart2 size={16} />
                </ToggleGroupItem>
                <ToggleGroupItem value="area" aria-label="Area Chart" className="h-7 w-9 p-0 data-[state=on]:bg-slate-800">
                    <LineChart size={16} />
                </ToggleGroupItem>
            </ToggleGroup>
        </div>

        {/* Timeframe Toggle */}
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
      
      <div className="mt-2 text-[10px] text-slate-600 flex justify-between px-1">
         <span>Source: OSRS Wiki Prices</span>
         <span>{chartType === 'candles' ? 'OHLC Candles' : 'Average Price Area'}</span>
      </div>
    </div>
  );
};

export default PriceChart;