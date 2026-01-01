import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RiskProfile, useSignalEngine, SignalConfig } from '@/hooks/use-signal-engine';
import { Activity, Gauge, TrendingUp, TrendingDown, AlertCircle, Zap, Shield, Crosshair } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SignalWidgetProps {
    itemId: number;
}

const SignalWidget = ({ itemId }: SignalWidgetProps) => {
    const [risk, setRisk] = useState<RiskProfile>('medium');
    const [interval, setInterval] = useState<number>(5);

    const config: SignalConfig = {
        riskProfile: risk,
        flipIntervalMinutes: interval
    };

    const { action, confidence, indicators, reasoning, isLoading } = useSignalEngine(itemId, config);

    // Color logic
    const getActionColor = () => {
        if (action === 'BUY') return 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10';
        if (action === 'SELL') return 'text-rose-400 border-rose-500/50 bg-rose-500/10';
        return 'text-amber-400 border-amber-500/50 bg-amber-500/10';
    };

    const getScoreColor = (score: number) => {
        if (score >= 70) return 'bg-emerald-500';
        if (score <= 30) return 'bg-rose-500';
        return 'bg-amber-500';
    };

    return (
        <Card className="bg-slate-900 border-slate-800 p-4 space-y-4 shadow-lg shadow-black/20">
            {/* Header / Controls */}
            <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-100 flex items-center gap-2">
                        <Crosshair className="text-blue-500" size={18} /> Smart Signal
                    </h3>
                    <div className="flex items-center gap-1 text-[10px] bg-slate-950 rounded-lg p-1 border border-slate-800">
                        <button
                            onClick={() => setInterval(5)}
                            className={`px-2 py-0.5 rounded transition-colors ${interval === 5 ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >5m</button>
                        <button
                            onClick={() => setInterval(60)}
                            className={`px-2 py-0.5 rounded transition-colors ${interval === 60 ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >1h</button>
                    </div>
                </div>

                <Tabs value={risk} onValueChange={(v) => setRisk(v as RiskProfile)} className="w-full">
                    <TabsList className="w-full grid grid-cols-3 h-8 bg-slate-950">
                        <TabsTrigger value="low" className="text-xs data-[state=active]:bg-emerald-600">Conservative</TabsTrigger>
                        <TabsTrigger value="medium" className="text-xs data-[state=active]:bg-blue-600">Balanced</TabsTrigger>
                        <TabsTrigger value="high" className="text-xs data-[state=active]:bg-purple-600">Aggressive</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Main Gauge Area */}
            <div className={`rounded-xl border-2 p-4 text-center transition-all duration-500 ${getActionColor()} flex flex-col items-center justify-center min-h-[120px]`}>
                {isLoading ? (
                    <Activity className="animate-spin text-slate-500" />
                ) : (
                    <>
                        <div className="text-4xl font-black tracking-tighter animate-in zoom-in spin-in-3 duration-300">
                            {action}
                        </div>
                        <div className="text-xs font-mono opacity-80 mt-1 uppercase tracking-widest">
                            Confidence: {confidence}%
                        </div>

                        {/* Progress Bar for Confidence */}
                        <div className="w-32 h-1.5 bg-slate-900/50 rounded-full mt-3 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ${getScoreColor(action === 'BUY' ? 100 : action === 'SELL' ? 0 : 50)}`}
                                style={{ width: `${confidence}%` }}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Indicators Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
                    <div className="text-slate-500 mb-1">TRND</div>
                    <div className={`font-bold ${indicators.trend === 'bullish' ? 'text-emerald-400' : indicators.trend === 'bearish' ? 'text-rose-400' : 'text-slate-400'}`}>
                        {indicators.trend === 'bullish' ? <TrendingUp size={14} className="mx-auto" /> : indicators.trend === 'bearish' ? <TrendingDown size={14} className="mx-auto" /> : '-'}
                    </div>
                </div>
                <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
                    <div className="text-slate-500 mb-1">RSI</div>
                    <div className={`font-bold ${indicators.rsi < 30 ? 'text-emerald-400' : indicators.rsi > 70 ? 'text-rose-400' : 'text-slate-200'}`}>
                        {indicators.rsi.toFixed(0)}
                    </div>
                </div>
                <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
                    <div className="text-slate-500 mb-1">VOL</div>
                    <div className={`font-bold ${indicators.volatility > 2 ? 'text-amber-400' : 'text-slate-200'}`}>
                        {indicators.volatility.toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* Reasoning Output */}
            {!isLoading && reasoning.length > 0 && (
                <div className="text-[10px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-800/50">
                    <div className="flex gap-1 items-start">
                        <AlertCircle size={10} className="mt-0.5 text-blue-500 shrink-0" />
                        <div>
                            {reasoning.map((r, i) => (
                                <div key={i}>{r}</div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default SignalWidget;
