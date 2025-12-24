import { useEffect, useRef } from 'react';
import { PriceData, Stats24h, Item } from '@/services/osrs-api';
import { toast } from 'sonner';
import { MarketAlert } from '@/components/LiveFeed';

export function usePriceMonitor(
  prices: Record<string, PriceData>,
  stats: Record<string, Stats24h>,
  trackedItems: Item[],
  thresholdPercent: number,
  onAlert: (alert: MarketAlert) => void
) {
  const lastAlerted = useRef<Map<string, number>>(new Map()); // ItemID -> Timestamp

  useEffect(() => {
    if (!prices || !stats || trackedItems.length === 0) return;

    trackedItems.forEach(item => {
      const price = prices[item.id];
      const stat = stats[item.id];
      
      if (!price || !stat || !price.low || !stat.avgLowPrice) return;

      const drop = (stat.avgLowPrice - price.low) / stat.avgLowPrice;
      const threshold = thresholdPercent / 100;

      // If drop is >= threshold
      if (drop >= threshold) {
        const now = Date.now();
        const lastTime = lastAlerted.current.get(item.id.toString()) || 0;
        
        // Don't alert if we alerted in the last 5 minutes for this item
        if (now - lastTime > 300000) { 
            
            const alert: MarketAlert = {
                id: crypto.randomUUID(),
                itemId: item.id,
                itemName: item.name,
                timestamp: now,
                dropPercent: drop * 100,
                price: price.low
            };

            toast.error(`Panic Wick: ${item.name}`, {
                description: `-${(drop * 100).toFixed(1)}% drop detected!`,
                duration: 5000,
            });

            onAlert(alert);
            lastAlerted.current.set(item.id.toString(), now);
        }
      }
    });
  }, [prices, stats, trackedItems, thresholdPercent, onAlert]);
}