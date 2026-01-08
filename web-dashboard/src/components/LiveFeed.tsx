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
    <div className="fixed bottom-8 right-8 z-[100] w-[360px] max-h-[500px] flex flex-col animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="premium-card flex flex-col overflow-hidden border-emerald-500/20 bg-slate-950/80 backdrop-blur-3xl shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="p-5 bg-emerald-500/10 border-b border-white/5 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
          <div className="flex items-center gap-4">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]"></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Signal Array</span>
              <span className="text-[8px] font-bold text-emerald-500/80 uppercase tracking-widest">{alerts.length} active anomalies</span>
            </div>
          </div>
          <button
            onClick={onClear}
            className="h-8 px-3 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 uppercase tracking-widest transition-all"
          >
            Clear Array
          </button>
        </div>

        {/* Alerts List */}
        <ScrollArea className="flex-1 max-h-[400px]">
          <div className="divide-y divide-white/5">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-5 hover:bg-white/[0.03] transition-all group relative">
                <Link to={`/item/${alert.itemId}`} className="block">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-black text-white text-[13px] uppercase tracking-wide group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                      {alert.itemName}
                      <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-all translate-x-[-4px] group-hover:translate-x-0" />
                    </span>
                    <span className="font-mono text-[11px] font-black text-emerald-400 tracking-tighter">
                      {formatGP(alert.price)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-rose-500 gap-1.5 font-black text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20">
                      <AlertTriangle size={10} className="animate-pulse" />
                      <span>-{alert.dropPercent.toFixed(1)}% CRASH</span>
                    </div>
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </Link>

                <button
                  onClick={(e) => { e.preventDefault(); onRemove(alert.id); }}
                  className="absolute top-4 right-4 p-1 rounded-md bg-slate-900 border border-white/5 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                  title="Dismiss Signal"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-white/5 text-center">
          <div className="flex items-center justify-center gap-2">
            <Zap size={10} className="text-amber-500" />
            <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.3em]">
              Real-time Market Decryption Active
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


export default LiveFeed;