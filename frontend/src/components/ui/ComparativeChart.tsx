import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    TimeScale,
    Filler
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import { useMemo, useRef, useState } from 'react';
import type { TimeseriesPoint } from '../../types';
import { fetchItemTimeseries } from '../../services/api';
import { useQuery } from '@tanstack/react-query';
import { useMarketData } from '../../hooks/useMarketData';
import { formatNumber } from '../../utils/analysis';
import clsx from 'clsx';
import { FaChartLine, FaPlus, FaTimes, FaSearchPlus, FaSearchMinus, FaExpand } from 'react-icons/fa6';
import React from 'react';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    TimeScale,
    Filler,
    zoomPlugin
);

interface ComparativeChartProps {
    initialItems: number[];
    timestep: string;
    customDateRange?: { start: Date; end: Date } | null;
    onItemsChange?: (items: number[]) => void;
}

// Color palette for multiple items
const COLOR_PALETTE = [
    '#fbbf24', // gold
    '#10b981', // green
    '#ef4444', // red
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
];

export function ComparativeChart({ 
    initialItems, 
    timestep, 
    customDateRange,
    onItemsChange 
}: ComparativeChartProps) {
    const { items: marketItems } = useMarketData();
    const [selectedItems, setSelectedItems] = useState<number[]>(initialItems);
    const [showVolume, setShowVolume] = useState(false);
    const chartRef = useRef<{ resetZoom: () => void; zoom: (scale: number) => void }>(null);

    // Fetch data for each selected item
    const itemQueries = useQuery({
        queryKey: ['comparative-timeseries', selectedItems, timestep],
        queryFn: async () => {
            const promises = selectedItems.map(itemId => 
                fetchItemTimeseries(itemId, timestep)
                    .then(response => ({ itemId, data: response.data || [] }))
                    .catch(() => ({ itemId, data: [] }))
            );
            return Promise.all(promises);
        },
        enabled: selectedItems.length > 0,
        staleTime: 60000,
    });

    const { chartData, volumeData } = useMemo(() => {
        if (!itemQueries.data || selectedItems.length === 0) {
            return {
                chartData: { labels: [], datasets: [] },
                volumeData: { labels: [], datasets: [] }
            };
        }

        // Normalize all datasets to same timeline
        const allTimestamps = new Set<number>();
        const itemDataMap = new Map<number, Map<number, { price: number; volume: number }>>();

        // Collect all timestamps and initial data
        itemQueries.data.forEach(({ itemId, data }) => {
            const itemData = new Map();
            data.forEach(point => {
                const price = (point.avgHighPrice + point.avgLowPrice) / 2;
                const volume = (point.highPriceVolume || 0) + (point.lowPriceVolume || 0);
                allTimestamps.add(point.timestamp);
                itemData.set(point.timestamp, { price, volume });
            });
            itemDataMap.set(itemId, itemData);
        });

        // Sort timestamps
        const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

        // Filter by custom date range if provided
        let timestamps = sortedTimestamps;
        if (customDateRange) {
            const startTimestamp = Math.floor(customDateRange.start.getTime() / 1000);
            const endTimestamp = Math.floor(customDateRange.end.getTime() / 1000);
            timestamps = sortedTimestamps.filter(ts => 
                ts >= startTimestamp && ts <= endTimestamp
            );
        }

        // Create datasets
        const labels = timestamps.map(ts => 
            new Date(ts * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' })
        );

        const priceDatasets = selectedItems.map((itemId, index) => {
            const marketItem = marketItems.find(item => item.id === itemId);
            const itemName = marketItem?.name || `Item ${itemId}`;
            const color = COLOR_PALETTE[index % COLOR_PALETTE.length];
            const itemData = itemDataMap.get(itemId);

            const prices = timestamps.map(ts => {
                if (itemData?.has(ts)) {
                    return itemData.get(ts)!.price;
                }
                // Find nearest previous price for gaps
                const prevTs = Array.from(itemData?.keys() || [])
                    .filter(t => t < ts)
                    .sort((a, b) => b - a)[0];
                return itemData?.get(prevTs)?.price || null;
            });

            return {
                type: 'line' as const,
                label: itemName,
                data: prices,
                borderColor: color,
                backgroundColor: color + '20',
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: false,
                yAxisID: 'y',
                spanGaps: true,
            };
        });

        // Volume datasets
        const volumeDatasets = selectedItems.map((itemId, index) => {
            const marketItem = marketItems.find(item => item.id === itemId);
            const itemName = marketItem?.name || `Item ${itemId}`;
            const color = COLOR_PALETTE[index % COLOR_PALETTE.length];
            const itemData = itemDataMap.get(itemId);

            const volumes = timestamps.map(ts => {
                if (itemData?.has(ts)) {
                    return itemData.get(ts)!.volume;
                }
                return 0;
            });

            return {
                type: 'bar' as const,
                label: `${itemName} Volume`,
                data: volumes,
                backgroundColor: color + '40',
                borderColor: color,
                borderWidth: 1,
                yAxisID: 'y1',
                hidden: !showVolume,
            };
        });

        return {
            chartData: { labels, datasets: priceDatasets },
            volumeData: { labels, datasets: volumeDatasets }
        };
    }, [itemQueries.data, selectedItems, marketItems, customDateRange, showVolume]);

    const handleAddItem = (itemId: number) => {
        if (itemId && !selectedItems.includes(itemId)) {
            const newItems = [...selectedItems, itemId];
            setSelectedItems(newItems);
            onItemsChange?.(newItems);
        }
    };

    const handleRemoveItem = (itemId: number) => {
        const newItems = selectedItems.filter(id => id !== itemId);
        setSelectedItems(newItems);
        onItemsChange?.(newItems);
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
                        if (label.includes('Volume')) {
                            return `${label.replace(' Volume', '')}: ${formatNumber(value)}`;
                        }
                        return `${label}: ${formatNumber(value)}`;
                    }
                }
            },
            title: {
                display: false,
                text: 'Comparative Analysis',
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
                    maxTicksLimit: 10
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
            },
        },
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col gap-3 mb-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <FaChartLine className="text-gold" /> Comparative Analysis
                    </h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowVolume(!showVolume)}
                            className={clsx(
                                "px-2.5 py-1 text-[10px] font-medium rounded transition-all",
                                showVolume ? "bg-gold/20 text-gold" : "text-muted hover:text-secondary"
                            )}
                        >
                            Volume
                        </button>
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
                                <FaSearchPlus className="text-xs" />
                            </button>
                            <button
                                onClick={() => chartRef.current?.zoom(0.9)}
                                className="px-2.5 py-1 text-[10px] font-medium rounded text-muted hover:text-secondary transition-all"
                                title="Zoom Out"
                            >
                                <FaSearchMinus className="text-xs" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Selected Items */}
                <div className="flex flex-wrap gap-2">
                    {selectedItems.map((itemId, index) => {
                        const marketItem = marketItems.find(item => item.id === itemId);
                        const color = COLOR_PALETTE[index % COLOR_PALETTE.length];
                        return (
                            <div
                                key={itemId}
                                className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-700 rounded-full text-xs"
                            >
                                <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: color }}
                                />
                                <span className="text-secondary">
                                    {marketItem?.name || `Item ${itemId}`}
                                </span>
                                <button
                                    onClick={() => handleRemoveItem(itemId)}
                                    className="text-muted hover:text-red-400 transition-colors"
                                >
                                    <FaTimes className="text-xs" />
                                </button>
                            </div>
                        );
                    })}
                    
                    {/* Add Item Button */}
                    {selectedItems.length < 8 && (
                        <div className="flex items-center">
                            <input
                                type="number"
                                placeholder="Item ID"
                                className="w-20 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded-l-full text-xs text-primary focus:outline-none focus:border-gold"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        const input = e.target as HTMLInputElement;
                                        handleAddItem(Number(input.value));
                                        input.value = '';
                                    }
                                }}
                            />
                            <button
                                onClick={(e) => {
                                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                    handleAddItem(Number(input.value));
                                    input.value = '';
                                }}
                                className="px-2 py-1 bg-gold hover:bg-yellow-400 text-black rounded-r-full text-xs font-medium transition-colors"
                            >
                                <FaPlus className="text-xs" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0">
                {itemQueries.isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-zinc-700 border-t-gold rounded-full animate-spin"></div>
                    </div>
                ) : selectedItems.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted">
                        <div className="text-center">
                            <p>Add items to compare their performance</p>
                            <p className="text-xs mt-1">Enter item IDs to get started</p>
                        </div>
                    </div>
                ) : (
                    <Chart 
                        ref={chartRef}
                        type="line" 
                        options={options as any} 
                        data={{
                            labels: chartData.labels,
                            datasets: [...chartData.datasets, ...volumeData.datasets]
                        }}
                    />
                )}
            </div>
        </div>
    );
}