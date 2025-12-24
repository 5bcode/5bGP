import React from 'react';
import { Item, PriceData } from "@/services/osrs-api";
import { calculateMargin, formatGP, calculateVolatility } from "@/lib/osrs-math";
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TradeLogDialog, { Trade } from './TradeLogDialog';

interface MarginCardProps {
  item: Item;
  priceData?: PriceData;
  onLogTrade?: (trade: Trade) => void;
}

const MarginCard = ({ item, priceData, onLogTrade }: MarginCardProps) => {
  if (!priceData) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6 text-center text-slate-500">
          No price data available for {item.name}
        </CardContent>
      </Card>
    );
  }

  const { high, low, highTime, lowTime } = priceData;
  const { tax, net, roi } = calculateMargin(low, high);
  const volatility = calculateVolatility(high, low);
  
  // Risk assessment
  const isHighRisk = volatility > 50; 

  // Time since update
  const now = Date.now() / 1000;
  const lastUpdate = Math.max(highTime, lowTime);
  const secondsAgo = Math.floor(now - lastUpdate);

  return (
    <Card className="bg-slate-900 border-slate-800 overflow-hidden hover:border-slate-700 transition-all shadow-lg flex flex-col h-full">
      <CardHeader className="bg-slate-950/50 border-b border-slate-800 pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-bold text-slate-100">{item.name}</CardTitle>
            <p className="text-xs text-slate-500 mt-1">Limit: {item.limit || 'Unknown'}</p>
          </div>
          {isHighRisk && (
            <div className="flex items-center gap-1 text-rose-500 text-xs font-bold uppercase bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
              <AlertTriangle size={12} /> Volatile
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="grid grid-cols-2 divide-x divide-slate-800 border-b border-slate-800">
          <div className="p-4">
            <p className="text-xs text-slate-500 uppercase font-mono mb-1">Buy Price (Low)</p>
            <p className="text-xl font-mono font-bold text-emerald-400">{formatGP(low)}</p>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-500 uppercase font-mono mb-1">Sell Price (High)</p>
            <p className="text-xl font-mono font-bold text-emerald-400">{formatGP(high)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-slate-800 border-b border-slate-800 bg-slate-950/30">
          <div className="p-3 text-center">
            <p className="text-[10px] text-slate-500 uppercase">Margin</p>
            <p className="font-mono text-sm text-slate-300">{formatGP(high - low)}</p>
          </div>
          <div className="p-3 text-center">
            <p className="text-[10px] text-slate-500 uppercase">Tax (2%)</p>
            <p className="font-mono text-sm text-rose-400">-{formatGP(tax)}</p>
          </div>
          <div className="p-3 text-center">
            <p className="text-[10px] text-slate-500 uppercase">ROI</p>
            <p className={`font-mono text-sm ${roi > 1 ? 'text-emerald-500' : 'text-slate-400'}`}>
              {roi.toFixed(2)}%
            </p>
          </div>
        </div>

        <div className="p-4 flex items-center justify-between bg-slate-900 flex-1">
          <div>
             <p className="text-xs text-slate-500">Potential Profit</p>
             <p className={`text-2xl font-bold font-mono ${net > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
               {net > 0 ? '+' : ''}{formatGP(net)}
             </p>
          </div>
          <div className="text-right">
             <p className="text-xs text-slate-500">Volatility Index</p>
             <div className="flex items-center justify-end gap-2">
               <span className={`text-lg font-bold ${volatility > 30 ? 'text-amber-500' : 'text-slate-400'}`}>
                 {volatility.toFixed(1)}
               </span>
             </div>
          </div>
        </div>
        
        <div className="px-4 pb-4 bg-slate-900">
           {onLogTrade && <TradeLogDialog item={item} priceData={priceData} onSave={onLogTrade} />}
        </div>

        <div className="bg-slate-950 py-1 px-4 text-[10px] text-slate-600 flex justify-between">
          <span>Updated {secondsAgo}s ago</span>
          <span>ID: {item.id}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarginCard;