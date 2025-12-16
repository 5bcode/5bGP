import { useQuery } from '@tanstack/react-query';
import { fetchLatestPrices, fetchMapping, fetch5mVolume, fetch1hVolume } from '../services/api';
import type { MarketItem } from '../types';
import {
    getNetProfit,
    getROI,
    calculateOpportunityScores,
    calculateTax,
    getTrendSignal,
    calculateVolatility,
    getRiskLevel,
    calculatePriceStability,
    calculateFlipperScore
} from '../utils/analysis';
import type { TrendSignal } from '../utils/analysis';
import { usePreferencesStore } from '../store/preferencesStore';
import { useMemo } from 'react';

export interface EnhancedMarketItem extends MarketItem {
    vol5m: number;
    vol1h: number;
    price5mAvg: number;
    price1hAvg: number;
    priceChange: number;
    trendSignal: TrendSignal;
    // New fields for advanced filtering
    lastBuyTime: number;      // Unix timestamp of last buy
    lastSellTime: number;     // Unix timestamp of last sell
    lastBuyAgo: number;       // Seconds since last buy
    lastSellAgo: number;      // Seconds since last sell
    priceVolume24h: number;   // Price x Volume estimate (24h)
    limitProfit: number;      // Profit from buying full limit
}

export function useMarketData() {
    const { favorites } = usePreferencesStore();

    // 1. Fetch Mapping (Stale time: 24h, since item IDs rarely change)
    const { data: mapping, isLoading: loadingMapping, error: mappingError } = useQuery({
        queryKey: ['mapping'],
        queryFn: fetchMapping,
        staleTime: 1000 * 60 * 60 * 24, // 24 hours
    });

    // 2. Fetch Latest Prices (Poll every 60s)
    const { data: pricesData, isLoading: loadingPrices, error: pricesError } = useQuery({
        queryKey: ['prices'],
        queryFn: fetchLatestPrices,
        refetchInterval: 60000,
        staleTime: 30000,
    });

    // 3. Fetch 5-minute Volume Data (Poll every 5 mins)
    const { data: vol5mData, isLoading: loading5m, error: error5m } = useQuery({
        queryKey: ['volume5m'],
        queryFn: fetch5mVolume,
        refetchInterval: 5 * 60 * 1000, // 5 minutes
        staleTime: 4 * 60 * 1000, // 4 minutes
    });

    // 4. Fetch 1-hour Volume Data (Poll every 30 mins for comparison)
    const { data: vol1hData, isLoading: loading1h, error: error1h } = useQuery({
        queryKey: ['volume1h'],
        queryFn: fetch1hVolume,
        refetchInterval: 30 * 60 * 1000, // 30 minutes
        staleTime: 25 * 60 * 1000, // 25 minutes
    });

    // 5. Process Data
    const marketItems = useMemo<EnhancedMarketItem[]>(() => {
        if (!mapping || !pricesData?.data) return [];

        const prices = pricesData.data;
        const vol5m = vol5mData?.data || {};
        const vol1h = vol1hData?.data || {};
        const now = Math.floor(Date.now() / 1000); // Current unix timestamp

        // Fetch Nature Rune Price (ID: 561) for Alch Calculations
        const natureRunePrice = prices['561']?.low ?? 200;

        const items = mapping.map((item) => {
            const price = prices[item.id];
            if (!price) return null;

            // Mapping 'high' to sellPrice and 'low' to buyPrice
            const buyPrice = price.low ?? 0;
            const sellPrice = price.high ?? 0;

            if (!buyPrice || !sellPrice) return null;

            const margin = getNetProfit(buyPrice, sellPrice);
            const roi = getROI(margin, buyPrice);
            const tax = calculateTax(sellPrice);
            const alchProfit = (item.highalch || 0) - (buyPrice + natureRunePrice);

            // Get volume data
            const itemVol5m = vol5m[item.id];
            const itemVol1h = vol1h[item.id];

            const vol5mTotal = itemVol5m ? (itemVol5m.highPriceVolume || 0) + (itemVol5m.lowPriceVolume || 0) : 0;
            const vol1hTotal = itemVol1h ? (itemVol1h.highPriceVolume || 0) + (itemVol1h.lowPriceVolume || 0) : 0;

            // Get 5m and 1h average prices for trend detection
            const price5mAvg = itemVol5m
                ? ((itemVol5m.avgHighPrice || 0) + (itemVol5m.avgLowPrice || 0)) / 2 || buyPrice
                : buyPrice;
            const price1hAvg = itemVol1h
                ? ((itemVol1h.avgHighPrice || 0) + (itemVol1h.avgLowPrice || 0)) / 2 || buyPrice
                : buyPrice;

            // Calculate price change
            const priceChange = price1hAvg > 0
                ? ((price5mAvg - price1hAvg) / price1hAvg) * 100
                : 0;

            // Get trend signal (pump/dump/stable/volatile)
            const trendSignal = getTrendSignal(vol5mTotal, vol1hTotal, price5mAvg, price1hAvg);

            // Last buy/sell times
            const lastBuyTime = price.lowTime ?? 0;  // lowTime = when someone instant-sold (we can buy)
            const lastSellTime = price.highTime ?? 0; // highTime = when someone instant-bought (we can sell)
            const lastBuyAgo = lastBuyTime > 0 ? now - lastBuyTime : Infinity;
            const lastSellAgo = lastSellTime > 0 ? now - lastSellTime : Infinity;

            // Price x Volume 24h estimate (1h volume * 24 * avg price)
            const avgPrice = (buyPrice + sellPrice) / 2;
            const priceVolume24h = vol1hTotal * 24 * avgPrice;

            // Limit profit (profit from buying full GE limit)
            const limitProfit = margin * (item.limit ?? 0);

            // Calculate advanced analytics using volume data
            const volatilityIndex = calculateVolatility([buyPrice, sellPrice, price5mAvg, price1hAvg].filter(p => p > 0));
            const riskLevel = getRiskLevel(volatilityIndex);
            const priceStability = calculatePriceStability(volatilityIndex);
            const flipperScore = calculateFlipperScore(roi, margin, vol5mTotal, priceStability, item.limit ?? 0);

            return {
                ...item,
                buyPrice,
                sellPrice,
                margin,
                tax,
                roi,
                volume: vol5mTotal, // Use 5m volume as the display volume
                potentialProfit: limitProfit,
                timestamp: Math.max(price.highTime ?? 0, price.lowTime ?? 0),
                fav: favorites.includes(item.id),
                score: 0,
                alchProfit,
                // Advanced Analytics
                flipperScore,
                volatilityIndex,
                riskLevel,
                priceStability,
                // Enhanced fields
                vol5m: vol5mTotal,
                vol1h: vol1hTotal,
                price5mAvg,
                price1hAvg,
                priceChange,
                trendSignal,
                pump: trendSignal === 'pump',
                // New fields
                lastBuyTime,
                lastSellTime,
                lastBuyAgo,
                lastSellAgo,
                priceVolume24h,
                limitProfit,
            } as EnhancedMarketItem;
        }).filter((i): i is EnhancedMarketItem => i !== null);

        // Calculate opportunity scores with actual volume data
        calculateOpportunityScores(items);

        return items;
    }, [mapping, pricesData, vol5mData, vol1hData, favorites]);

    return {
        items: marketItems,
        isLoading: loadingMapping || loadingPrices || loading5m || loading1h,
        error: mappingError || pricesError || error5m || error1h,
        hasVolumeData: !!vol5mData && !!vol1hData,
    };
}
