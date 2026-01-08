import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTradeMode } from '@/context/TradeModeContext';
import { toast } from 'sonner';

export function useBankroll() {
    const { mode } = useTradeMode();
    const { user } = useAuth();
    const [totalCash, setTotalCash] = useState<number>(10000000); // Default 10M
    const [loading, setLoading] = useState(true);

    // Load Bankroll
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            if (mode === 'paper') {
                const saved = localStorage.getItem('totalBankroll');
                if (saved) setTotalCash(parseInt(saved));
            } else {
                if (!user) {
                    setLoading(false);
                    return;
                }
                const { data } = await supabase
                    .from('profiles')
                    .select('bankroll')
                    .eq('id', user.id)
                    .single();

                if (data && data.bankroll) {
                    setTotalCash(Number(data.bankroll));
                }
            }
            setLoading(false);
        };
        load();
    }, [mode, user]);

    const updateBankroll = async (val: number) => {
        if (isNaN(val) || val < 0) {
            toast.error("Invalid amount");
            return;
        }

        setTotalCash(val);

        if (mode === 'paper') {
            localStorage.setItem('totalBankroll', val.toString());
            toast.success("Bankroll updated (Local)");
        } else {
            if (!user) return;
            try {
                const { error } = await supabase
                    .from('profiles')
                    .update({ bankroll: val })
                    .eq('id', user.id);

                if (error) throw error;
                toast.success("Bankroll synced to profile");
            } catch (err) {
                console.error("Error saving bankroll", err);
                toast.error("Failed to sync bankroll");
            }
        }
    };

    return { totalCash, updateBankroll, loading };
}
