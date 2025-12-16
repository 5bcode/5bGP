import { Card } from './ui/Card';
import { useFlipPerformance, useFlipPerformanceStats } from '../hooks/useFlipPerformance';
import { formatNumber } from '../utils/analysis';
import { formatHoldingTime } from '../utils/formatters';
import { FaClock, FaChartLine, FaCoins, FaPercent } from 'react-icons/fa6';
import clsx from 'clsx';

export function FlipPerformanceOverview() {
    const { totalFlips, totalProfit, winRate, averageROI, bestFlip, worstFlip, recentFlips } = useFlipPerformance();
    const dailyStats = useFlipPerformanceStats('daily');
    const weeklyStats = useFlipPerformanceStats('weekly');
    const monthlyStats = useFlipPerformanceStats('monthly');

    const formatCurrency = (amount: number) => {
        const sign = amount >= 0 ? '+' : '';
        return `${sign}${formatNumber(amount)}`;
    };

    const getProfitColor = (profit: number) => {
        if (profit > 0) return 'text-green';
        if (profit < 0) return 'text-red';
        return 'text-muted';
    };

    return (
        <div className="space-y-6">
            {/* Performance Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <FaCoins className="text-gold text-xl" />
                        <div>
                            <p className="text-sm text-muted">Total Profit</p>
                            <p className={clsx("text-xl font-bold", getProfitColor(totalProfit))}>
                                {formatCurrency(totalProfit)}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <FaPercent className="text-blue-400 text-xl" />
                        <div>
                            <p className="text-sm text-muted">Win Rate</p>
                            <p className="text-xl font-bold text-blue-400">
                                {winRate.toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <FaChartLine className="text-purple-400 text-xl" />
                        <div>
                            <p className="text-sm text-muted">Avg ROI</p>
                            <p className="text-xl font-bold text-purple-400">
                                {averageROI.toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <FaClock className="text-orange-400 text-xl" />
                        <div>
                            <p className="text-sm text-muted">Total Flips</p>
                            <p className="text-xl font-bold text-orange-400">
                                {totalFlips}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Period Performance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4" title="Daily Performance">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-muted">Flips:</span>
                            <span className="font-bold">{dailyStats.count}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted">Profit:</span>
                            <span className={clsx("font-bold", getProfitColor(dailyStats.profit))}>
                                {formatCurrency(dailyStats.profit)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted">Win Rate:</span>
                            <span className="font-bold">{dailyStats.winRate.toFixed(1)}%</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-4" title="Weekly Performance">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-muted">Flips:</span>
                            <span className="font-bold">{weeklyStats.count}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted">Profit:</span>
                            <span className={clsx("font-bold", getProfitColor(weeklyStats.profit))}>
                                {formatCurrency(weeklyStats.profit)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted">Win Rate:</span>
                            <span className="font-bold">{weeklyStats.winRate.toFixed(1)}%</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-4" title="Monthly Performance">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-muted">Flips:</span>
                            <span className="font-bold">{monthlyStats.count}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted">Profit:</span>
                            <span className={clsx("font-bold", getProfitColor(monthlyStats.profit))}>
                                {formatCurrency(monthlyStats.profit)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted">Win Rate:</span>
                            <span className="font-bold">{monthlyStats.winRate.toFixed(1)}%</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Best and Worst Flips */}
            {(bestFlip || worstFlip) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bestFlip && (
                        <Card className="p-4 ring-1 ring-green/30" title="Best Flip">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    {bestFlip.itemIcon && (
                                        <img
                                            src={`https://oldschool.runescape.wiki/images/${bestFlip.itemIcon.replace(/ /g, '_')}`}
                                            className="w-8 h-8 object-contain"
                                            alt=""
                                        />
                                    )}
                                    <div>
                                        <p className="font-bold">{bestFlip.itemName}</p>
                                        <p className="text-sm text-muted">
                                            {formatHoldingTime(bestFlip.holdingTime)}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted">Profit:</span>
                                        <p className="font-bold text-green">{formatCurrency(bestFlip.profit)}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted">ROI:</span>
                                        <p className="font-bold">{bestFlip.roi.toFixed(1)}%</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {worstFlip && (
                        <Card className="p-4 ring-1 ring-red/30" title="Worst Flip">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    {worstFlip.itemIcon && (
                                        <img
                                            src={`https://oldschool.runescape.wiki/images/${worstFlip.itemIcon.replace(/ /g, '_')}`}
                                            className="w-8 h-8 object-contain"
                                            alt=""
                                        />
                                    )}
                                    <div>
                                        <p className="font-bold">{worstFlip.itemName}</p>
                                        <p className="text-sm text-muted">
                                            {formatHoldingTime(worstFlip.holdingTime)}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted">Loss:</span>
                                        <p className="font-bold text-red">{formatCurrency(worstFlip.profit)}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted">ROI:</span>
                                        <p className="font-bold">{worstFlip.roi.toFixed(1)}%</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* Recent Flips */}
            {recentFlips.length > 0 && (
                <Card className="p-4" title="Recent Flips">
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {recentFlips.map((flip) => (
                            <div key={flip.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                                <div className="flex items-center gap-3">
                                    {flip.itemIcon && (
                                        <img
                                            src={`https://oldschool.runescape.wiki/images/${flip.itemIcon.replace(/ /g, '_')}`}
                                            className="w-6 h-6 object-contain"
                                            alt=""
                                        />
                                    )}
                                    <div>
                                        <p className="font-medium text-sm">{flip.itemName}</p>
                                        <p className="text-xs text-muted">
                                            {new Date(flip.sellTimestamp).toLocaleDateString()} • {formatHoldingTime(flip.holdingTime)}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={clsx("font-bold", getProfitColor(flip.profit))}>
                                        {formatCurrency(flip.profit)}
                                    </p>
                                    <p className="text-xs text-muted">
                                        {flip.roi.toFixed(1)}% ROI
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}
