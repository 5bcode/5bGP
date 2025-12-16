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
import { useMemo, useRef } from 'react';
import { usePortfolioStore } from '../../store/portfolioStore';
import { useMarketData } from '../../hooks/useMarketData';
import { formatNumber } from '../../utils/analysis';
import clsx from 'clsx';
import { FaArrowTrendUp, FaMagnifyingGlassPlus, FaMagnifyingGlassMinus, FaExpand } from 'react-icons/fa6';
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

interface PortfolioDataPoint {
    timestamp: number;
    netWorth: number;
    cashValue: number;
    inventoryValue: number;
}

export function PortfolioPerformanceChart() {
    const { transactions, cash, holdings } = usePortfolioStore();
    const { items: marketItems } = useMarketData();
    const chartRef = useRef<{ resetZoom: () => void; zoom: (scale: number) => void }>(null);

    const { chartData, stats } = useMemo(() => {
        if (transactions.length === 0) {
            return {
                chartData: { labels: [], datasets: [] },
                stats: {
                    totalReturn: 0,
                    returnPercent: 0,
                    peakNetWorth: 0,
                    lowestNetWorth: 0
                }
            };
        }

        // Sort transactions by timestamp
        const sortedTxs = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
        
        // Get current item values
        const getItemValue = (itemId: number): number => {
            const marketItem = marketItems.find(i => i.id === itemId);
            return marketItem ? marketItem.sellPrice : 0;
        };

        // Create portfolio snapshot at each transaction point
        const dataPoints: PortfolioDataPoint[] = [];
        let runningCash = cash;
        let runningHoldings: Record<number, { quantity: number; avgBuyPrice: number }> = {};

        // Add initial point before any transactions
        const initialNetWorth = runningCash;
        dataPoints.push({
            timestamp: sortedTxs[0].timestamp - 86400000, // 1 day before first transaction
            netWorth: initialNetWorth,
            cashValue: runningCash,
            inventoryValue: 0
        });

        // Process each transaction
        sortedTxs.forEach(tx => {
            const { itemId, type, quantity, price, timestamp } = tx;
            const currentHolding = runningHoldings[itemId] || { quantity: 0, avgBuyPrice: 0 };

            if (type === 'buy') {
                // Update cash
                runningCash -= quantity * price;
                
                // Update holdings
                const totalCost = (currentHolding.quantity * currentHolding.avgBuyPrice) + (quantity * price);
                const newQuantity = currentHolding.quantity + quantity;
                const newAvg = totalCost / newQuantity;
                
                runningHoldings[itemId] = {
                    quantity: newQuantity,
                    avgBuyPrice: newAvg
                };
            } else {
                // Sell transaction
                runningCash += quantity * price;
                
                const newQuantity = currentHolding.quantity - quantity;
                if (newQuantity <= 0) {
                    delete runningHoldings[itemId];
                } else {
                    runningHoldings[itemId] = {
                        ...currentHolding,
                        quantity: newQuantity
                    };
                }
            }

            // Calculate current inventory value
            const inventoryValue = Object.values(runningHoldings).reduce((acc, holding) => {
                return acc + (holding.quantity * getItemValue(holding.itemId));
            }, 0);

            const netWorth = runningCash + inventoryValue;

            dataPoints.push({
                timestamp,
                netWorth,
                cashValue: runningCash,
                inventoryValue
            });
        });

        // Add current snapshot
        const currentInventoryValue = Object.values(holdings).reduce((acc, holding) => {
            return acc + (holding.quantity * getItemValue(holding.itemId));
        }, 0);
        const currentNetWorth = cash + currentInventoryValue;
        
        dataPoints.push({
            timestamp: Date.now(),
            netWorth: currentNetWorth,
            cashValue: cash,
            inventoryValue: currentInventoryValue
        });

        // Calculate stats
        const netWorths = dataPoints.map(d => d.netWorth);
        const totalReturn = currentNetWorth - 10000000; // Started with 10M
        const returnPercent = (totalReturn / 10000000) * 100;
        const peakNetWorth = Math.max(...netWorths);
        const lowestNetWorth = Math.min(...netWorths);

        // Format chart data
        const labels = dataPoints.map(d => 
            new Date(d.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
        );

        const datasets = [
            {
                type: 'line' as const,
                label: 'Net Worth',
                data: dataPoints.map(d => d.netWorth),
                borderColor: '#fbbf24',
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                tension: 0.2,
                pointRadius: 3,
                pointHoverRadius: 6,
                fill: true,
                yAxisID: 'y',
                order: 1,
            },
            {
                type: 'line' as const,
                label: 'Cash',
                data: dataPoints.map(d => d.cashValue),
                borderColor: '#10b981',
                backgroundColor: 'transparent',
                tension: 0.2,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: false,
                yAxisID: 'y',
                order: 2,
            },
            {
                type: 'line' as const,
                label: 'Inventory Value',
                data: dataPoints.map(d => d.inventoryValue),
                borderColor: '#3b82f6',
                backgroundColor: 'transparent',
                tension: 0.2,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: false,
                yAxisID: 'y',
                order: 3,
            },
        ];

        return {
            chartData: { labels, datasets },
            stats: {
                totalReturn,
                returnPercent,
                peakNetWorth,
                lowestNetWorth
            }
        };
    }, [transactions, cash, holdings, marketItems]);

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
                        if (value >= 1000000) return `${label}: ${(value / 1000000).toFixed(2)}M gp`;
                        if (value >= 1000) return `${label}: ${(value / 1000).toFixed(1)}K gp`;
                        return `${label}: ${value?.toLocaleString()} gp`;
                    }
                }
            },
            title: {
                display: false,
                text: 'Portfolio Performance',
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
        },
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header with Stats */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <FaArrowTrendUp className="text-gold" /> Portfolio Performance
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-xs">
                        <div className={clsx(
                            "font-medium",
                            stats.returnPercent >= 0 ? "text-green" : "text-red"
                        )}>
                            Total Return: {stats.returnPercent >= 0 ? '+' : ''}{stats.returnPercent.toFixed(2)}%
                        </div>
                        <div className="text-muted">
                            Peak: {formatNumber(stats.peakNetWorth)}
                        </div>
                    </div>
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
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0">
                {chartData.datasets.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted">
                        <div className="text-center">
                            <p>No trading history yet</p>
                            <p className="text-xs mt-1">Start recording transactions to see your portfolio performance</p>
                        </div>
                    </div>
                ) : (
                    <Chart 
                        ref={chartRef}
                        type="line" 
                        options={options as any} 
                        data={chartData} 
                    />
                )}
            </div>
        </div>
    );
}