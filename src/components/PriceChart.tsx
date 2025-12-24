import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { osrsApi, TimeSeriesPoint } from '@/services/osrs-api';
import { Loader2 } from 'lucide-react';
import { formatGP } from '@/lib/osrs-math';

interface PriceChartProps {
  itemId: number;
}

const PriceChart = ({ itemId }: PriceChartProps) => {
  const [data, setData] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const points = await osrsApi.getTimeseries(itemId, '5m');
      // Filter out points with no data to avoid gaps or zeroes
      const validPoints = points.filter(p => p.avgHighPrice || p.avgLowPrice);
      // Take last 100 points for better visibility
      setData(validPoints.slice(-100));
      setLoading(false);
    };
    loadData();
  }, [itemId]);

  if (loading) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center bg-slate-950/50 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center text-slate-500">
        No chart data available
      </div>
    );
  }

  // Format timestamp for X-axis
  const formattedData = data.map(point => ({
    ...point,
    time: new Date(point.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    high: point.avgHighPrice,
    low: point.avgLowPrice
  }));

  return (
    <div className="h-[300px] w-full mt-4">
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
            fontSize={12} 
            tickMargin={10}
            minTickGap={30}
          />
          <YAxis 
            stroke="#64748b" 
            fontSize={12}
            domain={['auto', 'auto']}
            tickFormatter={(value) => {
                if (value >= 1000000) return `${(value/1000000).toFixed(1)}M`;
                if (value >= 1000) return `${(value/1000).toFixed(0)}k`;
                return value;
            }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
            itemStyle={{ fontSize: '12px' }}
            formatter={(value: number) => [formatGP(value), '']}
            labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
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