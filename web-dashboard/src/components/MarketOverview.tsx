import React, { useMemo } from 'react';
import { Item, PriceData, Stats24h } from '@/services/osrs-api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatGP } from '@/lib/osrs-math';
import { TrendingUp, TrendingDown, BarChart3, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import ItemIcon from './ItemIcon';

interface MarketOverviewProps {
  items: Item[];
  prices: Record<string, PriceData>;
  stats: Record<string, Stats24h>;
}

const MarketOverview = ({ items, prices, stats }: MarketOverviewProps) => {
  const marketStats = useMemo(() => {
    if (items.length === 0 || Object.keys(prices).length === 0) return null;

    let upCount = 0;
    let downCount = 0;
    let totalVolume = 0;
    
    const movers: Array<{ item: Item, change: number, price: number }> = [];
    const volumeLeaders: Array<{ item: Item, volume: number, price: number }> = [];

    items.forEach(item => {
      const price = prices[item.id];
      const stat = stats[item.id];

      if (!price || !stat || !price.high || !stat.avgHighPrice) return;

      const currentPrice = (price.high + price.low) / 2;
      const avg24h = (stat.avgHighPrice + stat.avgLowPrice) / 2;
      
      if (avg24h > 0) {
          const change = ((currentPrice - avg24h) / avg24h) * 100;
          
          // Only count significant items for sentiment
          const volume = stat.highPriceVolume + stat.lowPriceVolume;
          if (volume > 10000 || price.high > 1000000) {
              if (change > 0) upCount++;
              else if (change < 0) downCount++;
          }

          if (volume > 50000) { // Filter low volume noise for movers
              movers.push({ item, change, price: currentPrice });
          }
          
          volumeLeaders.push({ item, volume, price: currentPrice });
          totalVolume += volume * currentPrice; // Approx total value traded
      }
    });

    // Sort lists
    movers.sort((a, b) => b.change - a.change);
    volumeLeaders.sort((a, b) => b.volume - a.volume);

    const gainers = movers.slice(0, 5);
    const losers = movers.slice(-5).reverse();
    const topVol = volumeLeaders.slice(0, 5);
    
    const sentiment = upCount > downCount ? 'Bullish' : 'Bearish';
    const sentimentScore = Math.round((upCount / (upCount + downCount)) * 100) || 50;

    return {
        sentiment,
        sentimentScore,
        gainers,
        losers,
        topVol,
        totalVolume,
        activeCount: upCount + downCount
    };
  }, [items, prices, stats]);

  if (!marketStats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* MARKET SENTIMENT CARD */}
      <Card className="bg-slate-900 border-slate-800 lg:col-span-1">
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Activity size={16} className={marketStats.sentiment === 'Bullish' ? "text-emerald-500" : "text-rose-500"} />
                Market Sentiment
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className={`text-2xl font-bold ${marketStats.sentiment === 'Bullish' ? "text-emerald-400" : "text-rose-500"}`}>
                {marketStats.sentiment}
            </div>
            <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden flex">
                <div 
                    className="bg-emerald-500 h-full transition-all duration-1000" 
                    style={{ width: `${marketStats.sentimentScore}%` }} 
                />
                <div 
                    className="bg-rose-500 h-full transition-all duration-1000" 
                    style={{ width: `${100 - marketStats.sentimentScore}%` }} 
                />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>{marketStats.sentimentScore}% Up</span>
                <span>{100 - marketStats.sentimentScore}% Down</span>
            </div>
            <p className="text-xs text-slate-500 mt-4">
                Based on {marketStats.activeCount} active items
            </p>
        </CardContent>
      </Card>

      {/* TOP MOVERS (GAINERS) */}
      <Card className="bg-slate-900 border-slate-800">
         <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-500" /> Top Gainers (24h)
            </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <div className="divide-y divide-slate-800/50">
                {marketStats.gainers.map((m) => (
                    <Link to={`/item/${m.item.id}`} key={m.item.id} className="flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-2 overflow-hidden">
                             <ItemIcon item={m.item} size="sm" />
                             <span className="text-xs font-medium text-slate-200 truncate">{m.item.name}</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-400">+{m.change.toFixed(1)}%</span>
                    </Link>
                ))}
            </div>
        </CardContent>
      </Card>

      {/* TOP MOVERS (LOSERS) */}
      <Card className="bg-slate-900 border-slate-800">
         <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <TrendingDown size={16} className="text-rose-500" /> Top Losers (24h)
            </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <div className="divide-y divide-slate-800/50">
                {marketStats.losers.map((m) => (
                    <Link to={`/item/${m.item.id}`} key={m.item.id} className="flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-2 overflow-hidden">
                             <ItemIcon item={m.item} size="sm" />
                             <span className="text-xs font-medium text-slate-200 truncate">{m.item.name}</span>
                        </div>
                        <span className="text-xs font-bold text-rose-500">{m.change.toFixed(1)}%</span>
                    </Link>
                ))}
            </div>
        </CardContent>
      </Card>

      {/* VOLUME LEADERS */}
      <Card className="bg-slate-900 border-slate-800">
         <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-500" /> High Volume
            </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <div className="divide-y divide-slate-800/50">
                {marketStats.topVol.map((m) => (
                    <Link to={`/item/${m.item.id}`} key={m.item.id} className="flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-2 overflow-hidden">
                             <ItemIcon item={m.item} size="sm" />
                             <span className="text-xs font-medium text-slate-200 truncate">{m.item.name}</span>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-mono text-slate-300">{formatGP(m.volume)}</div>
                        </div>
                    </Link>
                ))}
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketOverview;