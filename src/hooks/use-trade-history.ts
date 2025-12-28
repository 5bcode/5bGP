import { useState, useEffect, useCallback } from 'react';
import { useTradeMode } from '@/context/TradeModeContext';
import { Trade } from '@/components/TradeLogDialog';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useTradeHistory() {
  const { mode } = useTradeMode();
  const { user } = useAuth();
  const STORAGE_KEY = 'paperTradeHistory'; // Only for paper mode
  
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  // Load trades
  useEffect(() => {
    if (mode === 'paper') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setTrades(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse paper trade history", e);
                setTrades([]);
            }
        } else {
            setTrades([]);
        }
        setLoading(false);
    } else {
        // Live Mode - Supabase
        if (!user) {
            setTrades([]);
            setLoading(false);
            return;
        }

        const fetchTrades = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('trades')
                    .select('*')
                    .order('timestamp', { ascending: false });
                
                if (error) throw error;

                const mapped: Trade[] = (data || []).map(t => ({
                    id: t.id,
                    itemId: t.item_id,
                    itemName: t.item_name,
                    buyPrice: t.buy_price,
                    sellPrice: t.sell_price,
                    quantity: t.quantity,
                    profit: t.profit,
                    timestamp: Number(t.timestamp)
                }));
                
                setTrades(mapped);
            } catch (err) {
                console.error("Error loading trades:", err);
                toast.error("Failed to load trade history");
            } finally {
                setLoading(false);
            }
        };

        fetchTrades();
    }
  }, [mode, user]);

  const saveTrade = useCallback(async (trade: Trade) => {
    if (mode === 'paper') {
        const saved = localStorage.getItem(STORAGE_KEY);
        const history = saved ? JSON.parse(saved) : [];
        const newHistory = [trade, ...history];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
        setTrades(newHistory);
    } else {
        if (!user) {
            toast.error("You must be logged in to save live trades");
            return;
        }

        // Optimistic UI
        setTrades(prev => [trade, ...prev]);

        try {
            const { error } = await supabase.from('trades').insert({
                id: trade.id,
                user_id: user.id,
                item_id: trade.itemId,
                item_name: trade.itemName,
                buy_price: trade.buyPrice,
                sell_price: trade.sellPrice,
                quantity: trade.quantity,
                profit: trade.profit,
                timestamp: trade.timestamp
            });

            if (error) {
                throw error;
            }
        } catch (err: any) {
            console.error("Error saving trade:", err);
            toast.error("Failed to save trade to cloud");
            // Rollback
            setTrades(prev => prev.filter(t => t.id !== trade.id));
        }
    }
  }, [mode, user]);

  const deleteTrade = useCallback(async (id: string) => {
    if (mode === 'paper') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const history = JSON.parse(saved);
            const newHistory = history.filter((t: Trade) => t.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
            setTrades(newHistory);
        }
    } else {
        if (!user) return;
        
        // Optimistic UI
        setTrades(prev => prev.filter(t => t.id !== id));

        try {
            const { error } = await supabase
                .from('trades')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
        } catch (err) {
            console.error("Error deleting trade:", err);
            toast.error("Failed to delete trade");
            // Could re-fetch to fix state
        }
    }
  }, [mode, user]);

  const clearHistory = useCallback(async () => {
    if (mode === 'paper') {
        localStorage.removeItem(STORAGE_KEY);
        setTrades([]);
    } else {
        if (!user) return;
        setTrades([]); // Optimistic
        
        try {
            const { error } = await supabase
                .from('trades')
                .delete()
                .eq('user_id', user.id);
            
            if (error) throw error;
        } catch (err) {
            console.error("Error clearing history:", err);
            toast.error("Failed to clear history");
        }
    }
  }, [mode, user]);

  return {
    trades,
    saveTrade,
    deleteTrade,
    clearHistory,
    loading,
    mode
  };
}