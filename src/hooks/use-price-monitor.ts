import { useEffect, useRef, useCallback } from 'react';
import { PriceData, Stats24h, Item } from '@/services/osrs-api';
import { toast } from 'sonner';
import { MarketAlert } from '@/components/LiveFeed';

export function usePriceMonitor(
  prices: Record<string, PriceData>,
  stats: Record<string, Stats24h>,
  trackedItems: Item[],
  thresholdPercent: number,
  soundEnabled: boolean,
  onAlert: (alert: MarketAlert) => void
) {
  const lastAlerted = useRef<Map<string, number>>(new Map()); // ItemID -> Timestamp
  
  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
  }, []);

  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        // Nice "Ping" sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5); // Drop to A4

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

        osc.start();
        osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
        console.error("Audio play failed", e);
    }
  }, [soundEnabled]);

  const sendNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
        // Don't spam notifications if tab is focused (optional, but good UX)
        if (document.visibilityState === 'hidden') {
            new Notification(title, {
                body,
                icon: '/favicon.ico',
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
            
            // Sound
            playAlertSound();

            onAlert(alert);
            lastAlerted.current.set(item.id.toString(), now);
        }
      }
    });
  }, [prices, stats, trackedItems, thresholdPercent, soundEnabled, onAlert, sendNotification, playAlertSound]);
}