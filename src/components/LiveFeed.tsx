import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, X, Zap, ChevronRight } from "lucide-react";
import { formatGP } from "@/lib/osrs-math";
import { Link } from 'react-router-dom';

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
    <div className="fixed bottom-6 right-6 z-50 w-[340px] max-h-[460px] flex flex-col animate-in slide-in-from-right-5 fade-in duration-500">
      <div className="glass-card flex flex-col overflow-hidden border-emerald-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="p-4 bg-emerald-500/10 backdrop-blur-md border-b border-emerald-500/20 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          <div className="flex items-center gap-3">
             <div className="relative flex h-2.5 w-2.5">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
             </div>
             <span className="text-xs font-black text-slate-100 uppercase tracking-widest">Live Signals</span>
          </div>
          <button 
            onClick={onClear} 
            className="text-[10px] font-black text-slate-500 hover:text-rose-400 uppercase tracking-widest transition-colors"
          >
            Purge All
          </button>
        </div>
        
        {/* Alerts List */}
        <ScrollArea className="flex-1 max-h-[380px] bg-slate-950/40">
          <div className="divide-y divide-slate-800/40">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-4 hover:bg-slate-800/30 transition-all group relative">
                <Link to={`/item/${alert.itemId}`} className="block">
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="font-bold text-slate-100 text-sm group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                        {alert.itemName}
                        <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-4px] group-hover:translate-x-0" />
                      </span>
                      <span className="data-text text-xs font-bold text-emerald-400 bg-emerald-500/5 px-1.5 rounded border border-emerald-500/10">
                        {formatGP(alert.price)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-rose-500 gap-1.5 font-bold text-[11px] bg-rose-500/5 px-1.5 py-0.5 rounded border border-rose-500/10">
                        <AlertTriangle size={12} className="animate-pulse" />
                        <span>-{alert.dropPercent.toFixed(1)}% DIP</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-600 font-medium">
                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                </Link>
                
                <button 
                  onClick={() => onRemove(alert.id)}
                  className="absolute top-2 right-2 p-1.5 text-slate-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-2.5 bg-slate-900/50 border-t border-slate-800/60 text-center">
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
              Verified by Analytics Engine v1.0
            </p>
        </div>
      </div>
    </div>
  );
};

export default LiveFeed;