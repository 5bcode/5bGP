import { useMemo } from 'react';
import { Item, PriceData, Stats24h } from '@/services/osrs-api';
import { calculateMargin, calculateDumpScore, calculateOpportunityScore, calculateVolatility } from '@/lib/osrs-math';

export interface MarketOpportunity {
  item: Item;
  price: PriceData;
  stats: Stats24h;
  score: number;
  label: string;
  metric: number; // Primary metric (Drop % for Dumps, Profit per item for Flips)
  secondaryMetric: number; // Total Potential Profit (for Dumps) or ROI (for Flips)
}

export type AnalysisFilter = 'all' | 'f2p' | 'high_volume' | 'high_ticket';

export function useMarketAnalysis(
  items: Item[],
  prices: Record<string, PriceData>,
  stats: Record<string, Stats24h>,
  filter: AnalysisFilter = 'all'
) {
  return useMemo(() => {
    if (!items.length || Object.keys(prices).length === 0) {
      return { dumps: [], bestFlips: [] };
    }

    const dumps: MarketOpportunity[] = [];
    const bestFlips: MarketOpportunity[] = [];

    // Constants for tuning
    const MIN_ROI_FLIP = 1; // 1%
    const MIN_PROFIT_DUMP = 50_000; // Minimum 50k potential profit to show a dump
    
    items.forEach(item => {
      const price = prices[item.id];
      const stat = stats[item.id];

      // Data validity check
      if (!price || !stat || !price.low || !price.high || !stat.avgLowPrice) return;

      const dailyVol = stat.highPriceVolume + stat.lowPriceVolume;
      const limit = item.limit || 1000;

      // --- FILTERING LOGIC ---
      if (filter === 'f2p' && item.members) return;
      if (filter === 'high_volume' && dailyVol < 50000) return; // Strict high volume
      if (filter === 'high_ticket' && price.low < 10_000_000) return; // Min 10m

      // --- 1. SMART DUMP DETECTION ---
      const minVol = price.low > 100_000_000 ? 5 : (price.low > 1_000_000 ? 50 : 2000);
      
      if (dailyVol >= minVol) {
          const dropPercent = calculateDumpScore(price.low, stat.avgLowPrice); 
          
          if (dropPercent > 3) {
              const reboundMargin = calculateMargin(price.low, stat.avgLowPrice);
              const maxQuantity = limit; 
              const potentialTotalProfit = reboundMargin.net * maxQuantity;
              
              if (potentialTotalProfit > MIN_PROFIT_DUMP && reboundMargin.roi > 3) {
                  const profitScore = Math.log10(potentialTotalProfit);
                  const score = (dropPercent * 2) + (profitScore * 5);

                  dumps.push({
                      item,
                      price,
                      stats: stat,
                      score,
                      label: 'Crash',
                      metric: dropPercent,
                      secondaryMetric: potentialTotalProfit
                  });
              }
          }
      }

      // --- 2. BEST FLIPS (Steady State) ---
      const { net, roi } = calculateMargin(price.low, price.high);
      const volatility = calculateVolatility(price.high, price.low);
      
      if (dailyVol > minVol && net > 0 && roi > MIN_ROI_FLIP) {
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
    });

    // Sort descending by score
    dumps.sort((a, b) => b.score - a.score);
    bestFlips.sort((a, b) => b.score - a.score);
    
    return {
      dumps: dumps.slice(0, 8),
      bestFlips: bestFlips.slice(0, 8),
    };
  }, [items, prices, stats, filter]);
}