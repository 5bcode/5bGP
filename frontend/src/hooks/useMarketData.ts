import { useQuery } from '@tanstack/react-query';
import { fetchLatestPrices, fetchMapping } from '../services/api';
import type { MarketItem } from '../types';
import { getNetProfit, getROI, calculateOpportunityScores, calculateTax } from '../utils/analysis';
import { usePreferencesStore } from '../store/preferencesStore';

export function useMarketData() {
    const { favorites } = usePreferencesStore();

    // 1. Fetch Mapping (Stale time: Infinity, since item IDs rarely change)
    const { data: mapping, isLoading: loadingMapping, error: mappingError } = useQuery({
        queryKey: ['mapping'],
        queryFn: fetchMapping,
        staleTime: 1000 * 60 * 60 * 24, // 24 hours
    });

    // 2. Fetch Prices (Poll every 60s)
    const { data: pricesData, isLoading: loadingPrices, error: pricesError } = useQuery({
        queryKey: ['prices'],
        queryFn: fetchLatestPrices,
        refetchInterval: 60000,
        staleTime: 30000,
    });

    // 3. Process Data
    let marketItems: MarketItem[] = [];

    if (mapping && pricesData?.data) {
        const prices = pricesData.data;

        // Fetch Nature Rune Price (ID: 561) for Alch Calculations
        const natureRunePrice = prices['561']?.low ?? 200;

        marketItems = mapping.map((item) => {
            const price = prices[item.id];
            if (!price) return null;

            // Mapping 'high' to sellPrice and 'low' to buyPrice logic from original app
            // Original: effectiveBuy = price.low, effectiveSell = price.high
            const buyPrice = price.low ?? 0;
            const sellPrice = price.high ?? 0;

            if (!buyPrice || !sellPrice) return null;

            const margin = getNetProfit(buyPrice, sellPrice);
            const roi = getROI(margin, buyPrice);
            const tax = calculateTax(sellPrice);
            const alchProfit = (item.highalch || 0) - (buyPrice + natureRunePrice);

            return {
                ...item,
                buyPrice,
                sellPrice,
                margin,
                tax,
                roi,
                volume: 0, // Placeholder until we integrate /5m or similar
                potentialProfit: margin * (item.limit ?? 0),
                timestamp: Math.max(price.highTime ?? 0, price.lowTime ?? 0),
                fav: favorites.includes(item.id),
                score: 0,
                alchProfit
            } as MarketItem;
        }).filter((i): i is MarketItem => i !== null);

        // Calculate scores (needs volume, so scores will be 0 for now until we fix volume)
        calculateOpportunityScores(marketItems);
    }

    return {
        items: marketItems,
        isLoading: loadingMapping || loadingPrices,
        error: mappingError || pricesError,
    };
}
