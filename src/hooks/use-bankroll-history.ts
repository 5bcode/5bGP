import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface BankrollSnapshot {
    id: string;
    recorded_at: string;
    total_value: number;
    cash: number;
    invested: number;
}

export function useBankrollHistory() {
    const { user } = useAuth();
    const [history, setHistory] = useState<BankrollSnapshot[]>([]);
    const [loading, setLoading] = useState(true);

    const loadHistory = async () => {
        if (!user) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('bankroll_history')
            .select('*')
            .order('recorded_at', { ascending: true });

        if (error) {
            console.error("Failed to load history", error);
            // toast.error("Could not load bankroll history");
        } else {
            setHistory(data.map((row: any) => ({
                id: row.id,
                recorded_at: row.recorded_at,
                total_value: parseInt(row.total_value),
                cash: parseInt(row.cash),
                invested: parseInt(row.invested)
            })));
        }
        setLoading(false);
    };

    const recordSnapshot = async (cash: number, invested: number) => {
        if (!user) return;

        // Rate limit: Don't record if we have one from < 1 hour ago
        // (Unless we forced it, but let's keep it simple)
        if (history.length > 0) {
            const last = history[history.length - 1];
            const lastTime = new Date(last.recorded_at).getTime();
            const now = new Date().getTime();
            if (now - lastTime < 3600 * 1000) {
                // Too soon
                return;
            }
        }

        const total = cash + invested;

        const { data, error } = await supabase
            .from('bankroll_history')
            .insert([{
                user_id: user.id,
                total_value: total,
                cash: cash,
                invested: invested
            }])
            .select()
            .single();

        if (error) {
            console.error("Failed to record snapshot", error);
        } else if (data) {
            setHistory(prev => [...prev, {
                id: data.id,
                recorded_at: data.recorded_at,
                total_value: parseInt(data.total_value),
                cash: parseInt(data.cash),
                invested: parseInt(data.invested)
            }]);
            console.log("Snapshot recorded");
        }
    };

    useEffect(() => {
        if (user) loadHistory();
    }, [user]);

    return { history, recordSnapshot, loading };
}
