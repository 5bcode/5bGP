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
import zoomPlugin from 'chartjs-plugin-zoom';
import type { TimeseriesPoint } from '../../types';
import { useMemo, useRef } from 'react';
import { computeAnalytics, getRiskLevel } from '../../utils/analysis';
import clsx from 'clsx';
import { FaChartArea, FaTriangleExclamation, FaMagnifyingGlassPlus, FaMagnifyingGlassMinus, FaExpand } from 'react-icons/fa6';
import React from 'react';

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
    Filler,
    zoomPlugin
);

interface CandlestickData {
    x: number;
    o: number; // Open
    h: number; // High
    l: number; // Low
    c: number; // Close
}

interface CandlestickChartProps {
    data: TimeseriesPoint[];
    itemName: string;
    showVolume?: boolean;
    customDateRange?: { start: Date; end: Date } | null;
}

// Custom candlestick drawing controller
class CandlestickController extends BarElement {
    static readonly id = 'candlestick';
    
    draw() {
        const { ctx } = this;
        const meta = this.getMeta();
        const dataset = this.getDataset();
        
        if (!meta.data || meta.data.length === 0) return;
        
        meta.data.forEach((bar: any, index: number) => {
            const data = dataset.data[index] as CandlestickData;
            if (!data) return;
            
            const { x, o, h, l, c } = data;
            const yScale = this._getScaleForId(this.getDataset().yAxisID);
            
            const openY = yScale.getPixelForValue(o);
            const highY = yScale.getPixelForValue(h);
            const lowY = yScale.getPixelForValue(l);
            const closeY = yScale.getPixelForValue(c);
            
            const barWidth = bar.width * 0.6;
            const barX = bar.x - barWidth / 2;
            
            // Determine color based on close vs open
            const isGreen = c >= o;
            const color = isGreen ? '#10b981' : '#ef4444';
            const fillColor = isGreen ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)';
            
            ctx.strokeStyle = color;
            ctx.fillStyle = fillColor;
            ctx.lineWidth = 1;
            
            // Draw high-low line
            ctx.beginPath();
            ctx.moveTo(x, highY);
            ctx.lineTo(x, lowY);
            ctx.stroke();
            
            // Draw candle body
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.abs(closeY - openY) || 1; // Minimum height for visibility
            
            if (c === o) {
                // Doji candle (open equals close) - just a line
                ctx.beginPath();
                ctx.moveTo(barX, bodyTop);
                ctx.lineTo(barX + barWidth, bodyTop);
                ctx.stroke();
            } else {
                ctx.fillRect(barX, bodyTop, barWidth, bodyHeight);
            }
        });
    }
}

ChartJS.register(CandlestickController);

export function CandlestickChart({
    data,
    itemName,
    showVolume: initialShowVolume = true,
    customDateRange
}: CandlestickChartProps) {
    const [showVolume, setShowVolume] = React.useState(initialShowVolume);
    const chartRef = useRef<{ resetZoom: () => void; zoom: (scale: number) => void }>(null);

    const { chartData, analytics, volumeSpikes } = useMemo(() => {
        let sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

        // Filter by custom date range if provided
        if (customDateRange) {
            const startTimestamp = Math.floor(customDateRange.start.getTime() / 1000);
            const endTimestamp = Math.floor(customDateRange.end.getTime() / 1000);
            sortedData = sortedData.filter(d => 
                d.timestamp >= startTimestamp && d.timestamp <= endTimestamp
            );
        }
        
        if (sortedData.length < 2) {
            return {
                chartData: { labels: [], datasets: [] },
                analytics: { volatility: 0 },
                volumeSpikes: 0,
            };
        }

        const analytics = computeAnalytics(sortedData);

        // Create candlestick data with simulated OHLC using avgHighPrice as high and avgLowPrice as low
        const candlestickData: CandlestickData[] = sortedData.map((point, index) => {
            const high = point.avgHighPrice || 0;
            const low = point.avgLowPrice || 0;
            
            // Simulate open/close prices
            let open: number;
            let close: number;
            
            if (index === 0) {
                open = low + (high - low) * 0.5;
            } else {
                const prevPoint = sortedData[index - 1];
                const prevClose = prevPoint.avgLowPrice ? 
                    prevPoint.avgLowPrice + (prevPoint.avgHighPrice - prevPoint.avgLowPrice) * 0.5 :
                    prevPoint.avgHighPrice || 0;
                open = prevClose;
            }
            
            // Create realistic close price within the range
            close = low + (high - low) * (0.3 + Math.random() * 0.4);
            
            return {
                x: point.timestamp,
                o: open,
                h: high,
                l: low,
                c: close
            };
        });

        const volumes = sortedData.map(d => (d.highPriceVolume || 0) + (d.lowPriceVolume || 0));
        const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        const volumeSpikes = volumes.map(v => v > avgVol * 3);

        const labels = sortedData.map(d => new Date(d.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

        const datasets: any[] = [
            {
                type: 'candlestick',
                data: candlestickData,
                yAxisID: 'y',
                order: 1,
            },
        ];

        // Add Volume Bars
        if (showVolume) {
            datasets.push({
                type: 'bar',
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

        return {
            chartData: { labels, datasets },
            analytics,
            volumeSpikes: volumeSpikes.filter(Boolean).length,
        };
    }, [data, showVolume]);

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
            zoom: {
                zoom: {
                    wheel: {
                        enabled: true,
                        speed: 0.1,
                    },
                    pinch: {
                        enabled: true,
                    },
                    drag: {
                        enabled: true,
                        backgroundColor: 'rgba(225, 225, 225, 0.1)',
                        borderColor: 'rgba(225, 225, 225, 0.3)',
                        borderWidth: 1,
                    },
                    mode: 'xy' as const,
                },
                pan: {
                    enabled: true,
                    mode: 'xy' as const,
                },
            },
            legend: {
                position: 'top' as const,
                labels: {
                    color: '#94a3b8',
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 15,
                    font: { size: 11 }
                }
            },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                backgroundColor: '#0f1113',
                titleColor: '#e2e8f0',
                bodyColor: '#94a3b8',
                borderColor: '#262626',
                borderWidth: 1,
                callbacks: {
                    label: function (context: any) {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y;
                        if (label === 'Volume') {
                            return `${label}: ${value.toLocaleString()}`;
                        }
                        if (context.dataset.type === 'candlestick') {
                            const data = context.dataset.data[context.dataIndex] as CandlestickData;
                            return [
                                `O: ${data.o.toLocaleString()}`,
                                `H: ${data.h.toLocaleString()}`,
                                `L: ${data.l.toLocaleString()}`,
                                `C: ${data.c.toLocaleString()}`
                            ];
                        }
                        if (value >= 1000000) return `${label}: ${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${label}: ${(value / 1000).toFixed(1)}K`;
                        return `${label}: ${value?.toLocaleString() || '-'}`;
                    }
                }
            },
            title: {
                display: false,
                text: `${itemName} Candlestick Chart`,
            },
        },
        scales: {
            x: {
                grid: {
                    color: '#262626',
                    display: false
                },
                ticks: {
                    color: '#64748b',
                    maxTicksLimit: 8
                }
            },
            y: {
                type: 'linear' as const,
                position: 'left' as const,
                grid: {
                    color: '#262626',
                },
                ticks: {
                    color: '#64748b',
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
                </div>

                {/* Zoom Controls */}
                <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 border border-border">
                    <button
                        onClick={() => chartRef.current?.resetZoom()}
                        className="px-2.5 py-1 text-[10px] font-medium rounded text-muted hover:text-secondary transition-all"
                        title="Reset Zoom"
                    >
                        <FaExpand className="text-xs" />
                    </button>
                    <button
                        onClick={() => chartRef.current?.zoom(1.1)}
                        className="px-2.5 py-1 text-[10px] font-medium rounded text-muted hover:text-secondary transition-all"
                        title="Zoom In"
                    >
                        <FaMagnifyingGlassPlus className="text-xs" />
                    </button>
                    <button
                        onClick={() => chartRef.current?.zoom(0.9)}
                        className="px-2.5 py-1 text-[10px] font-medium rounded text-muted hover:text-secondary transition-all"
                        title="Zoom Out"
                    >
                        <FaMagnifyingGlassMinus className="text-xs" />
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
                <Chart 
                    ref={chartRef}
                    type="bar" 
                    options={options as any} 
                    data={chartData} 
                />
            </div>
        </div>
    );
}