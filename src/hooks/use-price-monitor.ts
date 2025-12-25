import { useEffect, useRef, useCallback } from 'react';
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
  
  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
  }, []);

  const sendNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
        // Don't spam notifications if tab is focused (optional, but good UX)
        if (document.visibilityState === 'hidden') {
            new Notification(title, {
                body,
                icon: '/favicon.ico', // Assuming there's a favicon
                tag: 'price-alert' // Grouping
            });
        }
    }
  }, []);

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
        const cooldown = 300000; // 5 minutes
        
        if (now - lastTime > cooldown) { 
            
            const alert: MarketAlert = {
                id: crypto.randomUUID(),
                itemId: item.id,
                itemName: item.name,
                timestamp: now,
                dropPercent: drop * 100,
                price: price.low
            };

            const msg = `Panic Wick: ${item.name}`;
            const desc = `-${(drop * 100).toFixed(1)}% drop detected!`;

            // App Toast
            toast.error(msg, {
                description: desc,
                duration: 5000,
            });

            // Native Notification
            sendNotification(msg, desc);

            onAlert(alert);
            lastAlerted.current.set(item.id.toString(), now);
        }
      }
    });
  }, [prices, stats, trackedItems, thresholdPercent, onAlert, sendNotification]);
}