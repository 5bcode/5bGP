import React, { useMemo } from 'react';
import { Trade } from '@/components/TradeLogDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatGP } from '@/lib/osrs-math';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar } from 'lucide-react';

interface ProfitHeatmapProps {
  trades: Trade[];
}

const ProfitHeatmap = ({ trades }: ProfitHeatmapProps) => {
  const data = useMemo(() => {
    const today = new Date();
    // Generate last 365 days
    const dates = [];
    for (let i = 364; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        d.setHours(0,0,0,0);
        dates.push(d);
    }

    // Map trades to dates
    const map = new Map<string, { profit: number, count: number }>();
    let maxProfit = 0;

    trades.forEach(t => {
        const dateStr = new Date(t.timestamp).toDateString();
        const curr = map.get(dateStr) || { profit: 0, count: 0 };
        curr.profit += t.profit;
        curr.count += 1;
        map.set(dateStr, curr);
        if (curr.profit > maxProfit) maxProfit = curr.profit;
    });

    return { dates, map, maxProfit };
  }, [trades]);

  const getColor = (profit: number, count: number, maxProfit: number) => {
    if (count === 0) return "bg-slate-900 border-slate-800";
    if (profit < 0) return "bg-rose-900 border-rose-800";
    
    // Intensity based on max profit
    const ratio = maxProfit > 0 ? profit / maxProfit : 0;
    
    if (ratio > 0.75) return "bg-emerald-400 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.4)]";
    if (ratio > 0.5) return "bg-emerald-500 border-emerald-400";
    if (ratio > 0.25) return "bg-emerald-700 border-emerald-600";
    return "bg-emerald-900 border-emerald-800";
  };

  return (
    <Card className="bg-slate-950 border-slate-800 mb-8 overflow-hidden">
        <CardHeader className="pb-2 border-b border-slate-900">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Calendar size={16} className="text-emerald-500" /> Trading Consistency (Last 365 Days)
            </CardTitle>
        </CardHeader>
        <CardContent className="p-4 overflow-x-auto">
            <div className="flex gap-1 min-w-[800px]">
                {/* We need to group by weeks for the column layout */}
                {Array.from({ length: 53 }).map((_, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-1">
                        {Array.from({ length: 7 }).map((_, dayIndex) => {
                            const dateIndex = weekIndex * 7 + dayIndex;
                            if (dateIndex >= data.dates.length) return null;
                            
                            const date = data.dates[dateIndex];
                            const dateStr = date.toDateString();
                            const stats = data.map.get(dateStr) || { profit: 0, count: 0 };
                            
                            return (
                                <Tooltip key={dateStr}>
                                    <TooltipTrigger>
                                        <div 
                                            className={`w-3 h-3 rounded-sm border ${getColor(stats.profit, stats.count, data.maxProfit)}`} 
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-slate-900 border-slate-800 text-xs">
                                        <div className="font-bold text-slate-200">{date.toLocaleDateString()}</div>
                                        <div className={stats.profit > 0 ? "text-emerald-400" : stats.profit < 0 ? "text-rose-400" : "text-slate-400"}>
                                            {formatGP(stats.profit)}
                                        </div>
                                        <div className="text-slate-500">{stats.count} trades</div>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2 mt-4 text-[10px] text-slate-500 justify-end">
                <span>Loss</span>
                <div className="w-3 h-3 bg-rose-900 rounded-sm"></div>
                <div className="w-3 h-3 bg-slate-900 rounded-sm"></div>
                <div className="w-3 h-3 bg-emerald-900 rounded-sm"></div>
                <div className="w-3 h-3 bg-emerald-700 rounded-sm"></div>
                <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                <div className="w-3 h-3 bg-emerald-400 rounded-sm"></div>
                <span>Win</span>
            </div>
        </CardContent>
    </Card>
  );
};

export default ProfitHeatmap;