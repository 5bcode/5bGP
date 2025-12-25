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
    const now = Math.floor(Date.now() / 1000);
    const RECENCY_THRESHOLD = 600; // 10 minutes in seconds

    // Tuning Constants
    const MIN_ROI_FLIP = 1; // 1%
    
    items.forEach(item => {
      const price = prices[item.id];
      const stat = stats[item.id];

      // Data validity check
      if (!price || !stat || !price.low || !price.high || !stat.avgLowPrice || price.low < 2) return;

      const dailyVol = stat.highPriceVolume + stat.lowPriceVolume;
      const limit = item.limit || 10000; // Default limit if unknown

      // --- FILTERING LOGIC ---
      if (filter === 'f2p' && item.members) return;
      if (filter === 'high_volume' && dailyVol < 100000) return; 
      if (filter === 'high_ticket' && price.low < 5_000_000) return; 

      // --- 1. SMART DUMP / CRASH DETECTION ---
      // Critical Check: The LOW price must be recent (live crash)
      const isLowFresh = (now - price.lowTime) <= RECENCY_THRESHOLD;

      const minVolDump = price.low > 50_000_000 ? 5 : (price.low > 1_000_000 ? 50 : 2000);

      if (isLowFresh && dailyVol >= minVolDump) {
          const dropFromAvg = calculateDumpScore(price.low, stat.avgLowPrice); 
          
          // Spread % - Is the gap wide?
          const spreadPercent = ((price.high - price.low) / price.low) * 100;

          // Detect meaningful crashes:
          // 1. Price is down > 3% from average
          // 2. Spread is > 2% (indicates uncertainty/panic, or just huge margin)
          // 3. Not a dead item
          
          if (dropFromAvg > 3 && spreadPercent > 2) {
              // Conservative Profit: Sell at current HIGH (Insta-sell usually works if volume is high)
              // Optimistic Profit: Sell at 24h Avg
              
              // We use a weighted target: 70% current High, 30% 24h Avg
              const targetSell = (price.high * 0.7) + (stat.avgLowPrice * 0.3);
              const margin = calculateMargin(price.low, targetSell);
              
              const potentialTotalProfit = margin.net * Math.min(limit, 100); // Cap quantity for realistic score
              
              // Alch Safety Net
              const isBelowAlch = item.highalch ? price.low < (item.highalch - 200) : false; // -200 for nat rune cost buffer
              
              // Score Calculation
              // Base: Drop Magnitude
              // Bonus: Profit Potential (Log scale)
              // Bonus: Safety (Below Alch)
              // Penalty: Low Volume (Risk of stuck)
              
              let score = dropFromAvg * 2;
              score += Math.log10(potentialTotalProfit) * 5;
              if (isBelowAlch) score += 50; // Huge bonus for safe floors
              if (margin.roi > 30) score += 10; // Bonus for insane ROIs

              // Filter noise: Must have > 50k potential profit per limit batch or be an alch play
              if (potentialTotalProfit > 50_000 || (isBelowAlch && potentialTotalProfit > 10000)) {
                   dumps.push({
                      item,
                      price,
                      stats: stat,
                      score,
                      label: isBelowAlch ? 'Safe Crash' : 'Panic Wick',
                      metric: dropFromAvg,
                      secondaryMetric: potentialTotalProfit * (limit / Math.min(limit, 100)) // Extrapolate full limit profit for display
                  });
              }
          }
      }

      // --- 2. BEST FLIPS (Steady State) ---
      // Check: At least one side of the trade must be recent to be considered "active"
      const isActive = (now - Math.max(price.highTime, price.lowTime)) <= RECENCY_THRESHOLD;
      
      const minVolFlip = price.low > 10_000_000 ? 10 : 500;

      if (isActive && dailyVol > minVolFlip) {
          const { net, roi } = calculateMargin(price.low, price.high);
          const volatility = calculateVolatility(price.high, price.low);
          
          // Filter: Must be profitable and have decent volume
          if (net > 0 && roi > MIN_ROI_FLIP) {
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

    // Sort descending by score
    dumps.sort((a, b) => b.score - a.score);
    bestFlips.sort((a, b) => b.score - a.score);
    
    return {
      dumps,
      bestFlips,
    };
  }, [items, prices, stats, filter]);
}