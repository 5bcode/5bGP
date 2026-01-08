import React, { createContext, useState, useCallback, useEffect } from 'react';
import { MarketAlert } from '@/components/LiveFeed';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/context/SettingsContext';
import { useWatchlist } from '@/hooks/use-watchlist';
import { useMarketData } from '@/hooks/use-osrs-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PriceMonitorContextType {
  alerts: MarketAlert[];
  clearAlerts: () => void;
  removeAlert: (id: string) => void;
  testSystem: () => void;
}

export const PriceMonitorContext = createContext<PriceMonitorContextType | undefined>(undefined);

export const PriceMonitorProvider = ({ children }: { children: React.ReactNode }) => {
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  const { settings } = useSettings();
  const { items, prices, stats } = useMarketData(settings.refreshInterval * 1000);
  const { watchlist } = useWatchlist(items);
  const navigate = useNavigate();

  const lastAlerted = React.useRef<Map<string, number>>(new Map());

  const addAlert = useCallback((alert: MarketAlert) => {
    setAlerts(prev => [alert, ...prev].slice(0, 50));
  }, []);

  const clearAlerts = useCallback(() => setAlerts([]), []);
  const removeAlert = useCallback((id: string) => setAlerts(prev => prev.filter(a => a.id !== id)), []);

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
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
      setTimeout(() => { if (ctx.state !== 'closed') ctx.close().catch(() => {}); }, 600);
    } catch (e) { console.error("Audio failed", e); }
  }, [settings.soundEnabled]);

  const sendDiscordAlert = useCallback(async (itemName: string, dropPercent: number, price: number, itemId: number) => {
    // Only attempt if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      await supabase.functions.invoke('notify-discord', {
        body: { itemName, dropPercent, price, itemId }
      });
    } catch (e) {
      console.error("Cloud notification failed", e);
    }
  }, []);

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
        
        if (now - lastTime > 300000) { // 5m cooldown
          const alertData: MarketAlert = {
            id: crypto.randomUUID(),
            itemId: item.id,
            itemName: item.name,
            timestamp: now,
            dropPercent: drop * 100,
            price: price.low
          };

          toast.error(`Panic Wick: ${item.name}`, {
            description: `-${(drop * 100).toFixed(1)}% drop detected!`,
            action: { label: 'View', onClick: () => navigate(`/item/${item.id}`) }
          });
          
          playAlertSound();
          sendDiscordAlert(item.name, drop * 100, price.low, item.id);
          addAlert(alertData);
          lastAlerted.current.set(item.id.toString(), now);
        }
      }
    });
  }, [prices, stats, watchlist, settings.alertThreshold, playAlertSound, sendDiscordAlert, addAlert, navigate]);

  const testSystem = useCallback(() => {
    const alertData: MarketAlert = {
      id: crypto.randomUUID(),
      itemId: 2,
      itemName: 'Cannonball (Test)',
      timestamp: Date.now(),
      dropPercent: 15,
      price: 145
    };
    toast.info('Diagnostic: Alert Triggered');
    playAlertSound();
    sendDiscordAlert('Cannonball (Diagnostic)', 15, 145, 2);
    addAlert(alertData);
  }, [addAlert, playAlertSound, sendDiscordAlert]);

  return (
    <PriceMonitorContext.Provider value={{ alerts, clearAlerts, removeAlert, testSystem }}>
      {children}
    </PriceMonitorContext.Provider>
  );
};