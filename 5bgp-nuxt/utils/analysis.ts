import type { MarketItem, TimeseriesPoint, AnalyticsData, AdvancedVolatilityMetrics } from "../types";

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
 * Formats seconds into a human-readable "time ago" string.
 * @param seconds - Number of seconds ago
 */
export function formatTimeAgo(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '-';
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
}

/**
 * Check if a time (in seconds ago) is within a threshold.
 */
export function isWithinTime(secondsAgo: number, thresholdMinutes: number): boolean {
    return secondsAgo <= thresholdMinutes * 60;
}

/**
 * Calculate Alch Profit
 */
export function getAlchProfit(highAlch: number | undefined, buyPrice: number, natureRunePrice: number): number {
    if (!highAlch) return -Infinity;
    return highAlch - buyPrice - natureRunePrice;
}

/**
 * Detects if an item is experiencing a volume pump (buying frenzy).
 * A pump occurs when 5m volume is significantly higher than average AND price is rising.
 */
export function isPump(vol5m: number, vol1h: number, price5m?: number, price1h?: number): boolean {
    if (!vol1h || vol1h < 100) return false;
    const avg5m = vol1h / 12; // hourly volume divided by 12 for 5m average
    const volumeSpike = vol5m > (avg5m * 3); // 3x average volume

    // If we have price data, also check for price increase
    if (price5m !== undefined && price1h !== undefined && price1h > 0) {
        const priceChange = ((price5m - price1h) / price1h) * 100;
        return volumeSpike && priceChange > 2; // Volume spike + 2%+ price increase
    }

    return volumeSpike;
}

/**
 * Detects if an item is experiencing a dump (selling frenzy).
 * A dump occurs when 5m volume is high AND price is falling.
 */
export function isDump(vol5m: number, vol1h: number, price5m?: number, price1h?: number): boolean {
    if (!vol1h || vol1h < 100) return false;
    const avg5m = vol1h / 12;
    const volumeSpike = vol5m > (avg5m * 2); // 2x average volume

    // Check for price decrease
    if (price5m !== undefined && price1h !== undefined && price1h > 0) {
        const priceChange = ((price5m - price1h) / price1h) * 100;
        return volumeSpike && priceChange < -2; // Volume spike + 2%+ price decrease
    }

    return false;
}

export type TrendSignal = 'pump' | 'dump' | 'stable' | 'volatile';

/**
 * Get the overall trend signal for an item.
 */
export function getTrendSignal(
    vol5m: number,
    vol1h: number,
    price5m?: number,
    price1h?: number
): TrendSignal {
    if (isDump(vol5m, vol1h, price5m, price1h)) return 'dump';
    if (isPump(vol5m, vol1h, price5m, price1h)) return 'pump';

    // Check for general volatility without direction
    if (vol1h && vol1h > 0) {
        const avg5m = vol1h / 12;
        if (vol5m > avg5m * 2) return 'volatile';
    }

    return 'stable';
}

/**
 * Calculate price change percentage between two prices.
 */
export function getPriceChange(currentPrice: number, previousPrice: number): number {
    if (!previousPrice || previousPrice === 0) return 0;
    return ((currentPrice - previousPrice) / previousPrice) * 100;
}

/**
 * Detect pump/dump from timeseries data.
 * Analyzes the recent trend vs historical average.
 */
export function analyzeTimeseriesTrend(data: { avgHighPrice: number | null; avgLowPrice: number | null; highPriceVolume: number; lowPriceVolume: number }[]): {
    trend: TrendSignal;
    priceChange24h: number;
    volumeChange: number;
    isManipulated: boolean;
} {
    if (data.length < 12) {
        return { trend: 'stable', priceChange24h: 0, volumeChange: 0, isManipulated: false };
    }

    // Get recent data (last 12 points = ~1 hour for 5m data)
    const recentData = data.slice(-12);
    const olderData = data.slice(0, -12);

    // Calculate average prices
    const getAvgPrice = (d: typeof data[0]) => {
        const h = d.avgHighPrice ?? 0;
        const l = d.avgLowPrice ?? 0;
        return h && l ? (h + l) / 2 : h || l;
    };

    const recentPrices = recentData.map(getAvgPrice).filter(p => p > 0);
    const olderPrices = olderData.map(getAvgPrice).filter(p => p > 0);

    const recentAvgPrice = recentPrices.length > 0
        ? recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length
        : 0;
    const olderAvgPrice = olderPrices.length > 0
        ? olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length
        : 0;

    // Calculate volumes
    const getVol = (d: typeof data[0]) => (d.highPriceVolume || 0) + (d.lowPriceVolume || 0);
    const recentVolume = recentData.reduce((acc, d) => acc + getVol(d), 0);
    const olderAvgVolume = olderData.length > 0
        ? olderData.reduce((acc, d) => acc + getVol(d), 0) / olderData.length * 12
        : 0;

    // Calculate changes
    const priceChange24h = olderAvgPrice > 0
        ? ((recentAvgPrice - olderAvgPrice) / olderAvgPrice) * 100
        : 0;
    const volumeChange = olderAvgVolume > 0
        ? ((recentVolume - olderAvgVolume) / olderAvgVolume) * 100
        : 0;

    // Determine trend
    let trend: TrendSignal = 'stable';
    const isVolumeSpike = volumeChange > 100; // 2x+ volume

    if (isVolumeSpike && priceChange24h > 5) {
        trend = 'pump';
    } else if (isVolumeSpike && priceChange24h < -5) {
        trend = 'dump';
    } else if (isVolumeSpike || Math.abs(priceChange24h) > 10) {
        trend = 'volatile';
    }

    // Detect potential manipulation (extreme volume + extreme price change)
    const isManipulated = isVolumeSpike && Math.abs(priceChange24h) > 15;

    return { trend, priceChange24h, volumeChange, isManipulated };
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

// ============================================
// ADVANCED TECHNICAL ANALYSIS FUNCTIONS
// ============================================

/**
 * Calculate Simple Moving Average (SMA) for a given period.
 * @param data - Array of price values
 * @param period - Number of periods for the average
 */
export function calculateSMA(data: (number | null)[], period: number): number[] {
    const result: number[] = [];
    const validData = data.map(v => v ?? 0);

    for (let i = 0; i < validData.length; i++) {
        if (i < period - 1) {
            result.push(0); // Not enough data yet
        } else {
            const slice = validData.slice(i - period + 1, i + 1);
            const sum = slice.reduce((acc, val) => acc + val, 0);
            result.push(sum / period);
        }
    }
    return result;
}

/**
 * Calculate Exponential Moving Average (EMA) for a given period.
 * @param data - Array of price values
 * @param period - Number of periods for the average
 */
export function calculateEMA(data: (number | null)[], period: number): number[] {
    const result: number[] = [];
    const validData = data.map(v => v ?? 0);
    const multiplier = 2 / (period + 1);

    // Start with SMA for first period values
    let ema = validData.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = 0; i < validData.length; i++) {
        if (i < period - 1) {
            result.push(0);
        } else if (i === period - 1) {
            result.push(ema);
        } else {
            ema = (validData[i] - ema) * multiplier + ema;
            result.push(ema);
        }
    }
    return result;
}

/**
 * Calculate price volatility (standard deviation as % of mean).
 * Higher values = more volatile = more risky.
 */
export function calculateVolatility(prices: (number | null)[]): number {
    const validPrices = prices.filter((p): p is number => p !== null && p > 0);
    if (validPrices.length < 2) return 0;

    const mean = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
    if (mean === 0) return 0;

    const squaredDiffs = validPrices.map(p => Math.pow(p - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / validPrices.length;
    const stdDev = Math.sqrt(variance);

    // Return as percentage of mean (coefficient of variation)
    return (stdDev / mean) * 100;
}

/**
 * Get risk level based on volatility index.
 */
export function getRiskLevel(volatility: number): 'low' | 'medium' | 'high' | 'extreme' {
    if (volatility < 2) return 'low';
    if (volatility < 5) return 'medium';
    if (volatility < 10) return 'high';
    return 'extreme';
}

/**
 * Calculate price stability score (inverse of volatility, 0-100 scale).
 */
export function calculatePriceStability(volatility: number): number {
    // Maps volatility to a 0-100 stability score
    // Lower volatility = higher stability
    const stability = Math.max(0, 100 - (volatility * 5));
    return Math.min(100, stability);
}

/**
 * Calculate Flipper's Score - a proprietary ranking metric.
 * Formula combines: ROI (30%), Margin (25%), Volume (25%), Stability (20%)
 * Scale: 0-100
 */
export function calculateFlipperScore(
    roi: number,
    margin: number,
    volume: number,
    stability: number,
    limit: number
): number {
    // Normalize each factor to a 0-100 scale
    const roiScore = Math.min(100, Math.max(0, roi * 10)); // 10% ROI = 100
    const marginScore = Math.min(100, Math.max(0, (margin / 10000) * 100)); // 10k margin = 100
    const volumeScore = Math.min(100, Math.max(0, (volume / 1000) * 100)); // 1k volume = 100
    const stabilityScore = stability; // Already 0-100

    // Bonus for items with reasonable limits (not too low, not too high)
    const limitBonus = limit >= 100 && limit <= 10000 ? 10 : 0;

    // Weighted average
    const score = (roiScore * 0.30) + (marginScore * 0.25) + (volumeScore * 0.25) + (stabilityScore * 0.20);

    return Math.min(100, score + limitBonus);
}

/**
 * Compute full analytics data from timeseries points.
 */
export function computeAnalytics(data: TimeseriesPoint[]): AnalyticsData & AdvancedVolatilityMetrics {
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

    // Use avgHighPrice (sell) and avgLowPrice (buy) midpoint for calculations
    const prices = sortedData.map(d => {
        const high = d.avgHighPrice ?? 0;
        const low = d.avgLowPrice ?? 0;
        return high && low ? (high + low) / 2 : high || low || null;
    });

    const volumes = sortedData.map(d => (d.highPriceVolume || 0) + (d.lowPriceVolume || 0));
    const validPrices = prices.filter((p): p is number => p !== null && p > 0);

    // Calculate advanced volatility metrics
    const advancedVolatility = calculateAdvancedVolatility(sortedData);

    return {
        sma7: calculateSMA(prices, 7),
        sma14: calculateSMA(prices, 14),
        ema7: calculateEMA(prices, 7),
        ema14: calculateEMA(prices, 14),
        totalVolume: volumes.reduce((a, b) => a + b, 0),
        avgVolume: volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0,
        volatility: calculateVolatility(prices),
        priceRange: {
            min: validPrices.length > 0 ? Math.min(...validPrices) : 0,
            max: validPrices.length > 0 ? Math.max(...validPrices) : 0,
        },
        ...advancedVolatility,
    };
}

// ============================================
// ADVANCED VOLATILITY METRICS
// ============================================

/**
 * Calculate Standard Deviation of Returns.
 * Measures how much the price deviates from its average over time.
 */
export function calculateStdDevReturns(prices: (number | null)[]): number {
    const validPrices = prices.filter((p): p is number => p !== null && p > 0);
    if (validPrices.length < 2) return 0;

    // Calculate returns (percentage change between consecutive prices)
    const returns: number[] = [];
    for (let i = 1; i < validPrices.length; i++) {
        const ret = ((validPrices[i] - validPrices[i - 1]) / validPrices[i - 1]) * 100;
        returns.push(ret);
    }

    if (returns.length === 0) return 0;

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;

    return Math.sqrt(variance);
}

/**
 * Calculate Average True Range (ATR).
 * Measures the average range between high and low prices.
 */
export function calculateATR(data: TimeseriesPoint[], period: number = 14): number {
    if (data.length < 2) return 0;

    const trueRanges: number[] = [];

    for (let i = 0; i < data.length; i++) {
        const high = data[i].avgHighPrice ?? 0;
        const low = data[i].avgLowPrice ?? 0;

        if (i === 0) {
            // First period: just high - low
            trueRanges.push(high - low);
        } else {
            const prevClose = ((data[i - 1].avgHighPrice ?? 0) + (data[i - 1].avgLowPrice ?? 0)) / 2;

            // True Range is max of:
            // 1. Current High - Current Low
            // 2. |Current High - Previous Close|
            // 3. |Current Low - Previous Close|
            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );
            trueRanges.push(tr);
        }
    }

    // Calculate average of last 'period' true ranges
    const relevantRanges = trueRanges.slice(-period);
    if (relevantRanges.length === 0) return 0;

    return relevantRanges.reduce((a, b) => a + b, 0) / relevantRanges.length;
}

/**
 * Calculate Price Range Volatility.
 * Calculates volatility based on the high-low range as a percentage.
 */
export function calculatePriceRangeVolatility(data: TimeseriesPoint[]): number {
    if (data.length === 0) return 0;

    const rangePercentages: number[] = [];

    for (const point of data) {
        const high = point.avgHighPrice ?? 0;
        const low = point.avgLowPrice ?? 0;
        const mid = (high + low) / 2;

        if (mid > 0 && high > 0 && low > 0) {
            const rangePercent = ((high - low) / mid) * 100;
            rangePercentages.push(rangePercent);
        }
    }

    if (rangePercentages.length === 0) return 0;

    return rangePercentages.reduce((a, b) => a + b, 0) / rangePercentages.length;
}

/**
 * Calculate Margin Volatility.
 * Tracks how much an item's margin changes over time.
 */
export function calculateMarginVolatility(data: TimeseriesPoint[]): number {
    if (data.length < 2) return 0;

    const margins: number[] = [];

    for (const point of data) {
        const high = point.avgHighPrice ?? 0;
        const low = point.avgLowPrice ?? 0;
        if (high > 0 && low > 0) {
            margins.push(high - low);
        }
    }

    if (margins.length < 2) return 0;

    const mean = margins.reduce((a, b) => a + b, 0) / margins.length;
    if (mean === 0) return 0;

    const squaredDiffs = margins.map(m => Math.pow(m - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / margins.length;
    const stdDev = Math.sqrt(variance);

    // Return as coefficient of variation (percentage)
    return (stdDev / mean) * 100;
}

/**
 * Calculate Volume-Adjusted Price Volatility.
 * Combines price movements with trading volume for a more complete picture.
 * Higher volume during price changes = more significant volatility.
 */
export function calculateVolumeAdjustedVolatility(data: TimeseriesPoint[]): number {
    if (data.length < 2) return 0;

    let weightedVolatility = 0;
    let totalVolume = 0;

    for (let i = 1; i < data.length; i++) {
        const prevMid = ((data[i - 1].avgHighPrice ?? 0) + (data[i - 1].avgLowPrice ?? 0)) / 2;
        const currMid = ((data[i].avgHighPrice ?? 0) + (data[i].avgLowPrice ?? 0)) / 2;
        const volume = (data[i].highPriceVolume || 0) + (data[i].lowPriceVolume || 0);

        if (prevMid > 0 && currMid > 0) {
            const priceChange = Math.abs((currMid - prevMid) / prevMid) * 100;
            weightedVolatility += priceChange * volume;
            totalVolume += volume;
        }
    }

    if (totalVolume === 0) return 0;

    return weightedVolatility / totalVolume;
}

/**
 * Calculate overall volatility score (0-100) based on all metrics.
 */
export function calculateVolatilityScore(metrics: Omit<AdvancedVolatilityMetrics, 'volatilityScore' | 'volatilityClass'>): number {
    // Normalize each metric to 0-100 scale
    const stdDevScore = Math.min(100, metrics.stdDevReturns * 10);
    const atrScore = Math.min(100, (metrics.atr / 1000) * 100); // Normalize based on typical ATR values
    const rangeScore = Math.min(100, metrics.priceRangeVolatility * 10);
    const marginScore = Math.min(100, metrics.marginVolatility * 5);
    const volumeAdjScore = Math.min(100, metrics.volumeAdjustedVolatility * 20);

    // Weighted average
    const score = (
        stdDevScore * 0.25 +
        atrScore * 0.15 +
        rangeScore * 0.20 +
        marginScore * 0.20 +
        volumeAdjScore * 0.20
    );

    return Math.round(Math.min(100, score));
}

/**
 * Get volatility classification based on score.
 */
export function getVolatilityClass(score: number): 'low' | 'medium' | 'high' | 'extreme' {
    if (score < 25) return 'low';
    if (score < 50) return 'medium';
    if (score < 75) return 'high';
    return 'extreme';
}

/**
 * Calculate all advanced volatility metrics from timeseries data.
 */
export function calculateAdvancedVolatility(data: TimeseriesPoint[]): AdvancedVolatilityMetrics {
    const prices = data.map(d => {
        const high = d.avgHighPrice ?? 0;
        const low = d.avgLowPrice ?? 0;
        return high && low ? (high + low) / 2 : high || low || null;
    });

    const stdDevReturns = calculateStdDevReturns(prices);
    const atr = calculateATR(data);
    const priceRangeVolatility = calculatePriceRangeVolatility(data);
    const marginVolatility = calculateMarginVolatility(data);
    const volumeAdjustedVolatility = calculateVolumeAdjustedVolatility(data);

    const baseMetrics = {
        stdDevReturns,
        atr,
        priceRangeVolatility,
        marginVolatility,
        volumeAdjustedVolatility,
    };

    const volatilityScore = calculateVolatilityScore(baseMetrics);
    const volatilityClass = getVolatilityClass(volatilityScore);

    return {
        ...baseMetrics,
        volatilityScore,
        volatilityClass,
    };
}

// ============================================
// ADVANCED TECHNICAL INDICATORS
// ============================================

/**
 * Calculate Relative Strength Index (RSI)
 * @param data - Array of price changes
 * @param period - Number of periods (typically 14)
 */
export function calculateRSI(data: (number | null)[], period: number = 14): number[] {
    const result: number[] = [];
    const validData = data.map(v => v ?? 0);
    
    if (validData.length < period + 1) {
        return validData.map(() => 50); // Neutral RSI
    }

    const changes: number[] = [];
    for (let i = 1; i < validData.length; i++) {
        changes.push(validData[i] - validData[i - 1]);
    }

    let avgGain = 0;
    let avgLoss = 0;

    // Initial averages
    for (let i = 0; i < period; i++) {
        if (changes[i] > 0) {
            avgGain += changes[i];
        } else {
            avgLoss += Math.abs(changes[i]);
        }
    }
    avgGain /= period;
    avgLoss /= period;

    result.push(50); // Not enough data for first point

    for (let i = period; i < changes.length; i++) {
        const change = changes[i];
        
        avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
        avgLoss = (avgLoss * (period - 1) + (change < 0 ? Math.abs(change) : 0)) / period;

        if (avgLoss === 0) {
            result.push(100);
        } else {
            const rs = avgGain / avgLoss;
            const rsi = 100 - (100 / (1 + rs));
            result.push(rsi);
        }
    }

    return result;
}

/**
 * Calculate Bollinger Bands
 * @param data - Array of prices
 * @param period - Period for SMA (typically 20)
 * @param stdDev - Number of standard deviations (typically 2)
 */
export function calculateBollingerBands(
    data: (number | null)[], 
    period: number = 20, 
    stdDev: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
    const validData = data.map(v => v ?? 0);
    const middle = calculateSMA(data, period);
    const upper: number[] = [];
    const lower: number[] = [];

    for (let i = 0; i < validData.length; i++) {
        if (i < period - 1) {
            upper.push(0);
            lower.push(0);
        } else {
            const slice = validData.slice(i - period + 1, i + 1);
            const mean = slice.reduce((a, b) => a + b, 0) / period;
            
            // Calculate standard deviation
            const squaredDiffs = slice.map(x => Math.pow(x - mean, 2));
            const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
            const std = Math.sqrt(variance);
            
            upper.push(mean + (std * stdDev));
            lower.push(mean - (std * stdDev));
        }
    }

    return { upper, middle, lower };
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * @param data - Array of prices
 * @param fastPeriod - Fast EMA period (typically 12)
 * @param slowPeriod - Slow EMA period (typically 26)
 * @param signalPeriod - Signal line period (typically 9)
 */
export function calculateMACD(
    data: (number | null)[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
    const validData = data.map(v => v ?? 0);
    
    const fastEMA = calculateEMA(data, fastPeriod);
    const slowEMA = calculateEMA(data, slowPeriod);
    
    // MACD line = Fast EMA - Slow EMA
    const macd = fastEMA.map((fast, i) => {
        const slow = slowEMA[i];
        return fast - slow;
    });
    
    // Signal line = EMA of MACD
    const signal = calculateEMA(macd, signalPeriod);
    
    // Histogram = MACD - Signal
    const histogram = macd.map((macdVal, i) => {
        const signalVal = signal[i] || 0;
        return macdVal - signalVal;
    });

    return { macd, signal, histogram };
}