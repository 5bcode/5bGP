import React from 'react';
import { PriceData, Stats24h, Item } from '@/services/osrs-api';
import { formatGP, calculateMargin, calculateTax } from '@/lib/osrs-math';

interface KeyInfoPanelProps {
    price: PriceData;
    stats?: Stats24h;
    item?: Item;
}

interface MetricProps {
    label: string;
    value: string | number;
    color?: 'default' | 'green' | 'red' | 'yellow' | 'blue';
    prefix?: string;
}

const Metric = ({ label, value, color = 'default', prefix = '' }: MetricProps) => {
    const colorClasses = {
        default: 'text-slate-100',
        green: 'text-emerald-400',
        red: 'text-rose-400',
        yellow: 'text-amber-400',
        blue: 'text-blue-400',
    };

    return (
        <div className="space-y-1">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">
                {label}
            </p>
            <p className={`text-base font-mono font-semibold ${colorClasses[color]}`}>
                {prefix}{typeof value === 'number' ? formatGP(value) : value}
            </p>
        </div>
    );
};

const KeyInfoPanel = ({ price, stats, item }: KeyInfoPanelProps) => {
    const { net, roi } = calculateMargin(price.low, price.high);
    const tax = calculateTax(price.high);
    const volume = stats ? stats.highPriceVolume + stats.lowPriceVolume : 0;
    const limit = item?.limit || 0;
    const potentialProfit = net * limit;

    const netColor = net > 0 ? 'green' : net < 0 ? 'red' : 'default';
    const roiColor = roi > 0 ? 'green' : roi < 0 ? 'red' : 'default';

    return (
        <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800/50">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Key info</h3>

            <div className="grid grid-cols-4 gap-x-6 gap-y-5">
                {/* Row 1 */}
                <Metric
                    label="Buy price"
                    value={price.low}
                />
                <Metric
                    label="Sell price"
                    value={price.high}
                />
                <Metric
                    label="Volume"
                    value={volume}
                />
                <Metric
                    label="Limit"
                    value={limit || '—'}
                    color="yellow"
                />

                {/* Row 2 */}
                <Metric
                    label="Tax"
                    value={tax}
                />
                <Metric
                    label="Margin"
                    value={Math.abs(net)}
                    color={netColor}
                    prefix={net >= 0 ? '+' : '-'}
                />
                <Metric
                    label="ROI"
                    value={`${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%`}
                    color={roiColor}
                />
                <Metric
                    label="Potential Profit"
                    value={Math.abs(potentialProfit)}
                    color={potentialProfit >= 0 ? 'green' : 'red'}
                    prefix={potentialProfit >= 0 ? '+' : '-'}
                />
            </div>
        </div>
    );
};

export default KeyInfoPanel;
