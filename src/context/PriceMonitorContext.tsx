import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { MarketAlert } from '@/components/LiveFeed';
import { useSettings } from '@/context/SettingsContext';
import { useWatchlist } from '@/hooks/use-watchlist';
import { useMarketData } from '@/hooks/use-osrs-query';
import { toast } from 'sonner';
import { formatGP } from '@/lib/osrs-math';
import { Item } from '@/services/osrs-api';

interface PriceMonitorContextType {
  alerts: MarketAlert[];
  clearAlerts: () => void;
  removeAlert: (id: string) => void;
  testSystem: () => void;
}

const PriceMonitorContext = createContext<PriceMonitorContextType | undefined>(undefined);

export const PriceMonitorProvider = ({ children }: { children: React.ReactNode }) => {
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  const { settings } = useSettings();
  const { items, prices, stats } = useMarketData(settings.refreshInterval * 1000); // Polling handled here
  const { watchlist } = useWatchlist(items); // Assuming items are loaded

  // Ref to track last alert times to prevent spam
  const lastAlerted = React.useRef<Map<string, number>>(new Map());

  const addAlert = useCallback((alert: MarketAlert) => {
    setAlerts(prev => [alert, ...prev].slice(0, 50));
  }, []);

  const clearAlerts = useCallback(() => setAlerts([]), []);

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  // Audio Playback
  const playAlertSound = useCallback(() => {
    if (!settings.soundEnabled) return;
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

      setTimeout(() => {
        if (ctx.state !== 'closed') ctx.close().catch(console.error);
      }, 600);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  }, [settings.soundEnabled]);

  // Discord Webhook
  const sendDiscordAlert = useCallback(async (item: Item, dropPercent: number, price: number) => {
    const url = settings.discordWebhookUrl;
    if (!url) return;
    if (!url.startsWith('https://discord.com/api/webhooks/') && !url.startsWith('https://discordapp.com/api/webhooks/')) return;

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: "FlipTo5B Bot",
          embeds: [{
            title: `🚨 Panic Wick: ${item.name}`,
            color: 0xe11d48,
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
  }, [settings.discordWebhookUrl]);

  // Monitoring Logic
  useEffect(() => {
    if (!prices || !stats || watchlist.length === 0) return;

    watchlist.forEach(item => {
      const price = prices[item.id];
      const stat = stats[item.id];

      if (!price || !stat || !price.low || !stat.avgLowPrice) return;

      const drop = (stat.avgLowPrice - price.low) / stat.avgLowPrice;
      const threshold = settings.alertThreshold / 100;

      if (drop >= threshold) {
        const now = Date.now();
        const lastTime = lastAlerted.current.get(item.id.toString()) || 0;
        const cooldown = 300000; // 5 minutes

        if (now - lastTime > cooldown) {
          const alertData: MarketAlert = {
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
          playAlertSound();
          sendDiscordAlert(item, drop * 100, price.low);

          addAlert(alertData);
          lastAlerted.current.set(item.id.toString(), now);
        }
      }
    });
  }, [prices, stats, watchlist, settings.alertThreshold, playAlertSound, sendDiscordAlert, addAlert]);

  // Debug / Test Function
  const testSystem = useCallback(() => {
    const mockItem: Item = { id: 2, name: 'Cannonball', members: false, examine: "Balls of steel.", value: 160, highalch: 158, limit: 7000, icon: '', lowalch: 100 };
    const mockDrop = 0.15; // 15%
    const mockPrice = 145;

    const alertData: MarketAlert = {
      id: crypto.randomUUID(),
      itemId: mockItem.id,
      itemName: mockItem.name,
      timestamp: Date.now(),
      dropPercent: mockDrop * 100,
      price: mockPrice
    };

    toast.error('Test Alert: Cannonball', { description: '-15% Drop Detected (Simulation)' });
    playAlertSound();
    addAlert(alertData);

    // We don't spam discord on test to avoid angering the API gods, or we can:
    // sendDiscordAlert(mockItem, 15, 145);
  }, [addAlert, playAlertSound]);

  return (
    <PriceMonitorContext.Provider value={{ alerts, clearAlerts, removeAlert, testSystem }}>
      {children}
    </PriceMonitorContext.Provider>
  );
};

export const usePriceMonitorContext = () => {
  const context = useContext(PriceMonitorContext);
  if (context === undefined) {
    throw new Error('usePriceMonitorContext must be used within a PriceMonitorProvider');
  }
  return context;
};