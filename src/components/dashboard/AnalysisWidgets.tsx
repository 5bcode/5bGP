import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Item, PriceData, Stats24h } from '@/services/osrs-api';
import { formatGP, calculateMargin, calculateVolatility, calculateTax } from '@/lib/osrs-math';
import {
    TrendingUp, TrendingDown, Activity, AlertTriangle, CheckCircle2,
    Clock, Zap, Target, Shield, Flame, Coins, BarChart3, Minus
} from 'lucide-react';

interface AnalysisWidgetProps {
    item: Item;
    price: PriceData;
    stats?: Stats24h;
}

// Utility: Confidence Circle with animation
const ConfidenceCircle = ({ score, size = 'lg' }: { score: number; size?: 'sm' | 'lg' }) => {
    const radius = size === 'lg' ? 40 : 24;
    const strokeWidth = size === 'lg' ? 8 : 5;
    const dimension = (radius + strokeWidth) * 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

    let color = 'text-emerald-500';
    let bgColor = 'text-emerald-500/20';
    if (score < 40) {
        color = 'text-rose-500';
        bgColor = 'text-rose-500/20';
    } else if (score < 70) {
        color = 'text-amber-500';
        bgColor = 'text-amber-500/20';
    }

    return (
        <div className="relative flex items-center justify-center" style={{ width: dimension, height: dimension }}>
            <svg className="transform -rotate-90" width={dimension} height={dimension}>
                <circle
                    cx={dimension / 2}
                    cy={dimension / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    className={bgColor}
                />
                <circle
                    cx={dimension / 2}
                    cy={dimension / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className={`${color} transition-all duration-1000 ease-out`}
                />
            </svg>
            <span className={`absolute font-bold ${color} ${size === 'lg' ? 'text-xl' : 'text-sm'}`}>
                {Math.round(score)}%
            </span>
        </div>
    );
};

// Smart Trade Analysis - Data-driven strategy recommendations
export const SmartAnalysis = ({ item, price, stats }: AnalysisWidgetProps) => {
    const analysis = useMemo(() => {
        const { net, roi } = calculateMargin(price.low, price.high);
        const volatility = calculateVolatility(price.high, price.low);
        const volume = stats ? stats.highPriceVolume + stats.lowPriceVolume : 0;
        const limit = item.limit || 1;

        // Calculate confidence score based on multiple factors
        let confidenceScore = 50;
        let strategy = 'Hold';
        let reason = 'Neutral market conditions.';
        let strategyColor = 'text-slate-400';
        let Icon = Minus;

        // ROI Factor (max 25 points)
        if (roi > 5) confidenceScore += 25;
        else if (roi > 2) confidenceScore += 15;
        else if (roi > 0.5) confidenceScore += 5;
        else if (roi < 0) confidenceScore -= 20;

        // Volume Factor (max 15 points)
        const volumePerLimit = volume / limit;
        if (volumePerLimit > 10) confidenceScore += 15;
        else if (volumePerLimit > 5) confidenceScore += 10;
        else if (volumePerLimit > 1) confidenceScore += 5;
        else confidenceScore -= 10;

        // Volatility Factor (moderate volatility is good)
        if (volatility >= 10 && volatility <= 30) confidenceScore += 10;
        else if (volatility > 50) confidenceScore -= 15;

        // Determine strategy based on score
        if (confidenceScore >= 75) {
            strategy = 'Strong Buy';
            reason = `High ROI (${roi.toFixed(1)}%) with good volume. Excellent flip opportunity.`;
            strategyColor = 'text-emerald-400';
            Icon = TrendingUp;
        } else if (confidenceScore >= 60) {
            strategy = 'Buy & Flip';
            reason = `Decent margin with ${volumePerLimit.toFixed(0)}x limit coverage. Good for active trading.`;
            strategyColor = 'text-emerald-400';
            Icon = Zap;
        } else if (confidenceScore >= 45) {
            strategy = 'Hold / Monitor';
            reason = 'Moderate opportunity. Watch for better entry or increased volume.';
            strategyColor = 'text-amber-400';
            Icon = Clock;
        } else if (confidenceScore >= 30) {
            strategy = 'Avoid';
            reason = 'Low margin or poor liquidity. Risk outweighs potential reward.';
            strategyColor = 'text-rose-400';
            Icon = Shield;
        } else {
            strategy = 'Do Not Trade';
            reason = 'Unfavorable conditions. Negative margin or extremely low volume.';
            strategyColor = 'text-rose-500';
            Icon = AlertTriangle;
        }

        return { confidenceScore: Math.min(100, Math.max(0, confidenceScore)), strategy, reason, strategyColor, Icon, roi, volumePerLimit };
    }, [item, price, stats]);

    return (
        <Card className="p-4 bg-slate-900 border-slate-800 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
                <Activity size={16} className="text-emerald-500" />
                <h4 className="text-slate-200 font-semibold text-sm">Smart Analysis</h4>
            </div>

            <div className="flex items-center gap-4 flex-1">
                <ConfidenceCircle score={analysis.confidenceScore} />
                <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                        <analysis.Icon size={16} className={analysis.strategyColor} />
                        <p className={`text-lg font-bold ${analysis.strategyColor}`}>{analysis.strategy}</p>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{analysis.reason}</p>
                    <div className="flex gap-3 mt-2 text-xs">
                        <span className="text-slate-400">ROI: <span className="text-slate-200 font-mono">{analysis.roi.toFixed(1)}%</span></span>
                        <span className="text-slate-400">Vol/Limit: <span className="text-slate-200 font-mono">{analysis.volumePerLimit.toFixed(1)}x</span></span>
                    </div>
                </div>
            </div>
        </Card>
    );
};

// Algorithmic Forecast - Price movement predictions
export const AlgorithmicForecast = ({ item, price, stats }: AnalysisWidgetProps) => {
    const forecast = useMemo(() => {
        if (!stats) return null;

        const currentPrice = price.high;
        const avgPrice = stats.avgHighPrice || currentPrice;
        const deviation = ((currentPrice - avgPrice) / avgPrice) * 100;

        // Simple RSI-like calculation (based on price vs average)
        const rsi = 50 + (deviation * 2);
        const clampedRsi = Math.min(100, Math.max(0, rsi));

        // Support/Resistance based on spread
        const support = Math.round(price.low * 0.95);
        const resistance = Math.round(price.high * 1.05);

        // Trend determination
        let trend = 'Neutral';
        let trendColor = 'text-slate-400';
        let trendBg = 'bg-slate-500/10 border-slate-500/20';
        let TrendIcon = Minus;
        let trendDesc = 'Price is stable around average.';

        if (deviation > 3) {
            trend = 'Overbought';
            trendColor = 'text-rose-400';
            trendBg = 'bg-rose-500/10 border-rose-500/20';
            TrendIcon = TrendingDown;
            trendDesc = 'Price above average. Potential pullback expected.';
        } else if (deviation < -3) {
            trend = 'Oversold';
            trendColor = 'text-emerald-400';
            trendBg = 'bg-emerald-500/10 border-emerald-500/20';
            TrendIcon = TrendingUp;
            trendDesc = 'Price below average. Recovery opportunity.';
        } else if (deviation > 0) {
            trend = 'Bullish';
            trendColor = 'text-emerald-400';
            trendBg = 'bg-emerald-500/10 border-emerald-500/20';
            TrendIcon = TrendingUp;
            trendDesc = 'Momentum building upward.';
        } else if (deviation < 0) {
            trend = 'Bearish';
            trendColor = 'text-rose-400';
            trendBg = 'bg-rose-500/10 border-rose-500/20';
            TrendIcon = TrendingDown;
            trendDesc = 'Downward pressure on price.';
        }

        return { rsi: clampedRsi, support, resistance, trend, trendColor, trendBg, TrendIcon, trendDesc, deviation };
    }, [price, stats]);

    if (!forecast) {
        return (
            <Card className="p-4 bg-slate-900 border-slate-800 flex items-center justify-center h-full">
                <p className="text-slate-500 text-sm">Loading forecast data...</p>
            </Card>
        );
    }

    return (
        <Card className="p-4 bg-slate-900 border-slate-800 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={16} className="text-blue-500" />
                <h4 className="text-slate-200 font-semibold text-sm">Price Forecast</h4>
            </div>

            <div className={`${forecast.trendBg} border p-3 rounded-lg mb-3 flex items-center gap-3`}>
                <forecast.TrendIcon size={20} className={forecast.trendColor} />
                <div>
                    <p className={`${forecast.trendColor} font-bold text-sm`}>{forecast.trend}</p>
                    <p className="text-slate-500 text-xs">{forecast.trendDesc}</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 flex-1">
                <div className="bg-slate-950 p-2 rounded text-center border border-slate-800 flex flex-col justify-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">RSI</p>
                    <p className={`font-mono font-bold ${forecast.rsi > 70 ? 'text-rose-400' :
                            forecast.rsi < 30 ? 'text-emerald-400' : 'text-slate-200'
                        }`}>{forecast.rsi.toFixed(0)}</p>
                </div>
                <div className="bg-slate-950 p-2 rounded text-center border border-slate-800 flex flex-col justify-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">Support</p>
                    <p className="text-emerald-400 font-mono font-bold">{formatGP(forecast.support)}</p>
                </div>
                <div className="bg-slate-950 p-2 rounded text-center border border-slate-800 flex flex-col justify-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">Resist</p>
                    <p className="text-rose-400 font-mono font-bold">{formatGP(forecast.resistance)}</p>
                </div>
            </div>
        </Card>
    );
};

// Arbitrage Check - High Alch profitability
export const ArbitrageCheck = ({ item, price }: AnalysisWidgetProps) => {
    const analysis = useMemo(() => {
        const highAlch = item.highalch || 0;
        const natRunePrice = 105; // Approximate stable price
        const buyPrice = price.low;

        const alchProfit = highAlch - buyPrice - natRunePrice;
        const isProfitable = alchProfit > 0;
        const profitMargin = buyPrice > 0 ? (alchProfit / buyPrice) * 100 : 0;

        // Break-even calculation
        const breakEvenBuy = highAlch - natRunePrice;

        return { highAlch, natRunePrice, buyPrice, alchProfit, isProfitable, profitMargin, breakEvenBuy };
    }, [item, price]);

    return (
        <Card className="p-4 bg-slate-900 border-slate-800 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
                <Flame size={16} className="text-orange-500" />
                <h4 className="text-slate-200 font-semibold text-sm">High Alchemy</h4>
            </div>

            <div className="space-y-2 text-sm flex-1">
                <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1.5">
                        <Coins size={12} /> Alch Value
                    </span>
                    <span className="text-amber-400 font-mono font-medium">{formatGP(analysis.highAlch)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-slate-400">Buy Price</span>
                    <span className="text-slate-200 font-mono">{formatGP(analysis.buyPrice)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-slate-400">Nature Rune</span>
                    <span className="text-slate-200 font-mono">-{formatGP(analysis.natRunePrice)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-800 pt-2 mt-1">
                    <span className="text-slate-300 font-medium">Net Profit</span>
                    <span className={`font-mono font-bold text-lg ${analysis.isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {analysis.isProfitable ? '+' : ''}{formatGP(analysis.alchProfit)}
                    </span>
                </div>
            </div>

            {analysis.isProfitable ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded flex items-center gap-2 mt-3">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <p className="text-xs text-emerald-300">
                        Profitable! {analysis.profitMargin.toFixed(1)}% margin per alch.
                    </p>
                </div>
            ) : (
                <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded flex items-center gap-2 mt-3">
                    <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                    <p className="text-xs text-rose-300">
                        {analysis.breakEvenBuy > 50
                            ? `Not profitable. Buy below ${formatGP(analysis.breakEvenBuy)} to profit.`
                            : `Item value too low for Alchemy.`}
                    </p>
                </div>
            )}
        </Card>
    );
};

// Margin Breakdown - Visual profit analysis
export const MarginBreakdown = ({ price }: { price: PriceData }) => {
    const margin = useMemo(() => {
        const { net, roi, tax } = calculateMargin(price.low, price.high);
        const total = price.high;

        // Calculate percentages for visual bars
        // If net is negative (loss), we handle visualization differently
        const isLoss = net < 0;

        const buyPercent = total > 0 ? (price.low / total) * 100 : 0;
        const taxPercent = total > 0 ? (tax / total) * 100 : 0;
        const profitPercent = total > 0 ? (Math.max(0, net) / total) * 100 : 0;

        return { net, roi, tax, buyPercent, taxPercent, profitPercent, isLoss };
    }, [price]);

    return (
        <Card className="p-4 bg-slate-900 border-slate-800 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
                <Target size={16} className="text-purple-500" />
                <h4 className="text-slate-200 font-semibold text-sm">Margin Breakdown</h4>
            </div>

            {/* Stacked Bar */}
            <div className="flex-1 flex flex-col justify-center gap-3">
                <div className="h-8 rounded-lg overflow-hidden flex bg-slate-800 relative">
                    {/* Background track for context */}
                    <div className="absolute inset-0 bg-slate-800/50" />

                    {margin.isLoss ? (
                        /* Loss Visualization: Full red bar with warning striping */
                        <div className="w-full h-full bg-rose-500/20 flex items-center justify-center border border-rose-500/50 rounded-lg">
                            <span className="text-xs font-bold text-rose-400">NEGATIVE MARGIN</span>
                        </div>
                    ) : (
                        /* Standard Profit Visualization */
                        <>
                            <div
                                className="bg-slate-600 transition-all duration-500 z-10"
                                style={{ width: `${margin.buyPercent}%` }}
                                title="Buy Cost"
                            />
                            <div
                                className="bg-rose-500/70 transition-all duration-500 z-10"
                                style={{ width: `${margin.taxPercent}%` }}
                                title="Tax"
                            />
                            <div
                                className="bg-emerald-500 transition-all duration-500 z-10"
                                style={{ width: `${margin.profitPercent}%` }}
                                title="Profit"
                            />
                        </>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-slate-600 rounded"></span>
                        <span className="text-slate-400">Buy</span>
                        <span className="text-slate-200 font-mono ml-auto">{formatGP(price.low)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-rose-500/70 rounded"></span>
                        <span className="text-slate-400">Tax</span>
                        <span className="text-rose-400 font-mono ml-auto">{formatGP(margin.tax)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded ${margin.isLoss ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                        <span className="text-slate-400">Net</span>
                        <span className={`${margin.isLoss ? 'text-rose-400' : 'text-emerald-400'} font-mono ml-auto`}>
                            {formatGP(margin.net)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800 mt-3">
                <span className="text-slate-400 text-xs">Return on Investment</span>
                <span className={`font-mono font-bold ${margin.roi > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {margin.roi > 0 ? '+' : ''}{margin.roi.toFixed(2)}%
                </span>
            </div>
        </Card>
    );
};
