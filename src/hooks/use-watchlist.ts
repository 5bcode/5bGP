import { useState, useEffect, useCallback } from 'react';
import { useTradeMode } from '@/context/TradeModeContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Item } from '@/services/osrs-api';
import { toast } from 'sonner';

export function useWatchlist(allItems: Item[]) {
  const { mode } = useTradeMode();
  const { user } = useAuth();
  const STORAGE_KEY = 'trackedItems';

  const [watchlist, setWatchlist] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to map IDs back to full Items
  const idsToItems = useCallback((ids: number[]) => {
    return ids
      .map(id => allItems.find(i => i.id === id))
      .filter((i): i is Item => !!i);
  }, [allItems]);

  useEffect(() => {
    if (allItems.length === 0) return;

    if (mode === 'paper') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Handle legacy format (array of items) vs new format (if we changed it)
          // We just trust it's an array of items for now, but better to extract IDs and remap
          // to ensure we have fresh item data (icons etc)
          const ids = parsed.map((i: Item) => i.id);
          setWatchlist(idsToItems(ids));
        } catch (e) {
            console.error(e);
            setWatchlist([]);
        }
      }
      setLoading(false);
    } else {
      // Live Mode
      if (!user) {
        setWatchlist([]);
        setLoading(false);
        return;
      }

      const fetchWatchlist = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('watchlists')
            .select('item_id');

          if (error) throw error;

          const ids = data.map(r => r.item_id);
          setWatchlist(idsToItems(ids));
        } catch (err) {
          console.error("Error fetching watchlist:", err);
          toast.error("Failed to sync watchlist");
        } finally {
          setLoading(false);
        }
      };

      fetchWatchlist();
    }
  }, [mode, user, allItems, idsToItems]);

  const addToWatchlist = useCallback(async (item: Item) => {
    // Check duplication
    if (watchlist.find(i => i.id === item.id)) {
        toast.info("Item already in watchlist");
        return;
    }

    // Optimistic Update
    const newWatchlist = [item, ...watchlist];
    setWatchlist(newWatchlist);

    if (mode === 'paper') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newWatchlist));
        toast.success(`Added ${item.name}`);
    } else {
        if (!user) return;
        try {
            const { error } = await supabase.from('watchlists').insert({
                user_id: user.id,
                item_id: item.id
            });
            if (error) throw error;
            toast.success(`Added ${item.name}`);
        } catch (err) {
            console.error("Error adding to watchlist:", err);
            toast.error("Failed to save to cloud");
            setWatchlist(prev => prev.filter(i => i.id !== item.id)); // Rollback
        }
    }
  }, [mode, user, watchlist]);

  const removeFromWatchlist = useCallback(async (itemId: number) => {
    // Optimistic Update
    setWatchlist(prev => prev.filter(i => i.id !== itemId));

    if (mode === 'paper') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            const filtered = parsed.filter((i: Item) => i.id !== itemId);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        }
        toast.info("Item removed");
    } else {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('watchlists')
                .delete()
                .eq('user_id', user.id)
                .eq('item_id', itemId);
            
            if (error) throw error;
            toast.info("Item removed");
        } catch (err) {
            console.error("Error removing from watchlist:", err);
            toast.error("Failed to update cloud");
        }
    }
  }, [mode, user]);

  const clearWatchlist = useCallback(async () => {
      setWatchlist([]);
      if (mode === 'paper') {
          localStorage.removeItem(STORAGE_KEY);
          toast.success("Watchlist cleared");
      } else {
          if (!user) return;
          try {
              const { error } = await supabase.from('watchlists').delete().eq('user_id', user.id);
              if (error) throw error;
              toast.success("Watchlist cleared");
          } catch (err) {
              console.error(err);
              toast.error("Failed to clear cloud watchlist");
          }
      }
  }, [mode, user]);

  return { watchlist, addToWatchlist, removeFromWatchlist, clearWatchlist, loading };
}