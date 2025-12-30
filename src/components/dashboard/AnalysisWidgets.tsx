import React from 'react';
import { Card } from '@/components/ui/card';
import { Item, PriceData } from '@/services/osrs-api';
import { formatGP } from '@/lib/osrs-math';
import { TrendingUp, Activity, Lock, AlertTriangle } from 'lucide-react';

interface AnalysisWidgetProps {
    item: Item;
    price: PriceData;
}

// Sub-component for Semantic Organization
const ConfidenceCircle = ({ score }: { score: number }) => {
    // Basic Circle SVG
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    let color = "text-emerald-500";
    if (score < 40) color = "text-rose-500";
    else if (score < 70) color = "text-amber-500";

    return (
        <div className="relative flex items-center justify-center w-24 h-24">
            <svg className="transform -rotate-90 w-24 h-24">
                <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-800" />
                <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className={color}
                />
            </svg>
            <span className={`absolute text-xl font-bold ${color}`}>{score}%</span>
        </div>
    );
}

export const SmartAnalysis = ({ item }: AnalysisWidgetProps) => {
    return (
        <Card className="p-5 bg-slate-900 border-slate-800 flex flex-col justify-center h-full">
            <h4 className="text-slate-200 font-semibold mb-4">Smart Trade Analysis</h4>
            <div className="flex items-center gap-6">
                <ConfidenceCircle score={65} />
                <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-400">Strategy</p>
                    <p className="text-lg font-bold text-emerald-400">Buy & Hold</p>
                    <p className="text-xs text-slate-500 leading-tight">
                        Recovery detected. High probability of rebound to moving average.
                    </p>
                </div>
            </div>
        </Card>
    );
};

export const AlgorithmicForecast = () => {
    return (
        <Card className="p-5 bg-slate-900 border-slate-800 flex flex-col h-full">
            <h4 className="text-slate-200 font-semibold mb-4">Algorithmic Forecast</h4>

            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg mb-4 flex items-center gap-3">
                <TrendingUp size={18} className="text-emerald-500" />
                <div>
                    <p className="text-emerald-400 font-bold text-sm">Bullish Divergence</p>
                    <p className="text-emerald-500/60 text-xs">Momentum is building upward.</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-950 p-2 rounded text-center border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase">RSI</p>
                    <p className="text-slate-200 font-mono font-bold">34.7</p>
                </div>
                <div className="bg-slate-950 p-2 rounded text-center border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase">Support</p>
                    <p className="text-slate-200 font-mono font-bold">48.1k</p>
                </div>
                <div className="bg-slate-950 p-2 rounded text-center border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase">Resist</p>
                    <p className="text-slate-200 font-mono font-bold">56.3k</p>
                </div>
            </div>
        </Card>
    );
};

export const ArbitrageCheck = ({ item, price }: AnalysisWidgetProps) => {
    const highAlch = item.highalch || 0;
    const profit = highAlch - price.low;
    const isProfitable = profit > 0;

    return (
        <Card className="p-5 bg-slate-900 border-slate-800 flex flex-col h-full">
            <h4 className="text-slate-200 font-semibold mb-4">Arbitrage Check</h4>

            <div className="space-y-3 mb-4 text-sm">
                <div className="flex justify-between">
                    <span className="text-slate-400">High Alch Value</span>
                    <span className="text-slate-200 font-mono">{formatGP(highAlch)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400">Nature Rune</span>
                    <span className="text-slate-200 font-mono">105</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2">
                    <span className="text-slate-400">Alch Profit</span>
                    <span className={`font-mono font-bold ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatGP(profit - 105)} {/* Subtract nat price */}
                    </span>
                </div>
            </div>

            {!isProfitable && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded flex items-start gap-2 mt-auto">
                    <AlertTriangle size={14} className="text-rose-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-rose-300">
                        Arbitrage check failed. Do not alch. Sell on GE only.
                    </p>
                </div>
            )}
        </Card>
    );
};
