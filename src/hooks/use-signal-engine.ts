import { useMemo, useState } from 'react';
import { useTimeseries } from '@/hooks/use-osrs-query';
import { TimeStep } from '@/services/osrs-api';
import { calculateRSI, calculateSMA, calculateVolatility } from '@/lib/osrs-math';

export type RiskProfile = 'low' | 'medium' | 'high';
export type SignalAction = 'BUY' | 'SELL' | 'HOLD' | 'WAIT';

export interface SignalConfig {
    riskProfile: RiskProfile;
    flipIntervalMinutes: number; // e.g., 5, 10, 15, 60
}

export interface SignalResult {
    action: SignalAction;
    score: number; // 0-100
    confidence: number; // 0-100
    reasoning: string[];
    indicators: {
        rsi: number;
        trend: 'bullish' | 'bearish' | 'neutral';
        volatility: number;
    };
    isLoading: boolean;
}

export function useSignalEngine(itemId: number, config: SignalConfig): SignalResult {
    // Map minute interval to API timestep
    const timeStep: TimeStep = config.flipIntervalMinutes >= 60 ? '1h' : '5m';

    // Fetch specifically for the engine, independent of the chart to ensure logic validity
    const { data: history, isLoading } = useTimeseries(itemId, timeStep);

    return useMemo(() => {
        if (isLoading || !history || history.length < 50) {
            return {
                action: 'WAIT',
                score: 0,
                confidence: 0,
                reasoning: ['Gathering market data...'],
                indicators: { rsi: 50, trend: 'neutral', volatility: 0 },
                isLoading: true
            };
        }

        // --- PREPARE DATA ---
        // Use high/low avg for calculation
        const prices = history.map(h => (h.avgHighPrice + h.avgLowPrice) / 2).filter(p => p > 0);

        if (prices.length < 30) return { action: 'WAIT', score: 0, confidence: 0, reasoning: ['Insufficient history'], indicators: { rsi: 50, trend: 'neutral', volatility: 0 }, isLoading: false };

        const currentPrice = prices[prices.length - 1];

        // --- INDICATORS ---
        const rsiSeries = calculateRSI(prices, 14);
        const rsi = rsiSeries[rsiSeries.length - 1] || 50;

        const smaShort = calculateSMA(prices, 8); // Fast
        const smaLong = calculateSMA(prices, 20); // Slow

        const lastShort = smaShort[smaShort.length - 1] || 0;
        const lastLong = smaLong[smaLong.length - 1] || 0;

        const volatility = calculateVolatility(history[history.length - 1].avgHighPrice, history[history.length - 1].avgLowPrice);

        // --- LOGIC ENGINE ---
        let score = 50; // Base Neutral
        const reasons: string[] = [];

        // 1. RSI Logic
        let rsiBuyThreshold = 30;
        let rsiSellThreshold = 70;

        // Adjust thresholds based on Risk Profile
        if (config.riskProfile === 'high') {
            rsiBuyThreshold = 40; // Aggressive buy
            rsiSellThreshold = 80;
        } else if (config.riskProfile === 'low') {
            rsiBuyThreshold = 25; // Conservative
            rsiSellThreshold = 65;
        }

        if (rsi < rsiBuyThreshold) {
            score += 25;
            reasons.push(`RSI Oversold (${rsi.toFixed(0)})`);
        } else if (rsi > rsiSellThreshold) {
            score -= 25;
            reasons.push(`RSI Overbought (${rsi.toFixed(0)})`);
        }

        // 2. Trend Logic
        const isBullish = lastShort > lastLong;
        if (isBullish) {
            score += 15;
            // Confirmation: Price above SMA
            if (currentPrice > lastShort) score += 5;
        } else {
            score -= 15;
            if (currentPrice < lastShort) score -= 5;
        }

        // 3. Volatility Check
        // High volatility is good for flipping, but bad for trend following sometimes
        if (volatility > 2) {
            reasons.push('High Volatility');
            if (config.riskProfile === 'low') score -= 10; // Too risky for conservative
            else score += 10; // Good for aggressive
        }

        // --- DECISION ---
        let action: SignalAction = 'HOLD';
        let confidence = Math.abs(score - 50) * 2; // Distance from neutral
        confidence = Math.min(100, Math.max(0, confidence));

        if (score >= 75) action = 'BUY';
        else if (score <= 25) action = 'SELL';

        const trendLabel = isBullish ? 'bullish' : 'bearish';

        return {
            action,
            score,
            confidence: Math.round(confidence),
            reasoning: reasons.length ? reasons : ['Market is Neutral'],
            indicators: {
                rsi,
                trend: trendLabel,
                volatility
            },
            isLoading: false
        };

    }, [history, isLoading, config.riskProfile, config.flipIntervalMinutes]);
}
