import React from 'react';
import { Item, PriceData } from '@/services/osrs-api';
import ItemIcon from '@/components/ItemIcon';
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Activity, TrendingUp, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import TradeLogDialog, { Trade } from '@/components/TradeLogDialog';

interface ItemHeaderProps {
  item: Item;
  price: PriceData;
  recommendation: string;
  onLogTrade: (trade: Trade) => void;
}

export const ItemHeader = ({ item, price, recommendation, onLogTrade }: ItemHeaderProps) => {
  let recColor = "text-slate-400";
  let recIcon = <Activity size={16} />;
  let borderColor = "border-slate-700";

  switch (recommendation) {
    case "Strong Buy":
      recColor = "text-emerald-400";
      recIcon = <TrendingUp size={16} />;
      borderColor = "border-emerald-500/50";
      break;
    case "Extreme Volatility":
      recColor = "text-rose-500";
      recIcon = <AlertTriangle size={16} />;
      borderColor = "border-rose-500/50";
      break;
    case "Safe Floor (Alch)":
      recColor = "text-blue-400";
      recIcon = <ShieldCheck size={16} />;
      break;
    case "Gap Widening":
      recColor = "text-amber-400";
      recIcon = <Zap size={16} />;
      break;
  }

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 bg-slate-900/50 p-6 rounded-lg border border-slate-800 backdrop-blur-sm">
      <div className="flex items-center gap-6">
        <ItemIcon item={item} size="lg" className="bg-slate-800 rounded-lg border border-slate-700 shadow-inner" />
        <div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">{item.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-slate-400">
            <Badge variant="outline" className="border-slate-700 bg-slate-950 font-mono text-xs">ID: {item.id}</Badge>
            {item.limit && (
              <Badge variant="outline" className="border-slate-700 bg-slate-950 text-xs">
                Limit: {item.limit.toLocaleString()}
              </Badge>
            )}
            {item.members ? (
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20">Members</Badge>
            ) : (
              <Badge variant="secondary" className="bg-slate-700 text-slate-300">F2P</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border bg-slate-950 ${borderColor} ${recColor}`}>
          {recIcon}
          <span className="font-bold text-sm">{recommendation}</span>
        </div>
        <TradeLogDialog item={item} priceData={price} onSave={onLogTrade} />
      </div>
    </div>
  );
};