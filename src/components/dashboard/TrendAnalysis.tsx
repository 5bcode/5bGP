import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { osrsApi, TimeSeriesPoint } from '@/services/osrs-api';
import { TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, LineChart } from 'lucide-react';
import { formatGP } from '@/lib/osrs-math';

interface TrendAnalysisProps {
    itemId: number;
}

export const TrendAnalysis = ({ itemId }: TrendAnalysisProps) => {
    const [data, setData] = useState<TimeSeriesPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                // Fetch 1h data (returns reasonably long history, we slice last 3 days = 72h)
                const result = await osrsApi.getTimeseries(itemId, '1h');
                if (!cancelled) {
                    // Get last 72 points (3 days)
                    const last3Days = result.slice(-72);
                    setData(last3Days);
                    setError(false);
                }
            } catch (e) {
                console.error("Failed to fetch trend data", e);
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        if (itemId) fetchHistory();
        return () => { cancelled = true; };
    }, [itemId]);

    const analysis = useMemo(() => {
        if (data.length < 10) return null;

        const prices = data.map(d => d.avgHighPrice || d.avgLowPrice || 0).filter(p => p > 0);
        if (prices.length === 0) return null;

        const current = prices[prices.length - 1];
        const start = prices[0];
        const max = Math.max(...prices);
        const min = Math.min(...prices);

        // 1. Trend Direction (Simple Start vs End)
        const changePercent = ((current - start) / start) * 100;

        // 2. Position in Rage (Stochastic-like)
        // 0 = at bottom, 1 = at top
        const range = max - min;
        const position = range > 0 ? (current - min) / range : 0.5;

        // 3. Volatility (StdDev relative to mean)
        const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
        const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
        const stdDev = Math.sqrt(variance);
        const volatility = (stdDev / mean) * 100;

        // 4. Flip Score / Buy Rating calculation
        // We want: High Volatility + Low Position in Range (Mean Reversion) + Not Crashing Hard
        let score = 50;

        // Position Factor: Lower is better for buying (Buy Low)
        if (position < 0.2) score += 30; // Strong buy zone
        else if (position < 0.4) score += 15;
        else if (position > 0.8) score -= 20; // High risk top
        else if (position > 0.6) score -= 10;

        // Volatility Factor: We need swings to flip
        if (volatility > 2) score += 10; // Good variance
        else if (volatility < 0.5) score -= 10; // Too stable/flat

        // Trend Factor: Don't buy a falling knife?
        // Actually for flipping we often fade the trend, but let's be safe.
        // If trending UP strongly -> Momentum Buy
        if (changePercent > 10) score += 5;
        else if (changePercent < -10) score -= 15; // Crashing

        const riskLevel = volatility > 5 ? 'High' : volatility > 2 ? 'Medium' : 'Low';
        const trendAction = changePercent > 0 ? 'Uptrend' : 'Downtrend';

        return {
            score: Math.min(100, Math.max(0, score)),
            changePercent,
            position,
            volatility,
            riskLevel,
            trendAction,
            min,
            max
        };
    }, [data]);

    if (isLoading) return <Card className="p-4 bg-slate-900 border-slate-800 h-24 animate-pulse" />;
    if (error || !analysis) return null;

    let RecommendationIcon = Minus;
    let recColor = 'text-slate-400';
    let recommendation = 'Hold';

    if (analysis.score >= 75) {
        RecommendationIcon = TrendingUp;
        recColor = 'text-emerald-400';
        recommendation = 'Strong Buy';
    } else if (analysis.score >= 60) {
        RecommendationIcon = Activity;
        recColor = 'text-emerald-300';
        recommendation = 'Buy / Swing';
    } else if (analysis.score <= 30) {
        RecommendationIcon = AlertTriangle;
        recColor = 'text-rose-400';
        recommendation = 'High Risk / Wait';
    } else if (analysis.score <= 45) {
        RecommendationIcon = TrendingDown;
        recColor = 'text-amber-400';
        recommendation = 'Sell / Avoid';
    }

    return (
        <Card className="p-4 bg-slate-900 border-slate-800 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
                <LineChart size={16} className="text-cyan-500" />
                <h4 className="text-slate-200 font-semibold text-sm">3-Day Trend Risk</h4>
            </div>

            <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                    <span className="text-xs text-slate-500 uppercase tracking-wide">Flip Score</span>
                    <span className={`text-2xl font-bold font-mono ${recColor}`}>{Math.round(analysis.score)}/100</span>
                </div>
                <div className={`px-3 py-1.5 rounded bg-slate-800 border border-slate-700 flex items-center gap-2`}>
                    <RecommendationIcon size={16} className={recColor} />
                    <span className={`text-sm font-bold ${recColor}`}>{recommendation}</span>
                </div>
            </div>

            <div className="space-y-3 flex-1 text-sm">
                <div className="flex justify-between items-center">
                    <span className="text-slate-400">Trend (3d)</span>
                    <span className={`font-mono font-medium ${analysis.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {analysis.changePercent > 0 ? '+' : ''}{analysis.changePercent.toFixed(2)}%
                    </span>
                </div>

                {/* Range Bar */}
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>Low: {formatGP(analysis.min)}</span>
                        <span>High: {formatGP(analysis.max)}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative">
                        <div
                            className="absolute top-0 bottom-0 w-2 h-2 bg-slate-200 rounded-full border border-slate-950 shadow transition-all duration-500"
                            style={{ left: `calc(${analysis.position * 100}% - 4px)` }}
                            title="Current Price Position"
                        />
                        <div
                            className={`h-full opacity-30 ${analysis.changePercent >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="text-center text-[10px] text-slate-600">
                        Current Position: {(analysis.position * 100).toFixed(0)}% of Range
                    </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                    <span className="text-slate-400">Volatility Risk</span>
                    <span className={`font-medium ${analysis.riskLevel === 'High' ? 'text-rose-400' : analysis.riskLevel === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {analysis.riskLevel}
                    </span>
                </div>
            </div>
        </Card>
    );
};
