import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatGP } from '@/lib/osrs-math';

interface ChartHeaderProps {
    currentSell: number;
    currentBuy: number;
    priceChangePercent: number;
}

const ChartHeader = ({ currentSell, currentBuy, priceChangePercent }: ChartHeaderProps) => {
    const isPositive = priceChangePercent > 0;
    const isNegative = priceChangePercent < 0;
    const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

    return (
        <div className="flex gap-4 items-center">
            <h3 className="font-semibold text-slate-200">Price Action</h3>
            <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-400 font-mono font-medium">{formatGP(currentSell)}</span>
                <span className="text-slate-600">/</span>
                <span className="text-blue-400 font-mono font-medium">{formatGP(currentBuy)}</span>
                <span className={`font-mono flex items-center ml-2 ${isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-slate-400'}`}>
                    <Icon size={12} className="mr-1" />
                    {Math.abs(priceChangePercent).toFixed(2)}%
                </span>
            </div>
        </div>
    );
};

export default ChartHeader;