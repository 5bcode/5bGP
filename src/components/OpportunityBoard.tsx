import React from 'react';
import { Link } from 'react-router-dom';
import { MarketOpportunity } from '@/hooks/use-market-analysis';
import { Badge } from "@/components/ui/badge";
import { formatGP } from "@/lib/osrs-math";
import { ArrowDown, TrendingUp, Plus, AlertCircle, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Item } from "@/services/osrs-api";
import ItemIcon from './ItemIcon';

export type AnalysisFilter = string;

interface OpportunityBoardProps {
  dumps: MarketOpportunity[];
  bestFlips: MarketOpportunity[];
  onTrackItem: (item: Item) => void;
  filter: AnalysisFilter;
}

const OpportunityBoard = ({ dumps, bestFlips, onTrackItem, filter }: OpportunityBoardProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 animate-in fade-in duration-700">
      
      {/* CRASH WATCH / DUMPS */}
      <div className="glass-card flex flex-col overflow-hidden relative border-rose-500/20 group/card">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="p-4 border-b border-slate-800/60 flex justify-between items-center bg-rose-500/5 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-rose-400 font-bold tracking-tight">
            <ArrowDown className="h-5 w-5 animate-bounce" /> 
            <span>Crash Watch</span>
          </div>
          <Link to={`/scanner?type=crash&filter=${filter}`}>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-widest text-rose-500/70 hover:text-rose-400 hover:bg-rose-500/10">
              View Scanner <ArrowRight size={12} className="ml-1" />
            </Button>
          </Link>
        </div>

        <div className="flex-1 divide-y divide-slate-800/30">
          {dumps.slice(0, 5).map((opp) => (
            <div key={opp.item.id} className="flex items-center justify-between p-3.5 hover:bg-rose-500/5 transition-all group cursor-default">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="relative">
                   <ItemIcon item={opp.item} size="md" className="shrink-0 bg-slate-900 rounded-lg border border-slate-800" />
                   <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-slate-950" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                      <Link to={`/item/${opp.item.id}`} className="font-bold text-slate-100 truncate hover:text-rose-400 transition-colors block text-sm">
                          {opp.item.name}
                      </Link>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                      <span className="data-text text-[11px] text-slate-400">{formatGP(opp.price.low)}</span>
                      <span className="text-[10px] text-slate-600 font-bold">•</span>
                      <span className="text-[10px] font-bold text-emerald-500/80">EST: +{formatGP(opp.secondaryMetric)}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right mr-4 shrink-0">
                <div className="font-black text-rose-500 text-lg font-mono">-{opp.metric.toFixed(1)}%</div>
                <div className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">Dump Magnitude</div>
              </div>

              <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onTrackItem(opp.item)}
              >
                  <Plus className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {dumps.length === 0 && (
              <div className="p-12 flex flex-col items-center justify-center text-slate-500 text-center">
                  <AlertCircle className="mb-3 h-10 w-10 opacity-10" />
                  <p className="text-sm font-medium">Scanning for panic wicks...</p>
                  <p className="text-[10px] mt-1 text-slate-600 uppercase tracking-widest font-bold">Waiting for volatility spike</p>
              </div>
          )}
        </div>
      </div>

      {/* BEST FLIPS */}
      <div className="glass-card flex flex-col overflow-hidden relative border-emerald-500/20 group/card">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="p-4 border-b border-slate-800/60 bg-emerald-500/5 backdrop-blur-sm flex justify-between items-center">
          <div className="flex items-center gap-2 text-emerald-400 font-bold tracking-tight">
            <TrendingUp className="h-5 w-5" /> 
            <span>Top Opportunities</span>
          </div>
          <Link to={`/scanner?type=flip&filter=${filter}`}>
             <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-widest text-emerald-500/70 hover:text-emerald-400 hover:bg-emerald-500/10">
              Analysis Hub <ArrowRight size={12} className="ml-1" />
            </Button>
          </Link>
        </div>

        <div className="flex-1 divide-y divide-slate-800/30">
          {bestFlips.slice(0, 5).map((opp) => (
            <div key={opp.item.id} className="flex items-center justify-between p-3.5 hover:bg-emerald-500/5 transition-all group cursor-default">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <ItemIcon item={opp.item} size="md" className="shrink-0 bg-slate-900 rounded-lg border border-slate-800 shadow-sm" />
                <div className="min-w-0">
                  <Link to={`/item/${opp.item.id}`} className="font-bold text-slate-100 truncate hover:text-emerald-400 transition-colors block text-sm">
                      {opp.item.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5">
                      <span className="data-text text-[11px] text-slate-400">IN: {formatGP(opp.price.low)}</span>
                      <span className="text-[10px] text-slate-600 font-bold">•</span>
                      <span className="text-[10px] font-bold text-emerald-400">{opp.secondaryMetric.toFixed(2)}% ROI</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right mr-4 shrink-0">
                <div className="font-black text-emerald-400 text-lg font-mono">+{formatGP(opp.metric)}</div>
                <div className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">Net Margin</div>
              </div>

              <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onTrackItem(opp.item)}
              >
                  <Plus className="h-4 w-4" />
              </Button>
            </div>
          ))}
           {bestFlips.length === 0 && (
              <div className="p-12 text-center flex flex-col items-center justify-center text-slate-600">
                  <Zap className="mb-3 h-10 w-10 opacity-10" />
                  <p className="text-sm font-medium">Aggregating trade data...</p>
              </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default OpportunityBoard;