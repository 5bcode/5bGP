import { useEffect, useRef } from 'react';
import { PriceData, Stats24h, Item } from '@/services/osrs-api';
import { toast } from 'sonner';

const ALERT_THRESHOLD = 0.10; // 10% drop triggers alert

export function usePriceMonitor(
  prices: Record<string, PriceData>,
  stats: Record<string, Stats24h>,
  trackedItems: Item[]
) {
  const lastAlerted = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!prices || !stats || trackedItems.length === 0) return;

    trackedItems.forEach(item => {
      const price = prices[item.id];
      const stat = stats[item.id];
      
      if (!price || !stat || !price.low || !stat.avgLowPrice) return;

      const drop = (stat.avgLowPrice - price.low) / stat.avgLowPrice;
      
      // If drop is > 10% and we haven't alerted yet for this specific condition
      if (drop >= ALERT_THRESHOLD) {
        // Create a unique key for this alert state to avoid spamming
        // Reset key when price recovers? For now just limit frequency per session
        if (!lastAlerted.current.has(item.id.toString())) {
            
            toast.error(`Panic Wick Detected: ${item.name}`, {
                description: `Price dropped ${(drop * 100).toFixed(1)}% below 24h average! Current: ${price.low}`,
                duration: 10000,
            });

            lastAlerted.current.add(item.id.toString());
        }
      }
    });
  }, [prices, stats, trackedItems]);
}