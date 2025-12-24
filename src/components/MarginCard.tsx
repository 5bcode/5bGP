import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Item, PriceData, Stats24h } from "@/services/osrs-api";
import { calculateMargin, formatGP, calculateVolatility } from "@/lib/osrs-math";
import { AlertTriangle, TrendingUp, BarChart3, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import TradeLogDialog, { Trade } from './TradeLogDialog';
import PriceChart from './PriceChart';
import ItemIcon from './ItemIcon';

interface MarginCardProps {
  item: Item;
  priceData?: PriceData;
  stats?: Stats24h;
  onLogTrade?: (trade: Trade) => void;
}

const MarginCard = ({ item, priceData, stats, onLogTrade }: MarginCardProps) => {
  const [chartOpen, setChartOpen] = useState(false);

  if (!priceData) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6 text-center text-slate-500">
          Waiting for price data...
        </CardContent>
      </Card>
    );
  }

  const { high, low, highTime, lowTime } = priceData;
  const { tax, net, roi } = calculateMargin(low, high);
  const volatility = calculateVolatility(high, low);
  
  // Calculate daily volume if stats are available
  const dailyVolume = stats ? (stats.highPriceVolume + stats.lowPriceVolume) : 0;
  
  // Risk assessment
  const isHighRisk = volatility > 50; 
  const isLowVolume = dailyVolume > 0 && dailyVolume < 100;

  // Time since update
  const now = Date.now() / 1000;
  const lastUpdate = Math.max(highTime, lowTime);
  const secondsAgo = Math.floor(now - lastUpdate);
  
  const isStale = secondsAgo > 300; // 5 mins

  return (
    <Card className="bg-slate-900 border-slate-800 overflow-hidden hover:border-slate-700 transition-all shadow-lg flex flex-col h-full group relative">
      {/* Status Indicators */}
      <div className="absolute top-0 right-0 p-2 flex gap-1 z-10">
         {isStale && (
             <Tooltip>
                <TooltipTrigger>
                    <div className="w-2 h-2 rounded-full bg-amber-500/50"></div>
                </TooltipTrigger>
                <TooltipContent>Data &gt; 5m old</TooltipContent>
             </Tooltip>
         )}
      </div>

      <CardHeader className="bg-slate-950/50 border-b border-slate-800 pb-3 pt-4">
        <div className="flex justify-between items-start gap-3">
          <ItemIcon item={item} size="md" className="bg-slate-900 rounded-md border border-slate-800 shrink-0" />
          <div className="flex-1 min-w-0 pr-2">
             <Link to={`/item/${item.id}`} className="hover:text-emerald-400 transition-colors block">
                <CardTitle className="text-lg font-bold text-slate-100 truncate flex items-center gap-2" title={item.name}>
                    {item.name}
                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                </CardTitle>
             </Link>
             <div className="flex items-center gap-2 mt-1">
                {item.limit && (
                    <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        Limit: {item.limit}
                    </span>
                )}
                {stats && (
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <BarChart3 size={10} /> {formatGP(dailyVolume)}
                    </span>
                )}
             </div>
          </div>
          
          <Dialog open={chartOpen} onOpenChange={setChartOpen}>
             <DialogTrigger asChild>
               <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 shrink-0">
                 <TrendingUp className="h-4 w-4" />
               </Button>
             </DialogTrigger>
             <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ItemIcon item={item} size="sm" />
                        {item.name} <span className="text-slate-500 font-normal text-sm">Last 24h Trend</span>
                    </DialogTitle>
                </DialogHeader>
                {chartOpen && <PriceChart itemId={item.id} />}
             </DialogContent>
           </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 flex flex-col">
        {/* Prices */}
        <div className="grid grid-cols-2 divide-x divide-slate-800 border-b border-slate-800 bg-slate-900/50">
          <div className="p-3">
            <p className="text-[10px] text-slate-500 uppercase font-mono mb-1">Buy (Low)</p>
            <p className="text-lg font-mono font-bold text-slate-200">{formatGP(low)}</p>
          </div>
          <div className="p-3">
            <p className="text-[10px] text-slate-500 uppercase font-mono mb-1">Sell (High)</p>
            <p className="text-lg font-mono font-bold text-slate-200">{formatGP(high)}</p>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-3 divide-x divide-slate-800 border-b border-slate-800 bg-slate-950/30">
          <div className="p-2 text-center">
            <p className="text-[10px] text-slate-500 uppercase">Margin</p>
            <p className="font-mono text-xs text-slate-300">{formatGP(high - low)}</p>
          </div>
          <div className="p-2 text-center">
            <p className="text-[10px] text-slate-500 uppercase">Tax</p>
            <p className="font-mono text-xs text-rose-400">-{formatGP(tax)}</p>
          </div>
          <div className="p-2 text-center">
            <p className="text-[10px] text-slate-500 uppercase">ROI</p>
            <p className={`font-mono text-xs font-bold ${roi > 1 ? 'text-emerald-500' : roi > 0.5 ? 'text-emerald-400/70' : 'text-slate-400'}`}>
              {roi.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Profit Highlight */}
        <div className="p-4 flex items-center justify-between bg-gradient-to-br from-slate-900 to-slate-900/80 flex-1">
          <div>
             <p className="text-[10px] text-slate-500 uppercase font-semibold">Potential Profit</p>
             <p className={`text-xl font-bold font-mono tracking-tight ${net > 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
               {net > 0 ? '+' : ''}{formatGP(net)}
             </p>
          </div>
          <div className="text-right">
             <p className="text-[10px] text-slate-500 uppercase">Volatility</p>
             <div className={`text-sm font-bold flex items-center justify-end gap-1 ${volatility > 30 ? 'text-rose-400' : 'text-slate-400'}`}>
                {volatility > 30 && <AlertTriangle size={10} />}
                {volatility.toFixed(1)}
             </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="px-3 pb-3 bg-slate-900">
           {onLogTrade && <TradeLogDialog item={item} priceData={priceData} onSave={onLogTrade} />}
        </div>
        
        {/* Footer */}
        <div className="bg-slate-950 py-1 px-3 text-[10px] text-slate-600 flex justify-between">
          <span>{secondsAgo}s ago</span>
          <span className={isLowVolume ? "text-rose-500" : ""}>{isLowVolume ? "Low Vol" : `ID: ${item.id}`}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarginCard;