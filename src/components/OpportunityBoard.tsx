import React from 'react';
import { MarketOpportunity } from '@/hooks/use-market-analysis';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatGP } from "@/lib/osrs-math";
import { ArrowDown, TrendingUp, DollarSign, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Item } from "@/services/osrs-api";

interface OpportunityBoardProps {
  dumps: MarketOpportunity[];
  bestFlips: MarketOpportunity[];
  onTrackItem: (item: Item) => void;
}

const OpportunityBoard = ({ dumps, bestFlips, onTrackItem }: OpportunityBoardProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 animate-in fade-in duration-500">
      
      {/* CRASH WATCH / DUMPS */}
      <Card className="bg-rose-950/10 border-rose-900/50 backdrop-blur-sm">
        <CardHeader className="pb-3 border-b border-rose-900/30">
          <CardTitle className="text-rose-400 flex items-center gap-2 text-lg">
            <ArrowDown className="h-5 w-5 animate-bounce" /> 
            Crash Watch
            <Badge variant="outline" className="border-rose-800 text-rose-500 ml-auto">
                Price vs 24h Avg
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-rose-900/30">
            {dumps.map((opp) => (
              <div key={opp.item.id} className="flex items-center justify-between p-3 hover:bg-rose-900/20 transition-colors group">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="font-bold text-slate-200 truncate">{opp.item.name}</div>
                  <div className="text-xs text-rose-400 flex items-center gap-2">
                     <span>Current: {formatGP(opp.price.low)}</span>
                     <span className="text-slate-500">•</span>
                     <span>Avg: {formatGP(opp.stats.avgLowPrice)}</span>
                  </div>
                </div>
                
                <div className="text-right mr-4">
                  <div className="font-bold text-rose-500 text-lg">-{opp.metric.toFixed(1)}%</div>
                  <div className="text-[10px] text-slate-500 uppercase">Drop</div>
                </div>

                <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                    onClick={() => onTrackItem(opp.item)}
                >
                    <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {dumps.length === 0 && (
                <div className="p-4 text-center text-slate-500 text-sm">No significant dumps detected.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* BEST FLIPS */}
      <Card className="bg-emerald-950/10 border-emerald-900/50 backdrop-blur-sm">
        <CardHeader className="pb-3 border-b border-emerald-900/30">
          <CardTitle className="text-emerald-400 flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" /> 
            Top Opportunities
            <Badge variant="outline" className="border-emerald-800 text-emerald-500 ml-auto">
                High Score
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-emerald-900/30">
            {bestFlips.map((opp) => (
              <div key={opp.item.id} className="flex items-center justify-between p-3 hover:bg-emerald-900/20 transition-colors group">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="font-bold text-slate-200 truncate">{opp.item.name}</div>
                  <div className="text-xs text-emerald-400/80 flex items-center gap-2">
                     <span>Buy: {formatGP(opp.price.low)}</span>
                     <span className="text-slate-500">•</span>
                     <span>Vol: {formatGP(opp.stats.highPriceVolume + opp.stats.lowPriceVolume)}</span>
                  </div>
                </div>
                
                <div className="text-right mr-4">
                  <div className="font-bold text-emerald-400 text-lg">+{formatGP(opp.metric)}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Exp. Profit</div>
                </div>

                <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                    onClick={() => onTrackItem(opp.item)}
                >
                    <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
             {bestFlips.length === 0 && (
                <div className="p-4 text-center text-slate-500 text-sm">Analyzing market data...</div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default OpportunityBoard;