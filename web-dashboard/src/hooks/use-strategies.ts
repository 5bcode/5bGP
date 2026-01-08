import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface Strategy {
  id: string; // "db_UUID" or "local_UUID"
  name: string;
  minPrice: number;
  maxPrice: number;
  minVolume: number;
  minRoi: number;
  isCloud?: boolean;
}

const DEFAULT_STRATEGIES: Strategy[] = [
  {
    id: 'default_safe',
    name: 'Safe Flips',
    minPrice: 100,
    maxPrice: 2147000000,
    minVolume: 10000,
    minRoi: 1
  },
  {
    id: 'default_penny',
    name: 'High Vol Penny Stocks',
    minPrice: 1,
    maxPrice: 5000,
    minVolume: 100000,
    minRoi: 5
  },
  {
    id: 'default_high_ticket',
    name: 'High Ticket Items',
    minPrice: 10000000,
    maxPrice: 2147000000,
    minVolume: 10,
    minRoi: 0.5
  }
];

export function useStrategies() {
  const { user } = useAuth();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);

  // Load Strategies
  useEffect(() => {
    const loadStrategies = async () => {
      setLoading(true);
      // 1. Always load defaults + local custom
      const localSaved = localStorage.getItem('customStrategies');
      const localStrategies = localSaved ? JSON.parse(localSaved) : [];

      let allStrategies = [...DEFAULT_STRATEGIES, ...localStrategies];

      // 2. If logged in, load cloud strategies
      if (user) {
        const { data, error } = await supabase
          .from('strategies')
          .select('*');

        if (!error && data) {
          const cloudStrategies: Strategy[] = data.map((s: any) => ({
            id: s.id,
            name: s.name,
            minPrice: parseInt(s.min_price), // Supabase returns bigints as strings sometimes or numbers?
            maxPrice: parseInt(s.max_price),
            minVolume: parseInt(s.min_volume),
            minRoi: parseFloat(s.min_roi),
            isCloud: true
          }));
          // Merge? Or just append?
          // For simplicity, we just show them alongside defaults.
          // We might want to avoid duplicates if we "synced" before.
          // For now, simple list.
          allStrategies = [...DEFAULT_STRATEGIES, ...localStrategies, ...cloudStrategies];
        }
      }

      // Remove duplicates by ID just in case
      const unique = allStrategies.filter((v, i, a) => a.findIndex(v2 => (v2.id === v.id)) === i);
      setStrategies(unique);
      setLoading(false);
    };

    loadStrategies();
  }, [user]);

  const saveStrategy = async (strategy: Strategy) => {
    // If user is logged in, save to Cloud. If not, save to Local.
    // Actually, user might want "Local Only" strategies? 
    // Let's assume if logged in => Cloud.

    if (user) {
      try {
        const { data, error } = await supabase
          .from('strategies')
          .insert([{
            user_id: user.id,
            name: strategy.name,
            min_price: strategy.minPrice,
            max_price: strategy.maxPrice,
            min_volume: strategy.minVolume,
            min_roi: strategy.minRoi
          }])
          .select()
          .single();

        if (error) throw error;

        // Update state with the new Cloud ID
        const newStrat = { ...strategy, id: data.id, isCloud: true };
        const newStrategies = [...strategies, newStrat];
        setStrategies(newStrategies);
        toast.success("Strategy saved to Cloud");
      } catch (e) {
        console.error("Cloud save failed", e);
        toast.error("Failed to save to Cloud, saving locally.");
        fallbackSaveLocal(strategy);
      }
    } else {
      fallbackSaveLocal(strategy);
    }
  };

  const fallbackSaveLocal = (strategy: Strategy) => {
    // Generate a random ID if it doesn't have one (or if it was a temp one)
    const newStrat = { ...strategy, id: strategy.id || crypto.randomUUID(), isCloud: false };
    const localStrats = strategies.filter(s => !s.isCloud && !s.id.startsWith('default')); // Get existing locals
    const newLocalStrats = [...localStrats, newStrat];

    // Update State (merging with defaults/cloud)
    setStrategies(prev => [...prev, newStrat]);

    // Update LocalStorage
    localStorage.setItem('customStrategies', JSON.stringify(newLocalStrats));
    toast.success("Strategy saved locally");
  };

  const deleteStrategy = async (id: string) => {
    const strategyToDelete = strategies.find(s => s.id === id);
    if (!strategyToDelete) return;

    if (strategyToDelete.isCloud && user) {
      const { error } = await supabase.from('strategies').delete().eq('id', id);
      if (error) {
        toast.error("Failed to delete from Cloud");
        return;
      }
      toast.success("Deleted from Cloud");
    } else {
      // Local delete
      const localStrats = strategies.filter(s => !s.isCloud && !s.id.startsWith('default') && s.id !== id);
      localStorage.setItem('customStrategies', JSON.stringify(localStrats));
      toast.success("Deleted locally");
    }

    setStrategies(prev => prev.filter(s => s.id !== id));
  };

  return { strategies, saveStrategy, deleteStrategy, loading };
}