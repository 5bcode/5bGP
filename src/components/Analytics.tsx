import React, { useMemo, useState } from 'react';
import { Trade } from './TradeLogDialog';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatGP, calculateTax } from '@/lib/osrs-math';
import { Coins, TrendingUp, Percent, Activity } from 'lucide-react';
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AnalyticsProps {
  trades: Trade[];
}

// Session start time (persists during navigation within SPA, resets on reload)
const SESSION_START = Date.now();

const Analytics = ({ trades }: AnalyticsProps) => {
  const [period, setPeriod] = useState("all");

  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
        const tradeTime = t.timestamp;
        const now = Date.now();
        const date = new Date(tradeTime);
        const today = new Date();
        today.setHours(0,0,0,0);

        switch (period) {
            case "session":
                return tradeTime >= SESSION_START;
            case "day":
                return date >= today;
            case "week":
                return tradeTime >= (now - 7 * 24 * 60 * 60 * 1000);
            case "month":
                return tradeTime >= (now - 30 * 24 * 60 * 60 * 1000);
            case "all":
            default:
                return true;
        }
    });
  }, [trades, period]);

  const stats = useMemo(() => {
    if (filteredTrades.length === 0) return null;

    let totalProfit = 0;
    let totalTax = 0;
    let totalRevenue = 0;
    let wins = 0;
    let bestTrade = filteredTrades[0];

    // For Chart: Sort by date
    const sortedTrades = [...filteredTrades].sort((a, b) => a.timestamp - b.timestamp);
    
    let cumulative = 0;
    const chartData = sortedTrades.map(t => {
        cumulative += t.profit;
        return {
            date: t.timestamp,
            profit: cumulative, // Total profit up to this point
            tradeProfit: t.profit
        };
    });

    filteredTrades.forEach(t => {
        totalProfit += t.profit;
        totalRevenue += t.sellPrice * t.quantity;
        // Accurate tax calculation
        totalTax += calculateTax(t.sellPrice) * t.quantity;
        
        if (t.profit > 0) wins++;

        if (t.profit > bestTrade.profit) bestTrade = t;
    });

    const winRate = (wins / filteredTrades.length) * 100;
    // ROI Calculation: Profit / Cost
    const totalCost = totalRevenue - totalTax - totalProfit;
    const roi = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    return {
        totalProfit,
        totalTax,
        totalRevenue,
        winRate,
        tradeCount: filteredTrades.length,
        bestTrade,
        roi,
        chartData
    };
  }, [filteredTrades]);

  const tickFormatter = (unix: number) => {
    const date = new Date(unix);
    if (period === 'session' || period === 'day') {
        return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    return date.toLocaleDateString(undefined, {month:'short', day:'numeric'});
  };

  return (
    <div className="space-y-6">
      {/* PERIOD SELECTOR */}
      <div className="flex justify-center">
         <Tabs value={period} onValueChange={setPeriod} className="w-full max-w-md">
            <TabsList className="grid w-full grid-cols-5 bg-slate-900 border border-slate-800">
                <TabsTrigger value="session" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Session</TabsTrigger>
                <TabsTrigger value="day" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Day</TabsTrigger>
                <TabsTrigger value="week" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Week</TabsTrigger>
                <TabsTrigger value="month" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Month</TabsTrigger>
                <TabsTrigger value="all" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">All</TabsTrigger>
            </TabsList>
         </Tabs>
      </div>

      {!stats ? (
        <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-lg bg-slate-900/20">
            No completed trades found for this period.
        </div>
      ) : (
        <>
            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                            Est. Tax Paid: -{formatGP(stats.totalTax)}
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
                            {stats.tradeCount} trades in period
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
                    <CardTitle className="text-sm font-medium text-slate-400">Cumulative Profit ({period})</CardTitle>
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
                                    tickFormatter={tickFormatter}
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
                                    formatter={(value: number) => [formatGP(value), "Cumulative Profit"]}
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
        </>
      )}
    </div>
  );
};

export default Analytics;