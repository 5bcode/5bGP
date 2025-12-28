import { useEffect, useRef, useCallback } from 'react';
import { PriceData, Stats24h, Item } from '@/services/osrs-api';
import { toast } from 'sonner';
import { MarketAlert } from '@/components/LiveFeed';
import { formatGP } from '@/lib/osrs-math';

export function usePriceMonitor(
  prices: Record<string, PriceData>,
  stats: Record<string, Stats24h>,
  trackedItems: Item[],
  thresholdPercent: number,
  soundEnabled: boolean,
  discordWebhookUrl: string,
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
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5); 

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

        osc.start();
        osc.stop(ctx.currentTime + 0.5);

        // Security/Resource Fix: Close context to prevent exhaustion limit (usually ~32 max)
        setTimeout(() => {
            if (ctx.state !== 'closed') {
                ctx.close().catch(console.error);
            }
        }, 600);

    } catch (e) {
        console.error("Audio play failed", e);
    }
  }, [soundEnabled]);

  const sendDiscordAlert = useCallback(async (item: Item, dropPercent: number, price: number) => {
      if (!discordWebhookUrl) return;

      // Security Check: Ensure URL is a valid Discord webhook to prevent arbitrary POST requests
      if (!discordWebhookUrl.startsWith('https://discord.com/api/webhooks/') && !discordWebhookUrl.startsWith('https://discordapp.com/api/webhooks/')) {
          console.warn("Blocked attempt to send alert to invalid webhook URL");
          return;
      }

      try {
          await fetch(discordWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  username: "FlipTo5B Bot",
                  embeds: [{
                      title: `🚨 Panic Wick: ${item.name}`,
                      color: 0xe11d48, // Rose-600
                      fields: [
                          { name: "Drop", value: `-${dropPercent.toFixed(1)}%`, inline: true },
                          { name: "Price", value: formatGP(price), inline: true },
                          { name: "Link", value: `[Wiki](https://prices.runescape.wiki/osrs/item/${item.id})` }
                      ],
                      timestamp: new Date().toISOString()
                  }]
              })
          });
      } catch (e) {
          console.error("Discord webhook failed", e);
      }
  }, [discordWebhookUrl]);

  const sendNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
        if (document.visibilityState === 'hidden') {
            new Notification(title, {
                body,
                icon: '/favicon.ico',
                tag: 'price-alert'
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

            toast.error(msg, { description: desc, duration: 5000 });
            sendNotification(msg, desc);
            playAlertSound();
            sendDiscordAlert(item, drop * 100, price.low);

            onAlert(alert);
            lastAlerted.current.set(item.id.toString(), now);
        }
      }
    });
  }, [prices, stats, trackedItems, thresholdPercent, soundEnabled, discordWebhookUrl, onAlert, sendNotification, playAlertSound, sendDiscordAlert]);
}