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

  // Load Offers
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
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('active_offers')
                    .select('*')
                    .order('timestamp', { ascending: false });

                if (error) throw error;

                const mapped: ActiveOffer[] = (data || []).map(o => ({
                    id: o.id,
                    item: {
                        id: o.item_id,
                        name: o.item_name,
                        members: true, // We don't store full item data, this is a placeholder. 
                        // In a real app we might join or refetch, but item_id/name is enough for basic display.
                        // Ideally we merge with cached item data in the component.
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
                toast.error("Failed to sync GE offers");
            } finally {
                setLoading(false);
            }
        };

        fetchOffers();
    }
  }, [mode, user]);

  const saveOffer = useCallback(async (offer: ActiveOffer) => {
      // Logic to either insert or update based on if ID exists in current list?
      // ActiveOffer always has an ID.
      // We need to know if it's new or update. 
      // The Hook consumer usually manages the list.
      // But for DB sync, we need explicit Create/Update/Delete actions.
      // Let's expose granular methods.
  }, []);

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
                original_buy_price: offer.originalBuyPrice
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