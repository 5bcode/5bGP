import { useQuery } from '@tanstack/react-query';
import { fetchLatestPrices, fetchMapping } from '../services/api';
import type { MarketItem } from '../types';
import { getNetProfit, getROI, calculateOpportunityScores, calculateTax } from '../utils/analysis';

export function useMarketData() {
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

            // In original app, volume came from 'highPriceVolume' + 'lowPriceVolume'?
            // Actually /latest endpoint has highPriceVolume and lowPriceVolume 
            // Let's check PriceData interface. 
            // Wait, /latest usually returns { high, highTime, low, lowTime } only?
            // The 5m endpoint has volume. 
            // Original `api.js` fetchLatestPrices just fetched `/latest`.
            // Check original ui.js: `const volume = (price.highPriceVolume || 0) + (price.lowPriceVolume || 0);`
            // So /latest DOES provide volume for the last timestep implicitly or explicit fields?
            // Wiki docs say /latest is just prices. /5m is prices + volume.
            // If the original app was using /latest and getting volume, maybe it was actually hitting /5m?
            // Re-reading original `api.js`: `fetch('${API_BASE}/prices/latest')` (from cloud run)
            // Implementation plan says Cloud Run fetches `/latest` AND `/5m` and merges them.
            // HERE, I am hitting Wiki directly. I only hit `/latest`.
            // I should hit `/5m` to get volume as well if I want meaningful analysis.
            // But `/5m` is better for prices too as it's smoothed?
            // "Real-time" usually means `/latest`.
            // For now, I will use 0 for volume or just use /latest fields if present.

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
                fav: false, // TODO: Persist favorites
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
