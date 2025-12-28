import React from 'react';
import { Link } from 'react-router-dom';
import { MarketOpportunity } from '@/hooks/use-market-analysis';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatGP } from "@/lib/osrs-math";
import { ArrowDown, TrendingUp, Plus, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Item } from "@/services/osrs-api";
import ItemIcon from './ItemIcon';

// Define locally since we removed it from the hook
export type AnalysisFilter = string;

interface OpportunityBoardProps {
  dumps: MarketOpportunity[];
  bestFlips: MarketOpportunity[];
  onTrackItem: (item: Item) => void;
  filter: AnalysisFilter;
}

const OpportunityBoard = ({ dumps, bestFlips, onTrackItem, filter }: OpportunityBoardProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 animate-in fade-in duration-500">
      
      {/* CRASH WATCH / DUMPS */}
      <Card className="bg-rose-950/10 border-rose-900/50 backdrop-blur-sm">
        <CardHeader className="pb-3 border-b border-rose-900/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-rose-400 flex items-center gap-2 text-lg">
                <ArrowDown className="h-5 w-5 animate-bounce" /> 
                Crash Watch
            </CardTitle>
            <div className="flex items-center gap-2">
                 <Badge variant="outline" className="border-rose-800 text-rose-500 hidden sm:inline-flex">
                    Price vs 24h Avg
                </Badge>
                <Link to={`/scanner?type=crash&filter=${filter}`}>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-900/40">
                        View All <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-rose-900/30">
            {dumps.map((opp) => (
              <div key={opp.item.id} className="flex items-center justify-between p-3 hover:bg-rose-900/20 transition-colors group">
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                  <ItemIcon item={opp.item} size="md" className="shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <Link to={`/item/${opp.item.id}`} className="font-bold text-slate-200 truncate hover:text-emerald-400 transition-colors block">
                            {opp.item.name}
                        </Link>
                        {opp.item.limit && (
                            <span className="text-[10px] text-slate-500 border border-slate-700 rounded px-1">
                                Lim: {opp.item.limit}
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-rose-400 flex items-center gap-2">
                        <span>Current: {formatGP(opp.price.low)}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-emerald-400/80">Est. Profit: {formatGP(opp.secondaryMetric)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right mr-4 shrink-0">
                  <div className="font-bold text-rose-500 text-lg">-{opp.metric.toFixed(1)}%</div>
                  <div className="text-[10px] text-slate-500 uppercase">Drop</div>
                </div>

                <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 shrink-0"
                    onClick={() => onTrackItem(opp.item)}
                >
                    <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {dumps.length === 0 && (
                <div className="p-8 flex flex-col items-center justify-center text-slate-500 text-center">
                    <AlertCircle className="mb-2 h-8 w-8 opacity-20" />
                    <p>No high-confidence crashes detected.</p>
                    <p className="text-xs mt-1 text-slate-600">Checking liquidity & profit thresholds...</p>
                </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* BEST FLIPS */}
      <Card className="bg-emerald-950/10 border-emerald-900/50 backdrop-blur-sm">
        <CardHeader className="pb-3 border-b border-emerald-900/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-emerald-400 flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" /> 
                Top Opportunities
            </CardTitle>
            <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-emerald-800 text-emerald-500 hidden sm:inline-flex">
                    High Score
                </Badge>
                 <Link to={`/scanner?type=flip&filter=${filter}`}>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/40">
                        View All <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-emerald-900/30">
            {bestFlips.map((opp) => (
              <div key={opp.item.id} className="flex items-center justify-between p-3 hover:bg-emerald-900/20 transition-colors group">
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                  <ItemIcon item={opp.item} size="md" className="shrink-0" />
                  <div className="min-w-0">
                    <Link to={`/item/${opp.item.id}`} className="font-bold text-slate-200 truncate hover:text-emerald-400 transition-colors block">
                        {opp.item.name}
                    </Link>
                    <div className="text-xs text-emerald-400/80 flex items-center gap-2">
                        <span>Buy: {formatGP(opp.price.low)}</span>
                        <span className="text-slate-500">•</span>
                        <span>ROI: {opp.secondaryMetric.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right mr-4 shrink-0">
                  <div className="font-bold text-emerald-400 text-lg">+{formatGP(opp.metric)}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Profit/Item</div>
                </div>

                <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 shrink-0"
                    onClick={() => onTrackItem(opp.item)}
                >
                    <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
             {bestFlips.length === 0 && (
                <div className="p-8 text-center text-slate-500">Scanning market data...</div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default OpportunityBoard;