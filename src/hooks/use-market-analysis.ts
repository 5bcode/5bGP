import { useMemo } from 'react';
import { Item, PriceData, Stats24h } from '@/services/osrs-api';
import { calculateMargin, calculateDumpScore, calculateOpportunityScore, calculateVolatility } from '@/lib/osrs-math';

export interface MarketOpportunity {
  item: Item;
  price: PriceData;
  stats: Stats24h;
  score: number;
  label: string;
  metric: number; // The primary metric for the category (e.g. drop %, profit)
}

export function useMarketAnalysis(
  items: Item[],
  prices: Record<string, PriceData>,
  stats: Record<string, Stats24h>
) {
  return useMemo(() => {
    if (!items.length || Object.keys(prices).length === 0) {
      return { dumps: [], bestFlips: [], highVol: [] };
    }

    const dumps: MarketOpportunity[] = [];
    const bestFlips: MarketOpportunity[] = [];
    const highVol: MarketOpportunity[] = [];

    // Filter for tradeable items only to speed up processing
    // We assume if it has a price, it's tradeable.
    
    items.forEach(item => {
      const price = prices[item.id];
      const stat = stats[item.id];

      // Must have data
      if (!price || !stat || !price.low || !price.high || !stat.avgLowPrice) return;

      // 1. Detect Dumps
      // Criteria: Price is > 5% below 24h avg, and item has decent volume (>1000 daily or >1m value)
      const dumpScore = calculateDumpScore(price.low, stat.avgLowPrice);
      const totalVol = stat.highPriceVolume + stat.lowPriceVolume;
      
      if (dumpScore > 5 && (totalVol > 500 || price.low > 1_000_000)) {
        dumps.push({
          item,
          price,
          stats: stat,
          score: dumpScore,
          label: 'Crash',
          metric: dumpScore // % drop
        });
      }

      // 2. Best Flips (Stable Money)
      // Criteria: Good ROI, Good Volume
      const { net, roi } = calculateMargin(price.low, price.high);
      const volatility = calculateVolatility(price.high, price.low);
      const oppScore = calculateOpportunityScore(net, roi, totalVol, volatility);

      if (net > 0 && totalVol > 100 && roi > 1) {
        bestFlips.push({
          item,
          price,
          stats: stat,
          score: oppScore,
          label: 'Flip',
          metric: net // Expected profit per item
        });
      }
    });

    // Sort and slice
    dumps.sort((a, b) => b.score - a.score);
    bestFlips.sort((a, b) => b.score - a.score);
    
    return {
      dumps: dumps.slice(0, 8),
      bestFlips: bestFlips.slice(0, 8),
    };
  }, [items, prices, stats]);
}