import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useSignalSettings } from '@/contexts/useSignalSettings';
import { useSignalEngine, SignalConfig, FrequencyMode } from '@/hooks/use-signal-engine';
import { formatGP } from '@/lib/osrs-math';
import {
    Activity, TrendingUp, TrendingDown, AlertCircle, Crosshair,
    ChevronDown, ChevronUp, Zap, Clock, AlertTriangle
} from 'lucide-react';
import SignalSettingsPanel from './SignalSettingsPanel';

interface SignalWidgetProps {
    itemId: number;
}

type ExpandedIndicator = 'trend' | 'rsi' | 'vol' | 'momentum' | null;

const SignalWidget = ({ itemId }: SignalWidgetProps) => {
    const [expanded, setExpanded] = useState<ExpandedIndicator>(null);
    const [showSettings, setShowSettings] = useState(false);

    // Use global settings
    const { settings } = useSignalSettings();

    const config: SignalConfig = {
        riskProfile: settings.riskLevel,
        flipIntervalMinutes: settings.frequencyMinutes
    };

    const signal = useSignalEngine(itemId, config);
    const { action, confidence, indicators, reasoning, prices, frequencyMode, isLoading } = signal;

    // Color logic
    const getActionColor = () => {
        if (action === 'BUY' || action === 'ACCUMULATE') return 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10';
        if (action === 'SELL') return 'text-rose-400 border-rose-500/50 bg-rose-500/10';
        return 'text-amber-400 border-amber-500/50 bg-amber-500/10';
    };

    const getScoreColor = () => {
        if (action === 'BUY' || action === 'ACCUMULATE') return 'bg-emerald-500';
        if (action === 'SELL') return 'bg-rose-500';
        return 'bg-amber-500';
    };

    const toggleExpand = (ind: ExpandedIndicator) => {
        setExpanded(prev => prev === ind ? null : ind);
    };

    // Signal explanations for each indicator
    const getIndicatorSignal = (ind: ExpandedIndicator) => {
        if (ind === 'trend') {
            if (indicators.trend === 'bullish') return { signal: 'BUY', color: 'text-emerald-400', desc: 'Short-term MA above long-term. Momentum is upward.' };
            if (indicators.trend === 'bearish') return { signal: 'SELL', color: 'text-rose-400', desc: 'Short-term MA below long-term. Downward pressure.' };
            return { signal: 'HOLD', color: 'text-amber-400', desc: 'No clear directional trend. Sideways market.' };
        }
        if (ind === 'rsi') {
            if (indicators.rsi < 30) return { signal: 'BUY', color: 'text-emerald-400', desc: `RSI at ${indicators.rsi.toFixed(0)} = Oversold. High bounce probability.` };
            if (indicators.rsi > 70) return { signal: 'SELL', color: 'text-rose-400', desc: `RSI at ${indicators.rsi.toFixed(0)} = Overbought. Pullback likely.` };
            return { signal: 'HOLD', color: 'text-amber-400', desc: `RSI at ${indicators.rsi.toFixed(0)} = Neutral zone.` };
        }
        if (ind === 'vol') {
            const riskLevel = settings.riskLevel;
            if (indicators.volatility > 5) return { signal: riskLevel === 'low' ? 'AVOID' : 'TRADE', color: riskLevel === 'low' ? 'text-rose-400' : 'text-emerald-400', desc: `${indicators.volatility.toFixed(1)}% spread. ${riskLevel === 'low' ? 'Too volatile for conservative.' : 'Great flip opportunity.'}` };
            if (indicators.volatility > 1.5) return { signal: 'TRADE', color: 'text-amber-400', desc: `${indicators.volatility.toFixed(1)}% spread. Moderate opportunity.` };
            return { signal: 'WAIT', color: 'text-slate-400', desc: `${indicators.volatility.toFixed(1)}% spread too thin.` };
        }
        if (ind === 'momentum') {
            if (indicators.momentum > 3) return { signal: 'BUY', color: 'text-emerald-400', desc: `Strong upward momentum (+${indicators.momentum}). Price accelerating.` };
            if (indicators.momentum < -3) return { signal: 'SELL', color: 'text-rose-400', desc: `Negative momentum (${indicators.momentum}). Price declining.` };
            return { signal: 'HOLD', color: 'text-amber-400', desc: `Momentum near zero. No strong directional force.` };
        }
        return { signal: '-', color: 'text-slate-400', desc: '' };
    };

    const FrequencyBadge = ({ mode }: { mode: FrequencyMode }) => (
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${mode === 'fast'
            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}>
            {mode === 'fast' ? <Zap size={8} /> : <Clock size={8} />}
            {mode === 'fast' ? 'SCALP' : 'SWING'}
        </span>
    );

    return (
        <Card className="bg-slate-900 border-slate-800 p-3 space-y-2.5 shadow-lg shadow-black/20">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-100 flex items-center gap-1.5 text-sm">
                        <Crosshair className="text-blue-500" size={14} /> Signal
                    </h3>
                    <FrequencyBadge mode={frequencyMode} />
                </div>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`text-[10px] px-2 py-0.5 rounded transition-colors ${showSettings ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                >
                    {showSettings ? 'Hide' : 'Settings'}
                </button>
            </div>

            {/* Collapsible Settings Panel */}
            {showSettings && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                    <SignalSettingsPanel />
                </div>
            )}

            {/* Main Signal Display */}
            <div className={`rounded-lg border-2 p-2.5 text-center transition-all duration-300 ${getActionColor()} flex flex-col items-center justify-center relative`}>
                {isLoading ? (
                    <Activity className="animate-spin text-slate-500" size={20} />
                ) : (
                    <>
                        {/* Anomaly Warning */}
                        {indicators.anomalyDetected && (
                            <div className="absolute top-1 right-1">
                                <AlertTriangle size={12} className="text-amber-500 animate-pulse" />
                            </div>
                        )}

                        <div className="text-xl font-black tracking-tight">{action}</div>
                        <div className="text-[9px] font-mono opacity-80 uppercase tracking-wider">
                            {confidence}% confidence
                        </div>
                        <div className="w-20 h-1 bg-slate-900/50 rounded-full mt-1.5 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-700 ${getScoreColor()}`}
                                style={{ width: `${confidence}%` }}
                            />
                        </div>

                        {/* Baseline Deviation */}
                        {frequencyMode === 'slow' && (
                            <div className={`text-[9px] mt-1 ${indicators.priceVsBaseline < -5 ? 'text-emerald-400' :
                                indicators.priceVsBaseline > 5 ? 'text-rose-400' : 'text-slate-500'
                                }`}>
                                {indicators.priceVsBaseline > 0 ? '+' : ''}{indicators.priceVsBaseline}% vs baseline
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Clickable Indicators - 4 column grid */}
            <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                {/* TREND */}
                <button
                    onClick={() => toggleExpand('trend')}
                    className={`bg-slate-950/50 p-1.5 rounded border transition-all hover:border-slate-600 ${expanded === 'trend' ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-slate-800'}`}
                >
                    <div className="text-slate-500 text-[8px] flex items-center justify-center gap-0.5">
                        TRND {expanded === 'trend' ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
                    </div>
                    <div className={`font-bold ${indicators.trend === 'bullish' ? 'text-emerald-400' : indicators.trend === 'bearish' ? 'text-rose-400' : 'text-slate-400'}`}>
                        {indicators.trend === 'bullish' ? <TrendingUp size={12} className="mx-auto" /> : indicators.trend === 'bearish' ? <TrendingDown size={12} className="mx-auto" /> : '—'}
                    </div>
                </button>

                {/* RSI */}
                <button
                    onClick={() => toggleExpand('rsi')}
                    className={`bg-slate-950/50 p-1.5 rounded border transition-all hover:border-slate-600 ${expanded === 'rsi' ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-slate-800'}`}
                >
                    <div className="text-slate-500 text-[8px] flex items-center justify-center gap-0.5">
                        RSI {expanded === 'rsi' ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
                    </div>
                    <div className={`font-bold ${indicators.rsi < 30 ? 'text-emerald-400' : indicators.rsi > 70 ? 'text-rose-400' : 'text-slate-200'}`}>
                        {indicators.rsi.toFixed(0)}
                    </div>
                </button>

                {/* VOL */}
                <button
                    onClick={() => toggleExpand('vol')}
                    className={`bg-slate-950/50 p-1.5 rounded border transition-all hover:border-slate-600 ${expanded === 'vol' ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-slate-800'}`}
                >
                    <div className="text-slate-500 text-[8px] flex items-center justify-center gap-0.5">
                        VOL {expanded === 'vol' ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
                    </div>
                    <div className={`font-bold ${indicators.volatility > 3 ? 'text-amber-400' : 'text-slate-200'}`}>
                        {indicators.volatility.toFixed(1)}%
                    </div>
                </button>

                {/* MOMENTUM */}
                <button
                    onClick={() => toggleExpand('momentum')}
                    className={`bg-slate-950/50 p-1.5 rounded border transition-all hover:border-slate-600 ${expanded === 'momentum' ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-slate-800'}`}
                >
                    <div className="text-slate-500 text-[8px] flex items-center justify-center gap-0.5">
                        MOM {expanded === 'momentum' ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
                    </div>
                    <div className={`font-bold ${indicators.momentum > 2 ? 'text-emerald-400' : indicators.momentum < -2 ? 'text-rose-400' : 'text-slate-200'}`}>
                        {indicators.momentum > 0 ? '+' : ''}{indicators.momentum}
                    </div>
                </button>
            </div>

            {/* Expanded Indicator Detail */}
            {expanded && (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 animate-in slide-in-from-top-2 duration-200">
                    {(() => {
                        const sig = getIndicatorSignal(expanded);
                        return (
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] text-slate-500 uppercase">{expanded} Signal</span>
                                    <span className={`text-xs font-bold ${sig.color}`}>{sig.signal}</span>
                                </div>
                                <p className="text-[9px] text-slate-400 leading-relaxed">{sig.desc}</p>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Buy/Sell Price Box */}
            {prices.buyAt > 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-1.5 text-center">
                        <div className="text-[8px] text-emerald-400/70 uppercase">Buy At</div>
                        <div className="text-emerald-400 font-mono font-bold text-xs">{formatGP(prices.buyAt)}</div>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-1.5 text-center">
                        <div className="text-[8px] text-rose-400/70 uppercase">Sell At</div>
                        <div className="text-rose-400 font-mono font-bold text-xs">{formatGP(prices.sellAt)}</div>
                    </div>
                </div>
            )}

            {/* Stop Loss / Take Profit for Swing Mode */}
            {frequencyMode === 'slow' && prices.stopLoss > 0 && (
                <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                    <div className="bg-slate-950 border border-slate-800 rounded p-1 text-center">
                        <span className="text-slate-500">Stop: </span>
                        <span className="text-rose-400 font-mono">{formatGP(prices.stopLoss)}</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded p-1 text-center">
                        <span className="text-slate-500">Target: </span>
                        <span className="text-emerald-400 font-mono">{formatGP(prices.takeProfit)}</span>
                    </div>
                </div>
            )}

            {/* Reasoning */}
            {!isLoading && reasoning.length > 0 && (
                <div className="text-[9px] text-slate-400 bg-slate-950 p-1.5 rounded border border-slate-800/50 flex gap-1 items-start">
                    <AlertCircle size={9} className="mt-0.5 text-blue-500 shrink-0" />
                    <div className="leading-tight">
                        {reasoning.map((r, i) => (
                            <span key={i}>{r}{i < reasoning.length - 1 ? ' · ' : ''}</span>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
};

export default SignalWidget;
