import React, { useMemo } from 'react';
import { Trade } from '@/components/TradeLogDialog';
import { Card, CardContent } from "@/components/ui/card";
import { formatGP } from '@/lib/osrs-math';
import { Trophy, TrendingUp, History, Target } from 'lucide-react';

interface PersonalItemStatsProps {
  trades: Trade[];
}

const PersonalItemStats = ({ trades }: PersonalItemStatsProps) => {
  const stats = useMemo(() => {
    if (trades.length === 0) return null;

    let totalProfit = 0;
    let totalQuantity = 0;
    let totalCost = 0;
    let wins = 0;

    trades.forEach(t => {
        totalProfit += t.profit;
        totalQuantity += t.quantity;
        // Approximation of cost base
        totalCost += t.buyPrice * t.quantity;
        if (t.profit > 0) wins++;
    });

    const winRate = (wins / trades.length) * 100;
    const avgProfitPerItem = totalQuantity > 0 ? totalProfit / totalQuantity : 0;
    const roi = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    return {
        totalProfit,
        totalQuantity,
        winRate,
        avgProfitPerItem,
        roi
    };
  }, [trades]);

  if (!stats) return null;

  return (
    <Card className="bg-slate-900 border-slate-800 mb-6 bg-gradient-to-r from-slate-900 to-slate-900/50 overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
        <CardContent className="p-4 flex flex-wrap gap-6 items-center">
            
            <div className="flex items-center gap-3 pr-6 border-r border-slate-800">
                <div className="p-2 bg-emerald-950/30 rounded-full text-emerald-500">
                    <Trophy size={20} />
                </div>
                <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Your Total Profit</p>
                    <p className={`text-xl font-bold font-mono ${stats.totalProfit > 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {stats.totalProfit > 0 ? '+' : ''}{formatGP(stats.totalProfit)}
                    </p>
                </div>
            </div>

            <div className="flex gap-8 flex-1 justify-around">
                <div>
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Target size={14} /> <span className="text-xs">Avg Profit/Item</span>
                    </div>
                    <p className="font-mono font-bold text-slate-200">{formatGP(stats.avgProfitPerItem)}</p>
                </div>

                <div>
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <TrendingUp size={14} /> <span className="text-xs">Your ROI</span>
                    </div>
                    <p className={`font-mono font-bold ${stats.roi > 5 ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {stats.roi.toFixed(2)}%
                    </p>
                </div>

                <div>
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <History size={14} /> <span className="text-xs">Trade Count</span>
                    </div>
                    <p className="font-mono font-bold text-slate-200">
                        {trades.length} <span className="text-[10px] text-slate-500 font-normal">({stats.winRate.toFixed(0)}% win)</span>
                    </p>
                </div>
            </div>

        </CardContent>
    </Card>
  );
};

export default PersonalItemStats;