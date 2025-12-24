import React from 'react';
import { Item, PriceData } from '@/services/osrs-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ShieldCheck } from 'lucide-react';
import { formatGP } from '@/lib/osrs-math';

interface DeepAnalysisProps {
  item: Item;
  price: PriceData;
  net: number;
  spreadDifference: number;
  isAlchable: boolean;
  highAlchProfit: number;
}

export const DeepAnalysis = ({ item, price, net, spreadDifference, isAlchable, highAlchProfit }: DeepAnalysisProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* SPREAD VISUALIZER */}
      <Card className="bg-slate-900 border-slate-800 md:col-span-2">
        <CardHeader className="pb-4 border-b border-slate-800/50">
          <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <DollarSign size={16} className="text-emerald-500" /> Margin Breakdown
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">Visualizing where your profit comes from relative to tax.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
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

          {/* Comparison to Avg Spread */}
          <div className="mt-6 p-3 bg-slate-950 rounded border border-slate-800 flex items-center justify-between">
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