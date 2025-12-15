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
        return 0; // Placeholder
    };

    // 1. Create sorted arrays for each metric
    const margins = items.map(i => i.margin).sort((a, b) => a - b);
    const volumes = items.map(i => i.volume).sort((a, b) => a - b);
    const rois = items.map(i => i.roi).sort((a, b) => a - b);

    const getPercentile = (sortedArr, val) => {
        let low = 0, high = sortedArr.length - 1;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (sortedArr[mid] < val) low = mid + 1;
            else high = mid - 1;
        }
        return (low / sortedArr.length) * 100;
    };

    // 2. Calculate Score
    items.forEach(item => {
        const pProfit = getPercentile(margins, item.margin);
        const pVol = getPercentile(volumes, item.volume);
        const pRoi = getPercentile(rois, item.roi);
        
        // Weights
        item.score = (pProfit * 0.5) + (pVol * 0.3) + (pRoi * 0.2);
    });
}

/**
 * Detects if an item is experiencing a volume pump.
 * Condition: Current 5m volume > 300% of the 1h average.
 * @param {number} vol5m 
 * @param {number} vol1h 
 * @returns {boolean}
 */
export function isPump(vol5m, vol1h) {
    if (!vol1h || vol1h < 100) return false; // Ignore low volume noise
    const avg5m = vol1h / 12;
    return vol5m > (avg5m * 3);
}

export function getAlchProfit(item, price, natureRunePrice) {
    if (!item.highalch) return -Infinity;
    return item.highalch - price - natureRunePrice;
}

export function getPriceChange1h(currentPrice, price1h) {
    if (!price1h) return 0;
    return currentPrice - price1h;
}

