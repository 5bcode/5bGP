import type { MarketItem } from "../types";

export const TAX_RATE = 0.02;
export const TAX_CAP = 5_000_000;
export const TAX_FREE_THRESHOLD = 50;

/**
 * Calculate the GE tax for a given sell price.
 */
export function calculateTax(sellPrice: number): number {
    if (sellPrice < TAX_FREE_THRESHOLD) return 0;
    const rawTax = Math.floor(sellPrice * TAX_RATE);
    return Math.min(rawTax, TAX_CAP);
}

/**
 * Calculate net profit after tax.
 */
export function getNetProfit(buyPrice: number, sellPrice: number): number {
    const tax = calculateTax(sellPrice);
    return sellPrice - buyPrice - tax;
}

/**
 * Calculate ROI percentage.
 */
export function getROI(profit: number, buyPrice: number): number {
    if (!buyPrice) return 0;
    return (profit / buyPrice) * 100;
}

/**
 * Formats a large number with K/M/B suffixes.
 */
export function formatNumber(num: number): string {
    if (!Number.isFinite(num)) return '-';
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toLocaleString();
}

/**
 * Calculate Alch Profit
 */
export function getAlchProfit(highAlch: number | undefined, buyPrice: number, natureRunePrice: number): number {
    if (!highAlch) return -Infinity;
    return highAlch - buyPrice - natureRunePrice;
}

/**
 * Detects if an item is experiencing a volume pump.
 */
export function isPump(vol5m: number, vol1h: number): boolean {
    if (!vol1h || vol1h < 100) return false;
    const avg5m = vol1h / 12;
    return vol5m > (avg5m * 3);
}

/**
 * Calculates Opportunity Score for a list of items using Percentile Rank.
 * Formula: Score = (ProfitRank * 0.5) + (VolRank * 0.3) + (ROIRank * 0.2)
 */
export function calculateOpportunityScores(items: MarketItem[]) {
    if (items.length === 0) return;

    const margins = items.map(i => i.margin).sort((a, b) => a - b);
    const volumes = items.map(i => i.volume).sort((a, b) => a - b);
    const rois = items.map(i => i.roi).sort((a, b) => a - b);

    const getPercentile = (sortedArr: number[], val: number) => {
        let low = 0, high = sortedArr.length - 1;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (sortedArr[mid] < val) low = mid + 1;
            else high = mid - 1;
        }
        return (low / sortedArr.length) * 100;
    };

    items.forEach(item => {
        const pProfit = getPercentile(margins, item.margin);
        const pVol = getPercentile(volumes, item.volume);
        const pRoi = getPercentile(rois, item.roi);

        item.score = (pProfit * 0.5) + (pVol * 0.3) + (pRoi * 0.2);
    });
}
