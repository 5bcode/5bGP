import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    TimeScale,
    Filler
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import type { TimeseriesPoint } from '../../types';
import { useMemo, useState } from 'react';
import { calculateSMA, calculateEMA, computeAnalytics, getRiskLevel } from '../../utils/analysis';
import clsx from 'clsx';
import { FaChartArea, FaTriangleExclamation } from 'react-icons/fa6';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    TimeScale,
    Filler
);

interface PriceChartProps {
    data: TimeseriesPoint[];
    itemName: string;
    showVolume?: boolean;
    showSMA?: boolean;
    showEMA?: boolean;
}

export function PriceChart({
    data,
    itemName,
    showVolume: initialShowVolume = true,
    showSMA: initialShowSMA = false,
    showEMA: initialShowEMA = false
}: PriceChartProps) {
    const [showVolume, setShowVolume] = useState(initialShowVolume);
    const [showSMA, setShowSMA] = useState(initialShowSMA);
    const [showEMA, setShowEMA] = useState(initialShowEMA);

    // Process data for ChartJS
    const { chartData, analytics, volumeSpikes } = useMemo(() => {
        const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

        // Compute analytics
        const analytics = computeAnalytics(sortedData);

        // Extract prices and volumes
        const buyPrices = sortedData.map(d => d.avgLowPrice);
        const sellPrices = sortedData.map(d => d.avgHighPrice);
        const volumes = sortedData.map(d => (d.highPriceVolume || 0) + (d.lowPriceVolume || 0));

        // Calculate SMA/EMA on midpoint prices
        const midPrices = sortedData.map(d => {
            const h = d.avgHighPrice ?? 0;
            const l = d.avgLowPrice ?? 0;
            return h && l ? (h + l) / 2 : h || l;
        });
        const sma7 = calculateSMA(midPrices, 7);
        const sma14 = calculateSMA(midPrices, 14);
        const ema7 = calculateEMA(midPrices, 7);
        const ema14 = calculateEMA(midPrices, 14);

        // Detect volume spikes (>3x average)
        const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        const volumeSpikes = volumes.map(v => v > avgVol * 3);

        const labels = sortedData.map(d => new Date(d.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

        const datasets: any[] = [
            {
                type: 'line' as const,
                label: 'Buy Price',
                data: buyPrices,
                borderColor: '#10b981', // green
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: false,
                yAxisID: 'y',
                order: 1,
            },
            {
                type: 'line' as const,
                label: 'Sell Price',
                data: sellPrices,
                borderColor: '#ef4444', // red
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: false,
                yAxisID: 'y',
                order: 1,
            },
        ];

        // Add Volume Bars
        if (showVolume) {
            datasets.push({
                type: 'bar' as const,
                label: 'Volume',
                data: volumes,
                backgroundColor: volumes.map((_, i) =>
                    volumeSpikes[i]
                        ? 'rgba(251, 191, 36, 0.8)' // gold for spikes
                        : 'rgba(100, 116, 139, 0.4)' // muted for normal
                ),
                borderColor: volumes.map((_, i) =>
                    volumeSpikes[i] ? '#fbbf24' : 'transparent'
                ),
                borderWidth: 1,
                yAxisID: 'y1',
                order: 2,
            });
        }

        // Add SMA lines
        if (showSMA) {
            datasets.push({
                type: 'line' as const,
                label: 'SMA-7',
                data: sma7,
                borderColor: '#f472b6', // pink
                borderDash: [5, 5],
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false,
                yAxisID: 'y',
                order: 0,
            });
            datasets.push({
                type: 'line' as const,
                label: 'SMA-14',
                data: sma14,
                borderColor: '#a78bfa', // purple
                borderDash: [5, 5],
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false,
                yAxisID: 'y',
                order: 0,
            });
        }

        // Add EMA lines
        if (showEMA) {
            datasets.push({
                type: 'line' as const,
                label: 'EMA-7',
                data: ema7,
                borderColor: '#22d3ee', // cyan
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false,
                yAxisID: 'y',
                order: 0,
            });
            datasets.push({
                type: 'line' as const,
                label: 'EMA-14',
                data: ema14,
                borderColor: '#2dd4bf', // teal
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false,
                yAxisID: 'y',
                order: 0,
            });
        }

        return {
            chartData: { labels, datasets },
            analytics,
            volumeSpikes: volumeSpikes.filter(Boolean).length,
        };
    }, [data, showVolume, showSMA, showEMA]);

    const riskLevel = getRiskLevel(analytics.volatility);
    const riskColors = {
        low: 'text-green bg-green/10 border-green/30',
        medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
        high: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
        extreme: 'text-red bg-red/10 border-red/30',
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    color: '#94a3b8', // text-secondary
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 15,
                    font: { size: 11 }
                }
            },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                backgroundColor: '#0f1113', // bg-card
                titleColor: '#e2e8f0', // text-primary
                bodyColor: '#94a3b8', // text-secondary
                borderColor: '#262626', // border-border
                borderWidth: 1,
                callbacks: {
                    label: function (context: any) {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y;
                        if (label === 'Volume') {
                            return `${label}: ${value.toLocaleString()}`;
                        }
                        if (value >= 1000000) return `${label}: ${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${label}: ${(value / 1000).toFixed(1)}K`;
                        return `${label}: ${value?.toLocaleString() || '-'}`;
                    }
                }
            },
            title: {
                display: false,
                text: `${itemName} Price History`,
            },
        },
        scales: {
            x: {
                grid: {
                    color: '#262626', // border-border
                    display: false
                },
                ticks: {
                    color: '#64748b', // text-muted
                    maxTicksLimit: 8
                }
            },
            y: {
                type: 'linear' as const,
                position: 'left' as const,
                grid: {
                    color: '#262626', // border-border
                },
                ticks: {
                    color: '#64748b', // text-muted
                    callback: function (value: any) {
                        if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                        if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
                        return value;
                    }
                }
            },
            y1: {
                type: 'linear' as const,
                position: 'right' as const,
                display: showVolume,
                grid: {
                    display: false,
                },
                ticks: {
                    color: '#64748b',
                    callback: function (value: any) {
                        if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
                        return value;
                    }
                },
                max: (context: any) => {
                    // Make volume bars take only bottom 30% of chart
                    const datasets = context.chart?.data?.datasets || [];
                    const volumeData = datasets.find((d: any) => d.label === 'Volume')?.data || [];
                    const maxVol = Math.max(...volumeData);
                    return maxVol * 3.5;
                }
            },
        },
    };

    return (
        <div className="h-full flex flex-col">
            {/* Chart Controls & Analytics Summary */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
                {/* Toggle Buttons */}
                <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 border border-border">
                    <button
                        onClick={() => setShowVolume(!showVolume)}
                        className={clsx(
                            "px-2.5 py-1 text-[10px] font-medium rounded transition-all",
                            showVolume ? "bg-gold/20 text-gold" : "text-muted hover:text-secondary"
                        )}
                    >
                        Volume
                    </button>
                    <button
                        onClick={() => setShowSMA(!showSMA)}
                        className={clsx(
                            "px-2.5 py-1 text-[10px] font-medium rounded transition-all",
                            showSMA ? "bg-purple-500/20 text-purple-400" : "text-muted hover:text-secondary"
                        )}
                    >
                        SMA
                    </button>
                    <button
                        onClick={() => setShowEMA(!showEMA)}
                        className={clsx(
                            "px-2.5 py-1 text-[10px] font-medium rounded transition-all",
                            showEMA ? "bg-cyan-500/20 text-cyan-400" : "text-muted hover:text-secondary"
                        )}
                    >
                        EMA
                    </button>
                </div>

                {/* Analytics Badges */}
                <div className="flex items-center gap-2 ml-auto">
                    {/* Volatility Badge */}
                    <div className={clsx(
                        "flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider",
                        riskColors[riskLevel]
                    )}>
                        {riskLevel === 'high' || riskLevel === 'extreme' ? (
                            <FaTriangleExclamation className="text-xs" />
                        ) : (
                            <FaChartArea className="text-xs" />
                        )}
                        {riskLevel} Risk
                    </div>

                    {/* Volume Spikes */}
                    {volumeSpikes > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-gold/30 bg-gold/10 text-gold text-[10px] font-bold">
                            ⚡ {volumeSpikes} Spike{volumeSpikes > 1 ? 's' : ''}
                        </div>
                    )}

                    {/* Volatility % */}
                    <div className="text-[10px] text-muted">
                        Vol: <span className="text-secondary font-mono">{analytics.volatility.toFixed(2)}%</span>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0">
                <Chart type="bar" options={options as any} data={chartData} />
            </div>
        </div>
    );
}
