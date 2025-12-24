import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, X } from "lucide-react";
import { formatGP } from "@/lib/osrs-math";

export interface MarketAlert {
  id: string;
  itemId: number;
  itemName: string;
  timestamp: number;
  dropPercent: number;
  price: number;
}

interface LiveFeedProps {
  alerts: MarketAlert[];
  onClear: () => void;
  onRemove: (id: string) => void;
}

const LiveFeed = ({ alerts, onClear, onRemove }: LiveFeedProps) => {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 max-h-[400px] flex flex-col animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-2xl overflow-hidden flex flex-col">
        <div className="p-3 bg-slate-950/80 backdrop-blur border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
             <div className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
             </div>
             <span className="text-sm font-bold text-slate-200">Live Opportunities</span>
          </div>
          <button onClick={onClear} className="text-[10px] text-slate-500 hover:text-slate-300 uppercase tracking-wider">
            Clear
          </button>
        </div>
        
        <ScrollArea className="flex-1 max-h-[300px] bg-slate-900/90">
          <div className="divide-y divide-slate-800">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-3 hover:bg-slate-800/50 transition-colors group relative">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-slate-200 text-sm">{alert.itemName}</span>
                  <span className="text-xs font-mono text-emerald-400">{formatGP(alert.price)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center text-rose-400 gap-1">
                    <AlertTriangle size={10} />
                    <span>-{alert.dropPercent.toFixed(1)}% vs 24h</span>
                  </div>
                  <span className="text-slate-600">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                </div>
                
                <button 
                  onClick={() => onRemove(alert.id)}
                  className="absolute top-2 right-2 p-1 text-slate-600 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default LiveFeed;