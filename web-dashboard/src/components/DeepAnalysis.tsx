import React from 'react';
import { Item, PriceData, Stats24h } from '@/services/osrs-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ShieldCheck, Minimize2, Maximize2 } from 'lucide-react';
import { formatGP } from '@/lib/osrs-math';
import { Progress } from "@/components/ui/progress";

interface DeepAnalysisProps {
  item: Item;
  price: PriceData;
  stats?: Stats24h;
  net: number;
  spreadDifference: number;
  isAlchable: boolean;
  highAlchProfit: number;
}

export const DeepAnalysis = ({ item, price, stats, net, spreadDifference, isAlchable, highAlchProfit }: DeepAnalysisProps) => {
  
  // Calculate Daily Range Position
  let rangePos = 50;
  let rangeLabel = "Mid Range";
  
  if (stats && stats.avgHighPrice > stats.avgLowPrice) {
      const dailyRange = stats.avgHighPrice - stats.avgLowPrice;
      const currentPos = price.low - stats.avgLowPrice;
      rangePos = (currentPos / dailyRange) * 100;
      rangePos = Math.max(0, Math.min(100, rangePos)); // Clamp 0-100

      if (rangePos < 20) rangeLabel = "Daily Bottom (Buy Zone)";
      else if (rangePos > 80) rangeLabel = "Daily Top (Sell Zone)";
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* SPREAD VISUALIZER */}
      <Card className="bg-slate-900 border-slate-800 md:col-span-2">
        <CardHeader className="pb-4 border-b border-slate-800/50">
          <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <DollarSign size={16} className="text-emerald-500" /> Margin Analysis
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">Visualizing where your profit comes from relative to tax.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          
          {/* 1. Bar Chart Breakdown */}
          <div>
            <div className="relative h-12 bg-slate-950 rounded-lg flex items-center overflow-hidden border border-slate-800">
                {/* Buy Cost */}
                <div className="h-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 border-r border-slate-700" style={{ width: '40%' }}>
                Cost
                </div>
                {/* Profit */}
                <div className="h-full bg-emerald-600/20 flex items-center justify-center text-xs font-bold text-emerald-400 relative" style={{ flex: 1 }}>
                <span className="z-10">Profit ({((net / price.high) * 100).toFixed(1)}%)</span>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                </div>
                {/* Tax */}
                <div className="h-full bg-rose-900/40 flex items-center justify-center text-[10px] text-rose-400 border-l border-rose-900/50" style={{ width: '10%' }}>
                Tax
                </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500 font-mono">
                <span>{formatGP(price.low)} (Buy)</span>
                <span>{formatGP(price.high)} (Sell)</span>
            </div>
          </div>

          {/* 2. Daily Range Position */}
          {stats && (
            <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Minimize2 size={10} /> Daily Low: {formatGP(stats.avgLowPrice)}</span>
                    <span className="font-bold text-slate-200">{rangeLabel}</span>
                    <span className="flex items-center gap-1">Daily High: {formatGP(stats.avgHighPrice)} <Maximize2 size={10} /></span>
                </div>
                <div className="relative h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    {/* Range Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/50 via-slate-900 to-rose-900/50"></div>
                    
                    {/* Indicator */}
                    <div 
                        className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-500"
                        style={{ left: `${rangePos}%` }}
                    ></div>
                </div>
                 <div className="flex justify-between text-[10px] text-slate-600">
                    <span>Good Entry</span>
                    <span>Riskier Entry</span>
                </div>
            </div>
          )}

          {/* Comparison to Avg Spread */}
          <div className="p-3 bg-slate-950 rounded border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Current Margin vs 24h Avg</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${spreadDifference > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {spreadDifference > 0 ? '+' : ''}{spreadDifference.toFixed(1)}%
              </span>
              {spreadDifference > 20 && <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-500">Wide Spread</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ARBITRAGE & ALCH */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-4 border-b border-slate-800/50">
          <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-500" /> Arbitrage Check
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">High Alch Value</span>
            <span className="font-mono text-slate-200">{formatGP(item.highalch || 0)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Nature Rune</span>
            <span className="font-mono text-slate-500">~100 gp</span>
          </div>
          <div className="pt-2 border-t border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-300">Alch Profit</span>
              <span className={`font-mono font-bold ${isAlchable ? 'text-emerald-400' : 'text-slate-500'}`}>
                {formatGP(highAlchProfit)}
              </span>
            </div>
          </div>

          {isAlchable ? (
            <div className="p-2 bg-emerald-950/30 border border-emerald-900/50 rounded text-xs text-emerald-400 flex items-start gap-2">
              <ShieldCheck size={14} className="shrink-0 mt-0.5" />
              <span>Price is below alch value. This is a very safe floor price.</span>
            </div>
          ) : (
            <div className="p-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-500">
              Price is above alch value. Normal market risk applies.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};