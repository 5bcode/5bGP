import React, { useEffect, useState, useMemo } from 'react';
import { 
  ComposedChart, 
  Area, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { osrsApi, TimeSeriesPoint, TimeStep } from '@/services/osrs-api';
import { Loader2 } from 'lucide-react';
import { formatGP } from '@/lib/osrs-math';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface PriceChartProps {
  itemId: number;
}

const PriceChart = ({ itemId }: PriceChartProps) => {
  const [data, setData] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<TimeStep>('5m');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const points = await osrsApi.getTimeseries(itemId, timeframe);
        // Filter valid points but be less aggressive to keep volume data if possible
        // Ideally we want points where we have at least SOME data
        const validPoints = points.filter(p => p.avgHighPrice || p.avgLowPrice || p.highPriceVolume || p.lowPriceVolume);
        
        let sliceSize = 100;
        if (timeframe === '1h') sliceSize = 168; // 1 week
        if (timeframe === '6h') sliceSize = 120; // 1 month
        if (timeframe === '24h') sliceSize = 365; // 1 year

        setData(validPoints.slice(-sliceSize));
      } catch (error) {
        console.error("Chart data failed", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [itemId, timeframe]);

  const formattedData = useMemo(() => {
    return data.map(point => ({
        ...point,
        time: point.timestamp * 1000,
        high: point.avgHighPrice,
        low: point.avgLowPrice,
        volume: (point.highPriceVolume || 0) + (point.lowPriceVolume || 0)
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dateStr = new Date(label).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      return (
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg shadow-xl text-xs z-50">
          <p className="text-slate-400 font-mono mb-2 border-b border-slate-800 pb-1">{dateStr}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => {
                if (entry.dataKey === 'volume') {
                    return (
                        <div key={index} className="flex items-center justify-between gap-4 text-slate-500">
                             <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-slate-600"></span> Volume
                             </span>
                             <span className="font-mono font-bold text-slate-300">{formatGP(entry.value)}</span>
                        </div>
                    )
                }
                const isHigh = entry.dataKey === 'high';
                return (
                    <div key={index} className="flex items-center justify-between gap-4">
                        <span className={`flex items-center gap-1 ${isHigh ? 'text-emerald-400' : 'text-blue-400'}`}>
                            <span className={`w-2 h-2 rounded-full ${isHigh ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
                            {entry.name}
                        </span>
                        <span className="font-mono font-bold text-slate-200">{formatGP(entry.value)}</span>
                    </div>
                );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full mt-4 flex flex-col h-full min-h-[350px]">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-slate-400">Sell Price</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-slate-400">Buy Price</span>
            </div>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-700/50 rounded-sm"></div>
                <span className="text-slate-500">Volume</span>
            </div>
        </div>

        <ToggleGroup type="single" value={timeframe} onValueChange={(v) => v && setTimeframe(v as TimeStep)}>
            <ToggleGroupItem value="5m" className="h-7 px-3 text-xs data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-400 hover:bg-slate-800">
                8H
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

      {loading ? (
        <div className="h-[300px] w-full flex items-center justify-center bg-slate-950/30 rounded-lg border border-slate-800/50">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : data.length === 0 ? (
        <div className="h-[300px] w-full flex items-center justify-center text-slate-500 bg-slate-950/20 rounded-lg border border-dashed border-slate-800">
            No chart data available for this timeframe
        </div>
      ) : (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={formattedData}>
                    <defs>
                        <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    
                    <XAxis 
                        dataKey="time" 
                        stroke="#475569" 
                        fontSize={10} 
                        tickMargin={10}
                        minTickGap={50}
                        tickFormatter={(time) => {
                            const date = new Date(time);
                            if (timeframe === '24h') return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                            if (timeframe === '6h') return date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
                            return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                        }}
                    />
                    
                    {/* Price Axis */}
                    <YAxis 
                        yAxisId="price"
                        stroke="#475569" 
                        fontSize={10}
                        domain={['auto', 'auto']}
                        tickFormatter={(value) => {
                            if (value >= 1000000000) return `${(value/1000000000).toFixed(2)}B`;
                            if (value >= 1000000) return `${(value/1000000).toFixed(1)}M`;
                            if (value >= 1000) return `${(value/1000).toFixed(0)}k`;
                            return value;
                        }}
                        width={45}
                    />

                    {/* Volume Axis (Hidden mostly, pushes bars down) */}
                    <YAxis 
                        yAxisId="volume"
                        orientation="right"
                        domain={[0, 'dataMax * 4']} 
                        hide={true} 
                    />

                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1 }} />
                    
                    <Bar 
                        yAxisId="volume"
                        dataKey="volume" 
                        fill="#334155" 
                        opacity={0.3} 
                        barSize={4}
                    />

                    <Area 
                        yAxisId="price"
                        type="monotone" 
                        dataKey="high" 
                        name="Avg Sell"
                        stroke="#10b981" 
                        fillOpacity={1} 
                        fill="url(#colorHigh)" 
                        strokeWidth={2}
                        connectNulls
                    />
                    <Area 
                        yAxisId="price"
                        type="monotone" 
                        dataKey="low" 
                        name="Avg Buy"
                        stroke="#3b82f6" 
                        fillOpacity={1} 
                        fill="url(#colorLow)" 
                        strokeWidth={2}
                        connectNulls
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default PriceChart;