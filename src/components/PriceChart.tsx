import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
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
      const points = await osrsApi.getTimeseries(itemId, timeframe);
      // Filter out points with no data to avoid gaps or zeroes
      const validPoints = points.filter(p => p.avgHighPrice || p.avgLowPrice);
      // Limit points based on timeframe to keep chart readable
      // 5m: last 100 points (~8 hours)
      // 1h: last 168 points (1 week)
      // 6h: last 120 points (1 month)
      // 24h: last 365 points (1 year)
      let sliceSize = 100;
      if (timeframe === '1h') sliceSize = 168;
      if (timeframe === '6h') sliceSize = 120;
      if (timeframe === '24h') sliceSize = 365;

      setData(validPoints.slice(-sliceSize));
      setLoading(false);
    };
    loadData();
  }, [itemId, timeframe]);

  // Format timestamp for X-axis
  const formattedData = data.map(point => ({
    ...point,
    time: new Date(point.timestamp * 1000).toLocaleDateString(undefined, { 
        month: timeframe === '24h' ? 'short' : undefined,
        day: timeframe === '24h' || timeframe === '6h' ? 'numeric' : undefined,
        hour: timeframe !== '24h' ? '2-digit' : undefined, 
        minute: timeframe === '5m' ? '2-digit' : undefined 
    }),
    high: point.avgHighPrice,
    low: point.avgLowPrice
  }));

  return (
    <div className="w-full mt-4">
      <div className="flex justify-end mb-4">
        <ToggleGroup type="single" value={timeframe} onValueChange={(v) => v && setTimeframe(v as TimeStep)}>
            <ToggleGroupItem value="5m" aria-label="5 minutes" className="h-6 px-2 text-xs data-[state=on]:bg-emerald-500 data-[state=on]:text-white">
                5m
            </ToggleGroupItem>
            <ToggleGroupItem value="1h" aria-label="1 hour" className="h-6 px-2 text-xs data-[state=on]:bg-emerald-500 data-[state=on]:text-white">
                1h
            </ToggleGroupItem>
            <ToggleGroupItem value="6h" aria-label="6 hours" className="h-6 px-2 text-xs data-[state=on]:bg-emerald-500 data-[state=on]:text-white">
                6h
            </ToggleGroupItem>
            <ToggleGroupItem value="24h" aria-label="24 hours" className="h-6 px-2 text-xs data-[state=on]:bg-emerald-500 data-[state=on]:text-white">
                1D
            </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {loading ? (
        <div className="h-[300px] w-full flex items-center justify-center bg-slate-950/50 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : data.length === 0 ? (
        <div className="h-[300px] w-full flex items-center justify-center text-slate-500 bg-slate-950/20 rounded-lg border border-dashed border-slate-800">
            No chart data available for this timeframe
        </div>
      ) : (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedData}>
                <defs>
                    <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                    dataKey="time" 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickMargin={10}
                    minTickGap={40}
                />
                <YAxis 
                    stroke="#64748b" 
                    fontSize={10}
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => {
                        if (value >= 1000000000) return `${(value/1000000000).toFixed(2)}B`;
                        if (value >= 1000000) return `${(value/1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value/1000).toFixed(0)}k`;
                        return value;
                    }}
                    width={50}
                />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                    itemStyle={{ fontSize: '12px' }}
                    formatter={(value: number) => [formatGP(value), '']}
                    labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem', fontSize: '12px' }}
                />
                <Area 
                    type="monotone" 
                    dataKey="high" 
                    name="Avg High"
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorHigh)" 
                    strokeWidth={2}
                />
                <Area 
                    type="monotone" 
                    dataKey="low" 
                    name="Avg Low"
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorLow)" 
                    strokeWidth={2}
                />
                </AreaChart>
            </ResponsiveContainer>
        </div>
      )}
      
      <div className="flex justify-center gap-6 mt-2 text-xs font-mono">
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500/30 border border-emerald-500 rounded-full"></div>
            <span className="text-emerald-400">Avg High (Sell)</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500/30 border border-blue-500 rounded-full"></div>
            <span className="text-blue-400">Avg Low (Buy)</span>
        </div>
      </div>
    </div>
  );
};

export default PriceChart;