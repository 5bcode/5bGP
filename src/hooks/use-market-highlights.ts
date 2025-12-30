import { useMemo } from 'react';
import { Item, PriceData, Stats24h } from '@/services/osrs-api';
import { calculateMargin } from '@/lib/osrs-math';

// --- FILTERING THRESHOLDS ---
const TEN_MINUTES_MS = 10 * 60 * 1000;
const MIN_PRICE = 500;          // Minimum price to filter junk
const MIN_VOLUME = 50;          // Minimum 24h volume for liquidity
const MAX_SPREAD_PERCENT = 50;  // Maximum spread % to filter illiquid/manipulated items
const LIMIT_CYCLES_PER_DAY = 6; // GE buy limit resets every 4 hours (6 times per day)

export interface MarketHighlightItem {
    id: number;
    name: string;
    icon: string;
    price: number;
    metric: number; // The value to sort by (e.g. change, profit)
    metricLabel: string; // Formatted string (e.g. "+5.2%", "1.2M")
    isPositive?: boolean;
}

export const useMarketHighlights = (
    items: Item[],
    prices: Record<string, PriceData>,
    stats: Record<string, Stats24h>
) => {
    return useMemo(() => {
        if (!items.length || !Object.keys(prices).length) {
            return {
                topGainers: [],
                topLosers: [],
                highVolumeProfit: [],
                mostProfitable: [],
                mostProfitableF2P: [],
                mostExpensive: [],
                profitableAlchs: []
            };
        }

        const now = Date.now();

        const processed = items.map(item => {
            const price = prices[item.id];
            const stat = stats[item.id];
            if (!price || !stat) return null;

            // --- FILTER 1: Staleness Check (traded within last 10 min) ---
            const lastTradeTime = Math.max(price.highTime * 1000, price.lowTime * 1000);
            if (lastTradeTime < now - TEN_MINUTES_MS) return null;

            // --- FILTER 2: Minimum Price ---
            if (price.high < MIN_PRICE) return null;

            // --- FILTER 3: Minimum Volume ---
            const volume = stat.highPriceVolume + stat.lowPriceVolume;
            if (volume < MIN_VOLUME) return null;

            // --- FILTER 4: Max Spread (sanity check for illiquid items) ---
            const spreadPercent = price.low > 0 ? ((price.high - price.low) / price.low) * 100 : 0;
            if (spreadPercent > MAX_SPREAD_PERCENT) return null;

            // --- CALCULATIONS ---
            const currentPrice = price.high;
            const avgPrice = stat.avgHighPrice;

            // Change: Current vs 24h average (proxy for daily movement)
            const change = avgPrice ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;

            const { net } = calculateMargin(price.low, price.high);

            // Achievable Profit: Capped by buy limit * daily cycles
            const limitPerCycle = item.limit || 1;
            const achievableVolume = Math.min(volume, limitPerCycle * LIMIT_CYCLES_PER_DAY);
            const achievableProfit = net * achievableVolume;

            // Alch Profit: High Alch - Buy Price - Nature Rune (~100)
            const alchProfit = (item.highalch || 0) - price.low - 100;

            return {
                ...item,
                price: currentPrice,
                change,
                net,
                achievableProfit,
                alchProfit,
                volume
            };
        }).filter((i): i is NonNullable<typeof i> => i !== null && i.price > 0);

        // --- HELPER: Convert processed list to MarketHighlightItem[] ---
        const toHighlight = (
            list: typeof processed,
            metricKey: keyof typeof processed[number],
            labelFn: (i: typeof processed[0]) => string,
            positiveCheck?: (v: number) => boolean
        ): MarketHighlightItem[] => {
            return list.slice(0, 8).map(i => ({
                id: i.id,
                name: i.name,
                icon: i.icon,
                price: i.price,
                metric: i[metricKey] as number,
                metricLabel: labelFn(i),
                isPositive: positiveCheck ? positiveCheck(i[metricKey] as number) : undefined
            }));
        };

        const formatNumber = (num: number) => {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return num.toString();
        }

        // --- BUILD HIGHLIGHT LISTS ---

        // 1. Top Gainers (Highest positive % change)
        const topGainers = toHighlight(
            [...processed].sort((a, b) => b.change - a.change),
            'change',
            (i) => `+${i.change.toFixed(2)}%`,
            () => true
        );

        // 2. Top Losers (Most negative % change)
        const topLosers = toHighlight(
            [...processed].sort((a, b) => a.change - b.change),
            'change',
            (i) => `${i.change.toFixed(2)}%`,
            () => false
        );

        // 3. High Volume Profit (Realistic daily profit based on achievable volume)
        const highVolumeProfit = toHighlight(
            [...processed].sort((a, b) => b.achievableProfit - a.achievableProfit),
            'achievableProfit',
            (i) => `+${formatNumber(i.achievableProfit)}`,
            () => true
        );

        // 4. Most Profitable (Highest margin per flip)
        const mostProfitable = toHighlight(
            [...processed].sort((a, b) => b.net - a.net),
            'net',
            (i) => `+${formatNumber(i.net)}`,
            () => true
        );

        // 5. Most Profitable F2P (Highest margin, non-members items)
        const mostProfitableF2P = toHighlight(
            [...processed].filter(i => !i.members).sort((a, b) => b.net - a.net),
            'net',
            (i) => `+${formatNumber(i.net)}`,
            () => true
        );

        // 6. Most Expensive (Highest price, shows margin as metric)
        const mostExpensive = toHighlight(
            [...processed].sort((a, b) => b.price - a.price),
            'net',
            (i) => `+${formatNumber(i.net)}`,
            () => true
        );

        // 7. Profitable Alchs (Items where High Alch > GE Buy + Nat Rune)
        const profitableAlchs = toHighlight(
            [...processed].filter(i => i.highalch && i.alchProfit > 0).sort((a, b) => b.alchProfit - a.alchProfit),
            'alchProfit',
            (i) => `+${formatNumber(i.alchProfit)}`,
            () => true
        );


        return {
            topGainers,
            topLosers,
            highVolumeProfit,
            mostProfitable,
            mostProfitableF2P,
            mostExpensive,
            profitableAlchs
        };

    }, [items, prices, stats]);
};
