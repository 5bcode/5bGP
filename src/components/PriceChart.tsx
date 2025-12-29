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
import { Loader2, CandlestickChart, LineChart } from 'lucide-react';

interface PriceChartProps {
  itemId: number;
}

type ChartType = 'candle' | 'area';

const PriceChart = ({ itemId }: PriceChartProps) => {
  const [timeframe, setTimeframe] = useState<TimeStep>('5m');
  const [chartType, setChartType] = useState<ChartType>('candle');
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // Using generic series type to handle both Candlestick and Area
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

    // Add Series based on selected type
    let mainSeries: ISeriesApi<"Candlestick"> | ISeriesApi<"Area">;

    if (chartType === 'candle') {
      mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });
    } else {
      mainSeries = chart.addSeries(AreaSeries, {
        lineColor: '#10b981',
        topColor: 'rgba(16, 185, 129, 0.4)',
        bottomColor: 'rgba(16, 185, 129, 0.0)',
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

    const sortedData = [...timeseries].sort((a, b) => a.timestamp - b.timestamp);

    if (chartType === 'candle') {
      const candles = sortedData
        .filter(t => t.avgHighPrice || t.avgLowPrice) 
        .map(t => {
          return {
              time: t.timestamp as UTCTimestamp,
              open: t.avgLowPrice || 0,
              high: (t.avgHighPrice || t.avgLowPrice || 0) * 1.01, // Slight scaling if equal
              low: (t.avgLowPrice || 0) * 0.99,
              close: t.avgHighPrice || 0,
          };
        });

      const cleanCandles = candles.filter(c => c.high >= c.low);
      (seriesRef.current as ISeriesApi<"Candlestick">).setData(cleanCandles);
    } else {
      const lineData = sortedData
        .filter(t => t.avgHighPrice || t.avgLowPrice)
        .map(t => ({
          time: t.timestamp as UTCTimestamp,
          // Use average of high/low for the line, or just high if low is missing
          value: ((t.avgHighPrice || 0) + (t.avgLowPrice || 0)) / (t.avgHighPrice && t.avgLowPrice ? 2 : 1)
        }));
      
      (seriesRef.current as ISeriesApi<"Area">).setData(lineData);
    }

    const volumes = sortedData.map(t => ({
        time: t.timestamp as UTCTimestamp,
        value: (t.highPriceVolume || 0) + (t.lowPriceVolume || 0),
        color: '#334155'
    }));

    volumeRef.current.setData(volumes);
    
    if (chartRef.current) chartRef.current.timeScale().fitContent();

  }, [timeseries, chartType]);

  return (
    <div className="w-full mt-4 flex flex-col h-full min-h-[350px]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-slate-500">
                {chartType === 'candle' ? 'Candles: Spread Range (Low to High)' : 'Area: Average Price Trend'}
            </span>
        </div>

        <div className="flex items-center gap-4">
            {/* Chart Type Toggle */}
            <ToggleGroup type="single" value={chartType} onValueChange={(v) => v && setChartType(v as ChartType)} className="border-r border-slate-800 pr-4">
                <ToggleGroupItem value="candle" className="h-7 w-7 p-0 data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-400 hover:bg-slate-800" title="Candlestick Chart">
                    <CandlestickChart size={14} />
                </ToggleGroupItem>
                <ToggleGroupItem value="area" className="h-7 w-7 p-0 data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-400 hover:bg-slate-800" title="Area Chart">
                    <LineChart size={14} />
                </ToggleGroupItem>
            </ToggleGroup>

            {/* Timeframe Toggle */}
            <ToggleGroup type="single" value={timeframe} onValueChange={(v) => v && setTimeframe(v as TimeStep)}>
                <ToggleGroupItem value="5m" className="h-7 px-3 text-xs data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-400 hover:bg-slate-800">
                    Live
                </ToggleGroupItem>
                <ToggleGroupItem value="1h" className="h-7 px-3 text-xs data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-400 hover:bg-slate-800">
                    1W
                </ToggleGroupItem>
                <ToggleGroupItem value="6h" className="h-7 px-3 text-xs data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-400 hover:bg-slate-800">
                    1M
                </ToggleGroupItem>
                <ToggleGroupItem value="24h" className="h-7 px-3 text-xs data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-400 hover:bg-slate-800">
                    1Y
                </ToggleGroupItem>
            </ToggleGroup>
        </div>
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