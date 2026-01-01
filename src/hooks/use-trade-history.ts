import { useState, useEffect, useCallback } from 'react';
import { useTradeMode } from '@/context/TradeModeContext';
import { Trade } from '@/components/TradeLogDialog';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ActivePosition {
    id: string;
    itemId: number;
    itemName: string;
    buyPrice: number;
    quantity: number;
    timestamp: number;
    targetPrice?: number;
    notes?: string;
}

export function useTradeHistory() {
    const { mode } = useTradeMode();
    const { user } = useAuth();
    const HISTORY_KEY = 'paperTradeHistory';
    const ACTIVE_KEY = 'paperActivePositions'; // We'll use local for active in both modes for now to avoid schema partiality issues

    const [trades, setTrades] = useState<Trade[]>([]);
    const [activePositions, setActivePositions] = useState<ActivePosition[]>([]);
    const [loading, setLoading] = useState(true);

    // Load Data
    useEffect(() => {
        // 1. Load Active Positions (Always Local for MVP simplicity)
        const savedActive = localStorage.getItem(ACTIVE_KEY);
        if (savedActive) {
            try { setActivePositions(JSON.parse(savedActive)); }
            catch (e) { console.error(e); }
        }

        // 2. Load History
        if (mode === 'paper') {
            const saved = localStorage.getItem(HISTORY_KEY);
            if (saved) {
                try { setTrades(JSON.parse(saved)); }
                catch (e) { setTrades([]); }
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
                } finally {
                    setLoading(false);
                }
            };

            fetchTrades();

            const channel = supabase
                .channel('public:trades')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'trades', filter: `user_id=eq.${user.id}` },
                    () => fetchTrades()
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [mode, user]);

    // --- ACTIVE POSITION ACTIONS ---

    const openPosition = useCallback((position: ActivePosition) => {
        setActivePositions(prev => {
            const next = [position, ...prev];
            localStorage.setItem(ACTIVE_KEY, JSON.stringify(next));
            return next;
        });
        toast.success(`Opened position: ${position.itemName}`);
    }, []);

    const updatePosition = useCallback((id: string, updates: Partial<ActivePosition>) => {
        setActivePositions(prev => {
            const next = prev.map(p => p.id === id ? { ...p, ...updates } : p);
            localStorage.setItem(ACTIVE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const deletePosition = useCallback((id: string) => {
        setActivePositions(prev => {
            const next = prev.filter(p => p.id !== id);
            localStorage.setItem(ACTIVE_KEY, JSON.stringify(next));
            return next;
        });
        toast.success("Position deleted");
    }, []);

    // --- COMPLETED TRADE ACTIONS ---

    const saveTrade = useCallback(async (trade: Trade) => {
        if (mode === 'paper') {
            const saved = localStorage.getItem(HISTORY_KEY);
            const history = saved ? JSON.parse(saved) : [];
            const newHistory = [trade, ...history];
            localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
            setTrades(newHistory);
        } else {
            if (!user) {
                toast.error("Login required for live logs");
                return;
            }
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
                if (error) throw error;
            } catch (err) {
                console.error(err);
                toast.error("Failed to save cloud trade");
                setTrades(prev => prev.filter(t => t.id !== trade.id));
            }
        }
    }, [mode, user]);

    const deleteTrade = useCallback(async (id: string) => {
        if (mode === 'paper') {
            const saved = localStorage.getItem(HISTORY_KEY);
            if (saved) {
                const history = JSON.parse(saved);
                const newHistory = history.filter((t: Trade) => t.id !== id);
                localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
                setTrades(newHistory);
            }
        } else {
            if (!user) return;
            setTrades(prev => prev.filter(t => t.id !== id));
            try {
                await supabase.from('trades').delete().eq('id', id);
            } catch (err) { console.error(err); }
        }
    }, [mode, user]);

    const clearHistory = useCallback(async () => {
        if (mode === 'paper') {
            localStorage.removeItem(HISTORY_KEY);
            setTrades([]);
        } else {
            if (!user) return;
            setTrades([]);
            try { await supabase.from('trades').delete().eq('user_id', user.id); }
            catch (err) { console.error(err); }
        }
    }, [mode, user]);

    // Convert an Active Position to a Closed Trade
    const closePosition = useCallback((id: string, sellPrice: number) => {
        const position = activePositions.find(p => p.id === id);
        if (!position) return;

        // Calculate Profit
        // Tax: 1% capped at 5m per item (OSRS ge tax)
        const taxPerItem = Math.min(5000000, Math.floor(sellPrice * 0.01));
        const totalTax = taxPerItem * position.quantity;
        const revenue = sellPrice * position.quantity;
        const cost = position.buyPrice * position.quantity;
        const profit = revenue - cost - totalTax;

        const trade: Trade = {
            id: position.id, // Keep same ID or new one? Keep same is tracking friendly
            itemId: position.itemId,
            itemName: position.itemName,
            buyPrice: position.buyPrice,
            sellPrice: sellPrice,
            quantity: position.quantity,
            profit: profit,
            timestamp: Date.now() // Close time
        };

        saveTrade(trade);
        deletePosition(id);
        toast.success(`Position closed! Profit: ${profit.toLocaleString()} gp`);
    }, [activePositions, saveTrade, deletePosition]);

    return {
        trades,
        activePositions,
        openPosition,
        updatePosition,
        deletePosition,
        closePosition,
        saveTrade,
        deleteTrade,
        clearHistory,
        loading,
        mode
    };
}