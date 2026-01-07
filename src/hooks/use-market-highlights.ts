import { useMemo, useDeferredValue } from 'react';
import { Item, PriceData, Stats24h } from '@/services/osrs-api';
import { calculateMargin } from '@/lib/osrs-math';

// --- FILTERING THRESHOLDS ---
const TEN_MINUTES_MS = 10 * 60 * 1000;
const MIN_PRICE = 500;
const MIN_VOLUME = 100;
const MIN_TURNOVER = 5_000_000;
const MAX_SPREAD_PERCENT = 40;


export interface MarketHighlightItem {
    id: number;
    name: string;
    icon: string;
    price: number;
    metric: number;
    metricLabel: string;
    isPositive?: boolean;
    volume: number;
    members: boolean;
    roi: number;
    spread: number;
}

export const useMarketHighlights = (
    items: Item[],
    prices: Record<string, PriceData>,
    stats: Record<string, Stats24h>
) => {
    // Defer heavy computation - allows React to keep UI responsive during updates
    const deferredPrices = useDeferredValue(prices);
    const deferredStats = useDeferredValue(stats);

    return useMemo(() => {
        if (!items.length || !Object.keys(deferredPrices).length) {
            return {
                topGainers: [],
                topLosers: [],
                highVolumeProfit: [],
                mostProfitable: [],
                mostProfitableF2P: [],
                mostExpensive: [],
                profitableAlchs: [],
                potentialDumps: []
            };
        }

        const now = Date.now();

        const processed = items.map(item => {
            const price = deferredPrices[item.id];
            const stat = deferredStats[item.id];
            if (!price || !stat) return null;

            // --- FILTER 1: Staleness ---
            const lastTradeTime = Math.max(price.highTime * 1000, price.lowTime * 1000);
            if (lastTradeTime < now - (TEN_MINUTES_MS * 1.5)) return null;

            // --- FILTER 2: Min Price/Volume ---
            if (price.high < MIN_PRICE) return null;
            const volume = stat.highPriceVolume + stat.lowPriceVolume;
            if (volume < MIN_VOLUME) return null;

            // --- FILTER 3: Turnover ---
            const turnover = price.high * volume;
            if (price.high < 100_000_000 && turnover < MIN_TURNOVER) return null;

            // --- FILTER 4: Spread ---
            const spreadPercent = price.low > 0 ? ((price.high - price.low) / price.low) * 100 : 0;
            if (spreadPercent > MAX_SPREAD_PERCENT) return null;

            // --- CALCULATIONS ---
            const currentPrice = price.high;
            const avgPrice = stat.avgHighPrice;
            const change = avgPrice ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
            const { net, roi } = calculateMargin(price.low, price.high);

            const limitPerCycle = item.limit || 1000;
            // Use single 4-hour limit to match standard "Potential Profit" metric
            const achievableVolume = Math.min(volume, limitPerCycle);
            const achievableProfit = net * achievableVolume;
            const alchProfit = (item.highalch || 0) - price.low - 105;

            const isQualityFlip = roi > 1;

            return {
                ...item,
                price: currentPrice,
                change,
                net,
                roi,
                spread: spreadPercent,
                achievableProfit,
                alchProfit,
                volume,
                isQualityFlip
            };
        }).filter((i): i is NonNullable<typeof i> => i !== null && i.price > 0);

        // --- HELPER ---
        const toHighlight = (
            list: typeof processed,
            metricKey: keyof typeof processed[number],
            labelFn: (i: typeof processed[0]) => string,
            positiveCheck?: (v: number) => boolean,
            limit = 50
        ): MarketHighlightItem[] => {
            return list.slice(0, limit).map(i => ({
                id: i.id,
                name: i.name,
                icon: i.icon,
                price: i.price,
                metric: i[metricKey] as number,
                metricLabel: labelFn(i),
                isPositive: positiveCheck ? positiveCheck(i[metricKey] as number) : undefined,
                volume: i.volume,
                members: i.members,
                roi: i.roi,
                spread: i.spread
            }));
        };

        const formatNumber = (num: number) => {
            if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
            if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
            if (num >= 10_000) return (num / 1_000).toFixed(1) + 'K';
            return num.toString();
        }

        // --- BUILD HIGHLIGHT LISTS ---
        const topGainers = toHighlight(
            [...processed]
                .filter(i => i.change > 0 && (i.volume > 5000 || i.price > 1_000_000))
                .sort((a, b) => b.change - a.change),
            'change',
            (i) => `+${i.change.toFixed(2)}%`,
            () => true
        );

        const topLosers = toHighlight(
            [...processed]
                .filter(i => i.change < 0 && (i.volume > 5000 || i.price > 1_000_000))
                .sort((a, b) => a.change - b.change),
            'change',
            (i) => `${i.change.toFixed(2)}%`,
            () => false
        );

        const highVolumeProfit = toHighlight(
            [...processed]
                .filter(i => i.volume > 1000)
                .sort((a, b) => b.achievableProfit - a.achievableProfit),
            'achievableProfit',
            (i) => `+${formatNumber(i.achievableProfit)}`,
            () => true
        );

        const mostProfitable = toHighlight(
            [...processed]
                .filter(i => i.isQualityFlip)
                .sort((a, b) => b.net - a.net),
            'net',
            (i) => `+${formatNumber(i.net)}`,
            () => true
        );

        const mostProfitableF2P = toHighlight(
            [...processed]
                .filter(i => !i.members && i.roi > 0.5)
                .sort((a, b) => b.net - a.net),
            'net',
            (i) => `+${formatNumber(i.net)}`,
            () => true
        );

        const mostExpensive = toHighlight(
            [...processed]
                .filter(i => i.volume > 2)
                .sort((a, b) => b.price - a.price),
            'net',
            (i) => `+${formatNumber(i.net)}`,
            () => true
        );

        const profitableAlchs = toHighlight(
            [...processed]
                .filter(i => i.highalch && i.alchProfit > 150)
                .sort((a, b) => b.alchProfit - a.alchProfit),
            'alchProfit',
            (i) => `+${formatNumber(i.alchProfit)}`,
            () => true
        );

        const potentialDumps = toHighlight(
            [...processed]
                .filter(i => {
                    const turnover = i.price * i.volume;
                    return i.change < -5 && turnover > 20_000_000;
                })
                .sort((a, b) => a.change - b.change), // Biggest drop first
            'change',
            (i) => `${i.change.toFixed(2)}%`,
            () => false
        );

        return {
            topGainers,
            topLosers,
            highVolumeProfit,
            mostProfitable,
            mostProfitableF2P,
            mostExpensive,
            profitableAlchs,
            potentialDumps
        };

    }, [items, deferredPrices, deferredStats]);
};
