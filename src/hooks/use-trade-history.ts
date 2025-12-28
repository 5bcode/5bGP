import { useState, useEffect, useCallback } from 'react';
import { useTradeMode } from '@/context/TradeModeContext';
import { Trade } from '@/components/TradeLogDialog';

export function useTradeHistory() {
  const { mode } = useTradeMode();
  const STORAGE_KEY = mode === 'live' ? 'tradeHistory' : 'paperTradeHistory';
  
  const [trades, setTrades] = useState<Trade[]>([]);

  // Load trades when mode changes
  useEffect(() => {
    const load = () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setTrades(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse trade history", e);
          setTrades([]);
        }
      } else {
        setTrades([]);
      }
    };
    
    load();
    
    // Listen for cross-tab updates or local updates
    window.addEventListener('storage', load);
    window.addEventListener('trade-history-update', load);
    
    return () => {
      window.removeEventListener('storage', load);
      window.removeEventListener('trade-history-update', load);
    };
  }, [STORAGE_KEY, mode]);

  const saveTrade = useCallback((trade: Trade) => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const history = saved ? JSON.parse(saved) : [];
    const newHistory = [trade, ...history];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    
    // Dispatch event to update other components using this hook
    window.dispatchEvent(new Event('trade-history-update'));
    setTrades(newHistory);
  }, [STORAGE_KEY]);

  const deleteTrade = useCallback((id: string) => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const history = JSON.parse(saved);
      const newHistory = history.filter((t: Trade) => t.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      
      window.dispatchEvent(new Event('trade-history-update'));
      setTrades(newHistory);
    }
  }, [STORAGE_KEY]);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('trade-history-update'));
    setTrades([]);
  }, [STORAGE_KEY]);

  return {
    trades,
    saveTrade,
    deleteTrade,
    clearHistory,
    mode
  };
}