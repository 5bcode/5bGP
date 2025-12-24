import React from 'react';
import { PriceData } from '@/services/osrs-api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, Copy, AlertTriangle } from 'lucide-react';
import { formatGP } from '@/lib/osrs-math';
import { toast } from 'sonner';

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* BUY PRICE */}
      <Card className="bg-slate-900 border-slate-800 relative group overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">Buy Price (Insta Sell)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-slate-100 font-mono">{formatGP(price.low)}</div>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(price.low.toString(), "Buy Price")}>
              <Copy size={12} />
            </Button>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <Clock size={12} /> {Math.floor((Date.now() / 1000 - price.lowTime))}s ago
          </div>
        </CardContent>
      </Card>

      {/* SELL PRICE */}
      <Card className="bg-slate-900 border-slate-800 relative group overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">Sell Price (Insta Buy)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-slate-100 font-mono">{formatGP(price.high)}</div>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(price.high.toString(), "Sell Price")}>
              <Copy size={12} />
            </Button>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <Clock size={12} /> {Math.floor((Date.now() / 1000 - price.highTime))}s ago
          </div>
        </CardContent>
      </Card>

      {/* MARGIN / PROFIT */}
      <Card className="bg-slate-900 border-slate-800 relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-1 h-full ${net > 0 ? 'bg-emerald-400' : 'bg-rose-500'}`}></div>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">Net Profit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold font-mono ${net > 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
            {net > 0 ? '+' : ''}{formatGP(net)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex justify-between w-full">
            <span>Tax: <span className="text-rose-400">-{formatGP(tax)}</span></span>
            <span>ROI: <span className={roi > 2 ? 'text-emerald-500' : 'text-slate-400'}>{roi.toFixed(2)}%</span></span>
          </div>
        </CardContent>
      </Card>

      {/* RISK FACTOR */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">Volatility Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-2">
            <div className="text-2xl font-bold text-slate-100 font-mono">{volatility.toFixed(1)}</div>
            {volatility > 50 && <AlertTriangle className="text-rose-500 animate-pulse" size={20} />}
          </div>
          <Progress value={volatility} max={100} className={`h-1.5 ${volatility > 50 ? "bg-rose-900" : "bg-slate-800"}`} />
        </CardContent>
      </Card>
    </div>
  );
};