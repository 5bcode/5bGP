import { useMemo } from 'react';
import { useTimeseries } from '@/hooks/use-osrs-query';
import { TimeStep, TimeSeriesPoint } from '@/services/osrs-api';
import { calculateRSI, calculateSMA, calculateEMA, calculateVolatility } from '@/lib/osrs-math';

// ============================================================================
// TYPES
// ============================================================================

export type RiskProfile = 'low' | 'medium' | 'high';
export type SignalAction = 'BUY' | 'SELL' | 'HOLD' | 'WAIT' | 'ACCUMULATE';
export type FrequencyMode = 'fast' | 'slow';

export interface SignalConfig {
    riskProfile: RiskProfile;
    flipIntervalMinutes: number; // 5 = fast/scalp, 60+ = slow/swing
}

export interface IndicatorData {
    rsi: number;
    trend: 'bullish' | 'bearish' | 'neutral';
    volatility: number;
    momentum: number; // -100 to 100
    anomalyDetected: boolean;
    priceVsBaseline: number; // % deviation from historical baseline
}

export interface RecommendedPrices {
    buyAt: number;
    sellAt: number;
    stopLoss: number;
    takeProfit: number;
}

export interface SignalResult {
    action: SignalAction;
    score: number; // 0-100
    confidence: number; // 0-100
    reasoning: string[];
    indicators: IndicatorData;
    prices: RecommendedPrices;
    frequencyMode: FrequencyMode;
    isLoading: boolean;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extracts valid mid-prices from timeseries, filtering nulls
 */
function extractPrices(history: TimeSeriesPoint[]): number[] {
    return history
        .filter(h => h.avgHighPrice && h.avgLowPrice)
        .map(h => ((h.avgHighPrice || 0) + (h.avgLowPrice || 0)) / 2);
}

/**
 * Calculates statistical properties of a price series
 */
function calculateStats(prices: number[]): { mean: number; stdDev: number; min: number; max: number } {
    if (prices.length === 0) return { mean: 0, stdDev: 0, min: 0, max: 0 };

    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const squaredDiffs = prices.map(p => Math.pow(p - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    return {
        mean,
        stdDev,
        min: Math.min(...prices),
        max: Math.max(...prices)
    };
}

/**
 * Calculates baseline from multiple lookback windows (3d, 7d, 30d weighted)
 * Returns weighted average baseline price
 */
function calculateMultiTimeframeBaseline(
    prices: number[],
    pointsPerDay: number // 288 for 5m, 24 for 1h, 4 for 6h
): { baseline: number; deviation: number; isAnomaly: boolean } {
    if (prices.length < 10) {
        return { baseline: prices[prices.length - 1] || 0, deviation: 0, isAnomaly: false };
    }

    const currentPrice = prices[prices.length - 1];

    // Calculate lookback windows (or use available data)
    const days3Points = Math.min(prices.length, pointsPerDay * 3);
    const days7Points = Math.min(prices.length, pointsPerDay * 7);
    const days30Points = Math.min(prices.length, pointsPerDay * 30);

    const recent3d = prices.slice(-days3Points);
    const recent7d = prices.slice(-days7Points);
    const recent30d = prices.slice(-days30Points);

    const stats3d = calculateStats(recent3d);
    const stats7d = calculateStats(recent7d);
    const stats30d = calculateStats(recent30d);

    // Weighted baseline: 50% 3-day, 30% 7-day, 20% 30-day
    const baseline = (stats3d.mean * 0.5) + (stats7d.mean * 0.3) + (stats30d.mean * 0.2);

    // Deviation from baseline
    const deviation = baseline > 0 ? ((currentPrice - baseline) / baseline) * 100 : 0;

    // Anomaly detection: price is > 2 standard deviations from 7-day mean
    const isAnomaly = Math.abs(currentPrice - stats7d.mean) > (stats7d.stdDev * 2.5);

    return { baseline, deviation, isAnomaly };
}

/**
 * Detects if current price is a pump/dump outlier
 */
function detectPumpDump(
    prices: number[],
    currentVolatility: number
): { isPumpDump: boolean; direction: 'pump' | 'dump' | 'none' } {
    if (prices.length < 20) return { isPumpDump: false, direction: 'none' };

    const recent = prices.slice(-5);
    const prior = prices.slice(-20, -5);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const priorAvg = prior.reduce((a, b) => a + b, 0) / prior.length;
    const priorStats = calculateStats(prior);

    // Calculate sudden move magnitude
    const movePercent = priorAvg > 0 ? ((recentAvg - priorAvg) / priorAvg) * 100 : 0;

    // Flash spike: >10% move in short window with high volatility
    const isPumpDump = Math.abs(movePercent) > 10 && currentVolatility > 5;

    return {
        isPumpDump,
        direction: movePercent > 10 ? 'pump' : movePercent < -10 ? 'dump' : 'none'
    };
}

/**
 * Calculates momentum using rate of change and EMA crossovers
 */
function calculateMomentum(prices: number[]): number {
    if (prices.length < 20) return 0;

    // Rate of change (10-period)
    const roc = ((prices[prices.length - 1] - prices[prices.length - 10]) / prices[prices.length - 10]) * 100;

    // EMA crossover momentum
    const emaFast = calculateEMA(prices, 8);
    const emaSlow = calculateEMA(prices, 21);

    if (emaFast.length === 0 || emaSlow.length === 0) return roc;

    const fastLast = emaFast[emaFast.length - 1];
    const slowLast = emaSlow[emaSlow.length - 1];

    // Combine ROC with EMA spread
    const emaMomentum = slowLast > 0 ? ((fastLast - slowLast) / slowLast) * 100 : 0;

    // Weighted combination
    return (roc * 0.4) + (emaMomentum * 0.6);
}

// ============================================================================
// STRATEGY ENGINES
// ============================================================================

interface StrategyResult {
    action: SignalAction;
    score: number;
    reasons: string[];
    buyAt: number;
    sellAt: number;
}

/**
 * FAST STRATEGY (5-minute scalping)
 * Focus: Real-time flipping, immediate volume/spread analysis
 */
function runFastStrategy(
    prices: number[],
    history: TimeSeriesPoint[],
    rsi: number,
    momentum: number,
    volatility: number,
    riskProfile: RiskProfile,
    isAnomaly: boolean
): StrategyResult {
    let score = 50;
    const reasons: string[] = [];

    // Get latest raw high/low for spread analysis
    const latest = history[history.length - 1];
    const rawHigh = latest?.avgHighPrice || 0;
    const rawLow = latest?.avgLowPrice || 0;
    const spread = rawHigh - rawLow;

    // Risk thresholds
    const thresholds = {
        low: { rsiBuy: 25, rsiSell: 75, minSpread: 0.02 },
        medium: { rsiBuy: 30, rsiSell: 70, minSpread: 0.015 },
        high: { rsiBuy: 40, rsiSell: 65, minSpread: 0.01 }
    }[riskProfile];

    // Skip anomalous data for conservative profiles
    if (isAnomaly && riskProfile !== 'high') {
        return {
            action: 'WAIT',
            score: 30,
            reasons: ['Anomaly detected - waiting for stable price'],
            buyAt: rawLow,
            sellAt: rawHigh
        };
    }

    // --- RSI SIGNALS ---
    if (rsi < thresholds.rsiBuy) {
        score += 25;
        reasons.push(`RSI Oversold (${rsi.toFixed(0)})`);
    } else if (rsi > thresholds.rsiSell) {
        score -= 25;
        reasons.push(`RSI Overbought (${rsi.toFixed(0)})`);
    }

    // --- MOMENTUM ---
    if (momentum > 2) {
        score += 10;
        reasons.push('Positive Momentum');
    } else if (momentum < -2) {
        score -= 10;
        reasons.push('Negative Momentum');
    }

    // --- SPREAD/VOLATILITY ---
    const spreadPercent = rawLow > 0 ? spread / rawLow : 0;
    if (spreadPercent > thresholds.minSpread) {
        score += 15;
        reasons.push(`Good Spread (${(spreadPercent * 100).toFixed(2)}%)`);
    } else if (spreadPercent < 0.005) {
        score -= 20;
        reasons.push('Spread Too Thin');
    }

    // --- VOLUME ANALYSIS ---
    const recentVolume = history.slice(-6).reduce((sum, h) => sum + h.highPriceVolume + h.lowPriceVolume, 0);
    const priorVolume = history.slice(-12, -6).reduce((sum, h) => sum + h.highPriceVolume + h.lowPriceVolume, 0);

    if (recentVolume > priorVolume * 1.5) {
        score += 10;
        reasons.push('Volume Surge');
    } else if (recentVolume < priorVolume * 0.5) {
        score -= 10;
        reasons.push('Volume Declining');
    }

    // Determine action
    let action: SignalAction = 'HOLD';
    if (score >= 75) action = 'BUY';
    else if (score <= 25) action = 'SELL';

    // Adjust prices: buy slightly above low, sell slightly below high
    const buyAt = Math.ceil(rawLow * 1.001);
    const sellAt = Math.floor(rawHigh * 0.999);

    return { action, score, reasons, buyAt, sellAt };
}

/**
 * SLOW STRATEGY (6-hour swing trading)
 * Focus: Patient accumulation, crash recovery, baseline deviation
 */
function runSlowStrategy(
    prices: number[],
    history: TimeSeriesPoint[],
    rsi: number,
    momentum: number,
    baselineDeviation: number,
    riskProfile: RiskProfile,
    isAnomaly: boolean,
    pumpDump: { isPumpDump: boolean; direction: 'pump' | 'dump' | 'none' }
): StrategyResult {
    let score = 50;
    const reasons: string[] = [];

    const latest = history[history.length - 1];
    const rawHigh = latest?.avgHighPrice || 0;
    const rawLow = latest?.avgLowPrice || 0;
    const currentPrice = prices[prices.length - 1];

    // Swing thresholds based on risk
    const thresholds = {
        low: { deviationBuy: -10, deviationSell: 5, rsiBuy: 25, rsiSell: 70 },
        medium: { deviationBuy: -7, deviationSell: 7, rsiBuy: 30, rsiSell: 70 },
        high: { deviationBuy: -5, deviationSell: 10, rsiBuy: 35, rsiSell: 65 }
    }[riskProfile];

    // --- CRASH DETECTION (Key for swing) ---
    if (baselineDeviation < thresholds.deviationBuy) {
        score += 30;
        reasons.push(`Crashed ${Math.abs(baselineDeviation).toFixed(1)}% below baseline`);

        // Extra boost if not a pump/dump
        if (!pumpDump.isPumpDump) {
            score += 10;
            reasons.push('Organic decline - recovery likely');
        }
    } else if (baselineDeviation > thresholds.deviationSell) {
        score -= 25;
        reasons.push(`${baselineDeviation.toFixed(1)}% above baseline - overbought`);
    }

    // --- RSI (Lower weight for swing) ---
    if (rsi < thresholds.rsiBuy) {
        score += 15;
        reasons.push(`RSI Oversold (${rsi.toFixed(0)})`);
    } else if (rsi > thresholds.rsiSell) {
        score -= 15;
        reasons.push(`RSI Overbought (${rsi.toFixed(0)})`);
    }

    // --- PUMP/DUMP FILTER ---
    if (pumpDump.isPumpDump) {
        if (pumpDump.direction === 'dump' && riskProfile !== 'low') {
            // Dump can be opportunity for aggressive
            score += 10;
            reasons.push('Flash crash detected - potential entry');
        } else if (pumpDump.direction === 'pump') {
            score -= 20;
            reasons.push('Pump detected - avoid');
        }
    }

    // --- TREND CONFIRMATION ---
    const smaShort = calculateSMA(prices, 12);
    const smaLong = calculateSMA(prices, 48);

    if (smaShort.length > 0 && smaLong.length > 0) {
        const shortLast = smaShort[smaShort.length - 1];
        const longLast = smaLong[smaLong.length - 1];

        if (shortLast > longLast && currentPrice > shortLast) {
            score += 10;
            reasons.push('Trend Recovering');
        } else if (shortLast < longLast && currentPrice < shortLast) {
            // Still declining - might be early
            if (baselineDeviation < -15) {
                reasons.push('Deep value territory');
            } else {
                score -= 5;
            }
        }
    }

    // Determine action
    let action: SignalAction = 'HOLD';
    if (score >= 80) action = 'ACCUMULATE';
    else if (score >= 70) action = 'BUY';
    else if (score <= 25) action = 'SELL';

    // Swing prices: target recovery levels
    const buyAt = Math.ceil(rawLow * 0.995); // Slightly aggressive
    const sellAt = Math.floor(rawHigh * 1.02); // Wait for higher recovery

    return { action, score, reasons, buyAt, sellAt };
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useSignalEngine(itemId: number, config: SignalConfig): SignalResult {
    // Determine frequency mode and timestep based on interval
    // 5m, 30m = fast (scalping) with 5m data
    // 2h, 8h = slow (swing) with 1h or 6h data
    const frequencyMode: FrequencyMode = config.flipIntervalMinutes >= 120 ? 'slow' : 'fast';

    // Map interval to appropriate API timestep
    let timeStep: TimeStep;
    let pointsPerDay: number;

    if (config.flipIntervalMinutes >= 480) {
        // 8h+ = use 6h candles for swing trading
        timeStep = '6h';
        pointsPerDay = 4;
    } else if (config.flipIntervalMinutes >= 120) {
        // 2h-8h = use 1h candles
        timeStep = '1h';
        pointsPerDay = 24;
    } else {
        // 5m-30m = use 5m candles for scalping
        timeStep = '5m';
        pointsPerDay = 288;
    }

    // Fetch data with correct timestep
    const { data: history, isLoading } = useTimeseries(itemId, timeStep);

    return useMemo(() => {
        // --- LOADING STATE ---
        if (isLoading || !history || history.length < 30) {
            return {
                action: 'WAIT',
                score: 0,
                confidence: 0,
                reasoning: ['Gathering market data...'],
                indicators: {
                    rsi: 50,
                    trend: 'neutral',
                    volatility: 0,
                    momentum: 0,
                    anomalyDetected: false,
                    priceVsBaseline: 0
                },
                prices: { buyAt: 0, sellAt: 0, stopLoss: 0, takeProfit: 0 },
                frequencyMode,
                isLoading: true
            };
        }

        // --- EXTRACT & VALIDATE DATA ---
        const prices = extractPrices(history);
        if (prices.length < 20) {
            return {
                action: 'WAIT',
                score: 0,
                confidence: 0,
                reasoning: ['Insufficient price history'],
                indicators: {
                    rsi: 50,
                    trend: 'neutral',
                    volatility: 0,
                    momentum: 0,
                    anomalyDetected: false,
                    priceVsBaseline: 0
                },
                prices: { buyAt: 0, sellAt: 0, stopLoss: 0, takeProfit: 0 },
                frequencyMode,
                isLoading: false
            };
        }

        const currentPrice = prices[prices.length - 1];
        const latest = history[history.length - 1];

        // --- CALCULATE INDICATORS ---
        const rsiSeries = calculateRSI(prices, 14);
        const rsi = rsiSeries[rsiSeries.length - 1] ?? 50;

        const volatility = calculateVolatility(latest.avgHighPrice || 0, latest.avgLowPrice || 0);
        const momentum = calculateMomentum(prices);

        // Baseline analysis
        const { baseline, deviation, isAnomaly } = calculateMultiTimeframeBaseline(prices, pointsPerDay);

        // Pump/Dump detection
        const pumpDump = detectPumpDump(prices, volatility);

        // Trend detection
        const smaShort = calculateSMA(prices, 8);
        const smaLong = calculateSMA(prices, 20);
        const shortLast = smaShort[smaShort.length - 1] || currentPrice;
        const longLast = smaLong[smaLong.length - 1] || currentPrice;
        const trend: 'bullish' | 'bearish' | 'neutral' =
            shortLast > longLast * 1.01 ? 'bullish' :
                shortLast < longLast * 0.99 ? 'bearish' : 'neutral';

        // --- RUN APPROPRIATE STRATEGY ---
        let strategyResult: StrategyResult;

        if (frequencyMode === 'fast') {
            strategyResult = runFastStrategy(
                prices, history, rsi, momentum, volatility,
                config.riskProfile, isAnomaly
            );
        } else {
            strategyResult = runSlowStrategy(
                prices, history, rsi, momentum, deviation,
                config.riskProfile, isAnomaly, pumpDump
            );
        }

        // --- CALCULATE CONFIDENCE ---
        let confidence = Math.abs(strategyResult.score - 50) * 2;

        // Reduce confidence if anomaly detected
        if (isAnomaly) confidence *= 0.7;

        // Reduce confidence if pump/dump
        if (pumpDump.isPumpDump) confidence *= 0.8;

        confidence = Math.min(100, Math.max(0, Math.round(confidence)));

        // --- CALCULATE STOP/TARGET ---
        const stopLoss = Math.floor(strategyResult.buyAt * (config.riskProfile === 'low' ? 0.97 : 0.95));
        const takeProfit = Math.ceil(strategyResult.sellAt * (frequencyMode === 'slow' ? 1.1 : 1.02));

        return {
            action: strategyResult.action,
            score: strategyResult.score,
            confidence,
            reasoning: strategyResult.reasons.length ? strategyResult.reasons : ['Market is Neutral'],
            indicators: {
                rsi,
                trend,
                volatility,
                momentum: Math.round(momentum * 10) / 10,
                anomalyDetected: isAnomaly || pumpDump.isPumpDump,
                priceVsBaseline: Math.round(deviation * 10) / 10
            },
            prices: {
                buyAt: strategyResult.buyAt,
                sellAt: strategyResult.sellAt,
                stopLoss,
                takeProfit
            },
            frequencyMode,
            isLoading: false
        };

    }, [history, isLoading, config.riskProfile, frequencyMode, pointsPerDay]);
}
