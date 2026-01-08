import { useMemo } from 'react';
import { Item, PriceData, Stats24h } from '@/services/osrs-api';
import { calculateMargin, calculateDumpScore, calculateOpportunityScore, calculateVolatility } from '@/lib/osrs-math';
import { Strategy } from '@/hooks/use-strategies';

export interface MarketOpportunity {
  item: Item;
  price: PriceData;
  stats: Stats24h;
  score: number;
  label: string;
  metric: number; // Primary metric (Drop % for Dumps, Profit per item for Flips)
  secondaryMetric: number; // Total Potential Profit (for Dumps) or ROI (for Flips)
}

// Default filter if string is passed
export const DEFAULT_STRATEGY: Strategy = {
    id: 'default',
    name: 'All',
    minPrice: 0,
    maxPrice: 2147483647,
    minVolume: 0,
    minRoi: 0
};

export function useMarketAnalysis(
  items: Item[],
  prices: Record<string, PriceData>,
  stats: Record<string, Stats24h>,
  strategy: Strategy = DEFAULT_STRATEGY
) {
  return useMemo(() => {
    if (!items.length || Object.keys(prices).length === 0) {
      return { dumps: [], bestFlips: [] };
    }

    const dumps: MarketOpportunity[] = [];
    const bestFlips: MarketOpportunity[] = [];
    const now = Math.floor(Date.now() / 1000);
    const RECENCY_THRESHOLD = 600; // 10 minutes in seconds

    items.forEach(item => {
      const price = prices[item.id];
      const stat = stats[item.id];

      // Data validity check
      if (!price || !stat || !price.low || !price.high || !stat.avgLowPrice || price.low < 2) return;

      const dailyVol = stat.highPriceVolume + stat.lowPriceVolume;
      const limit = item.limit || 10000;

      // --- STRATEGY FILTERING ---
      if (price.low < strategy.minPrice || price.low > strategy.maxPrice) return;
      if (dailyVol < strategy.minVolume) return;

      // --- 1. SMART DUMP / CRASH DETECTION ---
      const isLowFresh = (now - price.lowTime) <= RECENCY_THRESHOLD;
      const minVolDump = Math.max(strategy.minVolume, 2000); // Enforce a baseline for dumps regardless of strategy

      if (isLowFresh && dailyVol >= minVolDump) {
          const dropFromAvg = calculateDumpScore(price.low, stat.avgLowPrice); 
          const spreadPercent = ((price.high - price.low) / price.low) * 100;
          
          if (dropFromAvg > 3 && spreadPercent > 2) {
              const targetSell = (price.high * 0.7) + (stat.avgLowPrice * 0.3);
              const margin = calculateMargin(price.low, targetSell);
              const potentialTotalProfit = margin.net * Math.min(limit, 100); 
              const isBelowAlch = item.highalch ? price.low < (item.highalch - 200) : false; 
              
              let score = dropFromAvg * 2;
              score += Math.log10(potentialTotalProfit) * 5;
              if (isBelowAlch) score += 50; 
              if (margin.roi > 30) score += 10; 

              if (potentialTotalProfit > 50_000 || (isBelowAlch && potentialTotalProfit > 10000)) {
                   dumps.push({
                      item,
                      price,
                      stats: stat,
                      score,
                      label: isBelowAlch ? 'Safe Crash' : 'Panic Wick',
                      metric: dropFromAvg,
                      secondaryMetric: potentialTotalProfit * (limit / Math.min(limit, 100))
                  });
              }
          }
      }

      // --- 2. BEST FLIPS (Steady State) ---
      const isActive = (now - Math.max(price.highTime, price.lowTime)) <= RECENCY_THRESHOLD;
      
      if (isActive && dailyVol > strategy.minVolume) {
          const { net, roi } = calculateMargin(price.low, price.high);
          const volatility = calculateVolatility(price.high, price.low);
          
          // ROI Check from Strategy
          if (net > 0 && roi > strategy.minRoi) {
              const oppScore = calculateOpportunityScore(net, roi, dailyVol, volatility);
              
              bestFlips.push({
                item,
                price,
                stats: stat,
                score: oppScore,
                label: 'Flip',
                metric: net,
                secondaryMetric: roi
              });
          }
      }
    });

    dumps.sort((a, b) => b.score - a.score);
    bestFlips.sort((a, b) => b.score - a.score);
    
    return {
      dumps,
      bestFlips,
    };
  }, [items, prices, stats, strategy]);
}