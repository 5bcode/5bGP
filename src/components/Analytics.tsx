import React, { useMemo } from 'react';
import { Trade } from './TradeLogDialog';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatGP } from '@/lib/osrs-math';
import { Coins, TrendingUp, TrendingDown, Percent, Activity } from 'lucide-react';
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';

interface AnalyticsProps {
  trades: Trade[];
}

const Analytics = ({ trades }: AnalyticsProps) => {
  const stats = useMemo(() => {
    if (trades.length === 0) return null;

    let totalProfit = 0;
    let totalTax = 0;
    let totalRevenue = 0;
    let wins = 0;
    let bestTrade = trades[0];
    let worstTrade = trades[0];

    // For Chart
    // Sort trades by date
    const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp);
    
    let cumulative = 0;
    const chartData = sortedTrades.map(t => {
        cumulative += t.profit;
        return {
            date: t.timestamp,
            profit: cumulative, // Total profit up to this point
            tradeProfit: t.profit
        };
    });

    trades.forEach(t => {
        totalProfit += t.profit;
        totalRevenue += t.sellPrice * t.quantity;
        totalTax += Math.floor(t.sellPrice * t.quantity * 0.01);
        if (t.profit > 0) wins++;

        if (t.profit > bestTrade.profit) bestTrade = t;
        if (t.profit < worstTrade.profit) worstTrade = t;
    });

    const winRate = (wins / trades.length) * 100;
    const roi = (totalProfit / (totalRevenue - totalProfit - totalTax)) * 100;

    return {
        totalProfit,
        totalTax,
        totalRevenue,
        winRate,
        tradeCount: trades.length,
        bestTrade,
        worstTrade,
        roi,
        chartData
    };
  }, [trades]);

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Profit */}
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Total Profit</CardTitle>
                <Coins className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold font-mono ${stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                    {stats.totalProfit > 0 ? '+' : ''}{formatGP(stats.totalProfit)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                    After tax (-{formatGP(stats.totalTax)})
                </p>
            </CardContent>
        </Card>

        {/* Win Rate */}
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Win Rate</CardTitle>
                <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-slate-100">
                    {stats.winRate.toFixed(1)}%
                </div>
                <p className="text-xs text-slate-500 mt-1">
                    {stats.tradeCount} total trades
                </p>
            </CardContent>
        </Card>

        {/* Best Flip */}
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Best Flip</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-emerald-400 font-mono">
                    +{formatGP(stats.bestTrade.profit)}
                </div>
                <p className="text-xs text-slate-500 mt-1 truncate" title={stats.bestTrade.itemName}>
                    {stats.bestTrade.itemName}
                </p>
            </CardContent>
        </Card>

        {/* Average ROI */}
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Total ROI</CardTitle>
                <Percent className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-slate-100">
                    {stats.roi.toFixed(2)}%
                </div>
                <p className="text-xs text-slate-500 mt-1">
                    On {formatGP(stats.totalRevenue)} revenue
                </p>
            </CardContent>
        </Card>
      </div>

      {/* PROFIT CHART */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400">Cumulative Profit Over Time</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.chartData}>
                        <defs>
                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis 
                            dataKey="date" 
                            stroke="#475569" 
                            fontSize={10}
                            tickFormatter={(unix) => new Date(unix).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                            minTickGap={30}
                        />
                        <YAxis 
                            stroke="#475569" 
                            fontSize={10}
                            tickFormatter={(val) => formatGP(val)}
                            width={50}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', color: '#e2e8f0' }}
                            itemStyle={{ color: '#10b981' }}
                            labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
                            labelFormatter={(unix) => new Date(unix).toLocaleString()}
                            formatter={(value: number) => [formatGP(value), "Total Profit"]}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="profit" 
                            stroke="#10b981" 
                            fillOpacity={1} 
                            fill="url(#colorProfit)" 
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;