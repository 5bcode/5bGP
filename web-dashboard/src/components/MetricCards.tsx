import React from 'react';
import { PriceData } from '@/services/osrs-api';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, Copy, AlertTriangle, TrendingUp, TrendingDown, Target, Zap } from 'lucide-react';
import { formatGP } from '@/lib/osrs-math';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MetricCardsProps {
  price: PriceData;
  net: number;
  roi: number;
  tax: number;
  volatility: number;
}

export const MetricCards = ({ price, net, roi, tax, volatility }: MetricCardsProps) => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  };

  const formatRelTime = (timestamp: number) => {
    const s = Math.floor(Date.now() / 1000 - timestamp);
    if (s < 0) return 'Just now';
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      {/* BUY PRICE */}
      <div className="premium-card p-6 flex flex-col justify-between group bg-blue-500/[0.02]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Liquidity Entry</span>
          <Target size={14} className="text-blue-500" />
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl font-black text-white font-mono tracking-tighter">{formatGP(price.low)}</div>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/5 rounded-xl" onClick={() => copyToClipboard(price.low.toString(), "Buy Price")}>
              <Copy size={12} className="text-slate-500" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            <Clock size={12} /> {formatRelTime(price.lowTime)}
          </div>
        </div>
      </div>

      {/* SELL PRICE */}
      <div className="premium-card p-6 flex flex-col justify-between group bg-emerald-500/[0.02]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Liquidity Exit</span>
          <TrendingUp size={14} className="text-emerald-500" />
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl font-black text-white font-mono tracking-tighter">{formatGP(price.high)}</div>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/5 rounded-xl" onClick={() => copyToClipboard(price.high.toString(), "Sell Price")}>
              <Copy size={12} className="text-slate-500" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            <Clock size={12} /> {formatRelTime(price.highTime)}
          </div>
        </div>
      </div>

      {/* MARGIN / PROFIT */}
      <div className={cn(
        "premium-card p-6 flex flex-col justify-between transition-all",
        net > 0 ? "bg-emerald-500/[0.03] border-emerald-500/20" : "bg-rose-500/[0.03] border-rose-500/20"
      )}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Alpha Net</span>
          <Zap size={14} className={net > 0 ? "text-emerald-400" : "text-rose-500"} />
        </div>
        <div className="space-y-4">
          <div className={cn("text-3xl font-black font-mono tracking-tighter", net > 0 ? 'text-emerald-400' : 'text-rose-500')}>
            {net > 0 ? '+' : ''}{formatGP(net)}
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
            <span className="text-rose-500/80">Tax: {formatGP(tax)}</span>
            <span className={cn(roi > 2 ? 'text-emerald-400' : 'text-slate-500')}>ROI: {roi.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {/* RISK FACTOR */}
      <div className="premium-card p-6 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Market Noise</span>
          <AlertTriangle size={14} className={volatility > 50 ? "text-rose-500 animate-pulse" : "text-slate-600"} />
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="text-3xl font-black text-white font-mono tracking-tighter">{volatility.toFixed(1)}</div>
          </div>
          <Progress
            value={volatility}
            max={100}
            className="h-1.5 bg-white/5"
            indicatorClassName={cn(volatility > 50 ? "bg-rose-500" : "bg-blue-500")}
          />
        </div>
      </div>
    </div>
  );
};