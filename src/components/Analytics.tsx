import React from 'react';
import { Trade } from './TradeLogDialog';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatGP } from "@/lib/osrs-math";
import { TrendingUp, TrendingDown, Coins, Activity } from "lucide-react";

interface AnalyticsProps {
  trades: Trade[];
}

const Analytics = ({ trades }: AnalyticsProps) => {
  const totalProfit = trades.reduce((acc, t) => acc + t.profit, 0);
  const tradeCount = trades.length;
  
  // Best trade
  const bestTrade = trades.length > 0 
    ? trades.reduce((prev, current) => (prev.profit > current.profit) ? prev : current)
    : null;

  // Win rate
  const winningTrades = trades.filter(t => t.profit > 0).length;
  const winRate = tradeCount > 0 ? (winningTrades / tradeCount) * 100 : 0;

  // Total Volume Traded (Gross revenue)
  const totalVolume = trades.reduce((acc, t) => acc + (t.sellPrice * t.quantity), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total Profit */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-400">Total Profit</CardTitle>
          <Coins className={`h-4 w-4 ${totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold font-mono ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalProfit >= 0 ? '+' : ''}{formatGP(totalProfit)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Net after tax
          </p>
        </CardContent>
      </Card>

      {/* Trade Count & Win Rate */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-400">Performance</CardTitle>
          <Activity className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-200">
            {tradeCount} <span className="text-sm font-normal text-slate-500">trades</span>
          </div>
          <p className={`text-xs mt-1 ${winRate >= 50 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {winRate.toFixed(1)}% Win Rate
          </p>
        </CardContent>
      </Card>

      {/* Best Flip */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-400">Best Flip</CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          {bestTrade ? (
            <>
              <div className="text-lg font-bold text-slate-200 truncate" title={bestTrade.itemName}>
                {bestTrade.itemName}
              </div>
              <p className="text-xs text-emerald-400 font-mono mt-1">
                +{formatGP(bestTrade.profit)}
              </p>
            </>
          ) : (
            <div className="text-lg font-bold text-slate-600">--</div>
          )}
        </CardContent>
      </Card>

      {/* Gross Volume */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-400">Gross Vol</CardTitle>
          <TrendingDown className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-200 font-mono">
            {formatGP(totalVolume)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Total GP moved
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;