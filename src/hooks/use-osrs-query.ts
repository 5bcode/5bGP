import { useQuery } from '@tanstack/react-query';
import { osrsApi, TimeStep } from '@/services/osrs-api';

// Cache keys
export const QUERY_KEYS = {
  mapping: ['osrs', 'mapping'],
  prices: ['osrs', 'prices'],
  stats: ['osrs', 'stats'],
  timeseries: (id: number, timestep: string) => ['osrs', 'timeseries', id, timestep],
};

// 1. Item Mapping (Static data, cache for a long time)
export function useItemMapping() {
  return useQuery({
    queryKey: QUERY_KEYS.mapping,
    queryFn: osrsApi.getMapping,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 48, // 48 hours
  });
}

// 2. Latest Prices (Volatile, cache for 1 minute or dynamic)
export function useLatestPrices(refreshInterval = 60000) {
  return useQuery({
    queryKey: QUERY_KEYS.prices,
    queryFn: osrsApi.getLatestPrices,
    refetchInterval: refreshInterval,
    staleTime: Math.min(30000, refreshInterval / 2), // Keep fresh for half the interval
  });
}

// 3. 24h Stats (Update every 5-10 mins)
export function use24hStats() {
  return useQuery({
    queryKey: QUERY_KEYS.stats,
    queryFn: osrsApi.get24hStats,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// 4. Combined Hook for Dashboard/Analysis (Wait for all)
export function useMarketData(refreshInterval?: number) {
  const mapping = useItemMapping();
  // Pass refresh interval (default 60s if undefined)
  const prices = useLatestPrices(refreshInterval);
  const stats = use24hStats();

  return {
    items: mapping.data || [],
    prices: prices.data || {},
    stats: stats.data || {},
    isLoading: mapping.isLoading || prices.isLoading || stats.isLoading,
    isError: mapping.isError || prices.isError || stats.isError,
    refetch: () => {
        prices.refetch();
        stats.refetch();
    }
  };
}

// 5. Timeseries (Specific item)
export function useTimeseries(id: number, timestep: TimeStep) {
  return useQuery({
    queryKey: QUERY_KEYS.timeseries(id, timestep),
    queryFn: () => osrsApi.getTimeseries(id, timestep),
    staleTime: 1000 * 60 * 5, // 5 mins
  });
}