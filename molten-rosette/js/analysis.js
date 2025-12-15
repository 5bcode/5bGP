/**
 * Core analysis logic for OSRS Flipping
 * Handles Tax, Margin, ROI, and Scoring
 */

// GE Tax Rate as of May 2025: 2%, capped at 5M
const TAX_RATE = 0.02;
const TAX_CAP = 5000000;
const TAX_FREE_THRESHOLD = 50;

/**
 * Calculate the GE tax for a given sell price.
 * @param {number} sellPrice 
 * @returns {number} The tax amount
 */
export function calculateTax(sellPrice) {
    if (sellPrice < TAX_FREE_THRESHOLD) return 0;
    const rawTax = Math.floor(sellPrice * TAX_RATE);
    return Math.min(rawTax, TAX_CAP);
}

/**
 * Calculate net profit after tax.
 * @param {number} buyPrice 
 * @param {number} sellPrice 
 * @returns {number} Net profit
 */
export function getNetProfit(buyPrice, sellPrice) {
    const tax = calculateTax(sellPrice);
    return sellPrice - buyPrice - tax;
}

/**
 * Calculate ROI percentage.
 * @param {number} profit 
 * @param {number} buyPrice 
 * @returns {number} ROI formatted as float (e.g. 5.5 for 5.5%)
 */
export function getROI(profit, buyPrice) {
    if (!buyPrice) return 0;
    return (profit / buyPrice) * 100;
}

/**
 * Formats a large number with K/M/B suffixes.
 * @param {number} num 
 * @returns {string}
 */
export function formatNumber(num) {
    if (!isFinite(num)) return '-';
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

/**
 * Calculates Opportunity Score for a list of items using Percentile Rank.
 * Formula: Score = (ProfitRank * 0.5) + (VolRank * 0.3) + (ROIRank * 0.2)
 * @param {Array} items 
 */
export function calculateOpportunityScores(items) {
    if (items.length === 0) return;

    // Helper to get percentile rank (0-100) for a value in a sorted array
    const getRank = (sortedArr, val) => {
        // Binary search or simple findIndex for MVP (using findIndex for simplicity on <5k items)
        // For performance on large arrays, we'll approximate by sorting the source arrays once.
        let idx = -1;
        // Find the index where the value fits
        // Since we pass pre-sorted arrays, we can just find the index
        // But to avoid O(N^2), let's map values to ranks first.
        return 0; // Placeholder, implemented below differently
    };

    // 1. Create sorted arrays for each metric to determine rank efficiently
    // We filter out zero/negative margins for the margin rank to avoid skewing? 
    // No, let's rank everything.
    
    const margins = items.map(i => i.margin).sort((a, b) => a - b);
    const volumes = items.map(i => i.volume).sort((a, b) => a - b);
    const rois = items.map(i => i.roi).sort((a, b) => a - b);

    const getPercentile = (sortedArr, val) => {
        // Binary search for index
        let low = 0, high = sortedArr.length - 1;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (sortedArr[mid] < val) low = mid + 1;
            else high = mid - 1;
        }
        // low is the insertion point, which is effectively the count of items smaller than val
        return (low / sortedArr.length) * 100;
    };

    // 2. Calculate Score
    items.forEach(item => {
        const pProfit = getPercentile(margins, item.margin);
        const pVol = getPercentile(volumes, item.volume);
        const pRoi = getPercentile(rois, item.roi);

        // Weights: Profit 50%, Vol 30%, ROI 20%
        item.score = (pProfit * 0.5) + (pVol * 0.3) + (pRoi * 0.2);
    });
}
