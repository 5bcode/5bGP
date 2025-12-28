import { useState, useEffect, useCallback } from 'react';
import { useTradeMode } from '@/context/TradeModeContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ActiveOffer } from '@/components/ActiveOffers';
import { toast } from 'sonner';

export function useActiveOffers() {
  const { mode } = useTradeMode();
  const { user } = useAuth();
  const STORAGE_KEY = 'paperActiveOffers';
  
  const [offers, setOffers] = useState<ActiveOffer[]>([]);
  const [loading, setLoading] = useState(true);

  // Load Offers & Subscribe
  useEffect(() => {
    if (mode === 'paper') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            setOffers(JSON.parse(saved));
        } else {
            setOffers([]);
        }
        setLoading(false);
    } else {
        if (!user) {
            setOffers([]);
            setLoading(false);
            return;
        }

        const fetchOffers = async () => {
            // Don't set loading true on refetches to avoid flickering
            try {
                const { data, error } = await supabase
                    .from('active_offers')
                    .select('*')
                    .order('slot', { ascending: true }); // Order by slot for GE consistency

                if (error) throw error;

                const mapped: ActiveOffer[] = (data || []).map(o => ({
                    id: o.id,
                    item: {
                        id: o.item_id,
                        name: o.item_name,
                        members: true, 
                        examine: '',
                        icon: ''
                    },
                    type: o.offer_type as 'buy' | 'sell',
                    price: o.price,
                    quantity: o.quantity,
                    timestamp: Number(o.timestamp),
                    targetPrice: o.target_price || undefined,
                    originalBuyPrice: o.original_buy_price || undefined
                }));

                setOffers(mapped);
            } catch (err) {
                console.error("Error fetching offers:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchOffers();

        // Subscribe to changes
        const channel = supabase
            .channel('public:active_offers')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'active_offers',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    fetchOffers();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }
  }, [mode, user]);

  const addOffer = useCallback(async (offer: ActiveOffer) => {
    if (mode === 'paper') {
        const saved = localStorage.getItem(STORAGE_KEY);
        const current = saved ? JSON.parse(saved) : [];
        const updated = [...current, offer];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setOffers(updated);
    } else {
        if (!user) return;
        setOffers(prev => [...prev, offer]); // Optimistic

        try {
            // Find next available slot if not provided? 
            // For manual add, we just let DB handle it or assume slot management isn't strict for manual.
            // But strict GE mapping requires slots. Let's auto-assign a high slot > 7 for manual to avoid conflict?
            // Or just use random ID. The Edge function handles slots strictly.
            
            const { error } = await supabase.from('active_offers').insert({
                id: offer.id,
                user_id: user.id,
                item_id: offer.item.id,
                item_name: offer.item.name,
                offer_type: offer.type,
                price: offer.price,
                quantity: offer.quantity,
                timestamp: offer.timestamp,
                target_price: offer.targetPrice,
                original_buy_price: offer.originalBuyPrice,
                slot: 8 // Manual offers go to 'virtual' slots to avoid overwriting RuneLite slots 0-7
            });
            if (error) throw error;
        } catch (err) {
            console.error("Error adding offer:", err);
            toast.error("Failed to add offer");
            setOffers(prev => prev.filter(o => o.id !== offer.id));
        }
    }
  }, [mode, user]);

  const updateOffer = useCallback(async (updated: ActiveOffer) => {
      if (mode === 'paper') {
        const saved = localStorage.getItem(STORAGE_KEY);
        const current: ActiveOffer[] = saved ? JSON.parse(saved) : [];
        const newOffers = current.map(o => o.id === updated.id ? updated : o);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newOffers));
        setOffers(newOffers);
      } else {
        if (!user) return;
        setOffers(prev => prev.map(o => o.id === updated.id ? updated : o));

        try {
            const { error } = await supabase.from('active_offers').update({
                offer_type: updated.type,
                price: updated.price,
                quantity: updated.quantity,
                target_price: updated.targetPrice,
                original_buy_price: updated.originalBuyPrice
            }).eq('id', updated.id);

            if (error) throw error;
        } catch (err) {
            console.error("Error updating offer:", err);
            toast.error("Failed to update offer");
        }
      }
  }, [mode, user]);

  const removeOffer = useCallback(async (id: string) => {
      if (mode === 'paper') {
        const saved = localStorage.getItem(STORAGE_KEY);
        const current: ActiveOffer[] = saved ? JSON.parse(saved) : [];
        const newOffers = current.filter(o => o.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newOffers));
        setOffers(newOffers);
      } else {
        if (!user) return;
        setOffers(prev => prev.filter(o => o.id !== id));

        try {
            const { error } = await supabase.from('active_offers').delete().eq('id', id);
            if (error) throw error;
        } catch (err) {
            console.error("Error removing offer:", err);
            toast.error("Failed to remove offer");
        }
      }
  }, [mode, user]);

  return { offers, addOffer, updateOffer, removeOffer, loading };
}