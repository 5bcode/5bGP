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

export function useMarketAnalysis(
  items: Item[],
  prices: Record<string, PriceData>,
  stats: Record<string, Stats24h>
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
      const limit = item.limit || 1000; // Default limit if unknown, though most have it

      // --- 1. SMART DUMP DETECTION ---
      // Goal: Find items trading significantly below their 24h average that are actually profitable to flip.
      
      // A. Dynamic Volume Check
      // If item is > 100m, we only need ~5 trades/day.
      // If item is < 1k, we need > 2000 trades/day.
      const minVol = price.low > 100_000_000 ? 5 : (price.low > 1_000_000 ? 50 : 2000);
      
      if (dailyVol >= minVol) {
          const dropPercent = calculateDumpScore(price.low, stat.avgLowPrice); // basically % drop
          
          if (dropPercent > 3) { // > 3% drop
              // B. Profit Reality Check
              // Calculate potential profit if it rebounds to avgLowPrice
              // We assume we buy at current 'low', and sell at 'avgLowPrice'.
              const reboundMargin = calculateMargin(price.low, stat.avgLowPrice);
              
              // We can only profit on as many items as the limit (or the daily volume if it's lower)
              // Conservative cap: Math.min(limit, dailyVol / 4) -> Assuming we can only capture 25% of daily volume in 4 hours? 
              // Actually, simpler: Just use limit. If volume is low, the 'minVol' check above should handle it.
              const maxQuantity = limit; 
              const potentialTotalProfit = reboundMargin.net * maxQuantity;
              
              if (potentialTotalProfit > MIN_PROFIT_DUMP && reboundMargin.roi > 3) {
                  // Score boosts:
                  // 1. High Drop %
                  // 2. High Total Profit (Log scale)
                  // 3. High Volume
                  const profitScore = Math.log10(potentialTotalProfit); // 1m profit -> 6 points. 10m -> 7 points.
                  const score = (dropPercent * 2) + (profitScore * 5);

                  dumps.push({
                      item,
                      price,
                      stats: stat,
                      score,
                      label: 'Crash',
                      metric: dropPercent, // Display Drop %
                      secondaryMetric: potentialTotalProfit // Display Max Potential Profit
                  });
              }
          }
      }

      // --- 2. BEST FLIPS (Steady State) ---
      // A. Standard flip check
      const { net, roi } = calculateMargin(price.low, price.high);
      const volatility = calculateVolatility(price.high, price.low);
      
      // Dynamic volume for flips too
      if (dailyVol > minVol && net > 0 && roi > MIN_ROI_FLIP) {
          const oppScore = calculateOpportunityScore(net, roi, dailyVol, volatility);
          
          bestFlips.push({
            item,
            price,
            stats: stat,
            score: oppScore,
            label: 'Flip',
            metric: net, // Display Profit Per Item
            secondaryMetric: roi // Display ROI
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
  }, [items, prices, stats]);
}