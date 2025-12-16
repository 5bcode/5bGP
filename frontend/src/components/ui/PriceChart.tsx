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
import { Line } from 'react-chartjs-2';
import type { TimeseriesPoint } from '../../types';

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
    Filler
);

interface PriceChartProps {
    data: TimeseriesPoint[];
    itemName: string;
}

export function PriceChart({ data, itemName }: PriceChartProps) {
    // Process data for ChartJS
    // Sort by timestamp just in case
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

    const chartData = {
        labels: sortedData.map(d => new Date(d.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
        datasets: [
            {
                label: 'Buy Price',
                data: sortedData.map(d => d.avgLowPrice),
                borderColor: '#10b981', // green
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: false,
            },
            {
                label: 'Sell Price',
                data: sortedData.map(d => d.avgHighPrice),
                borderColor: '#ef4444', // red
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: false,
            },
        ],
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
                    color: '#94a3b8' // text-secondary
                }
            },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                backgroundColor: '#0f1113', // bg-card
                titleColor: '#e2e8f0', // text-primary
                bodyColor: '#94a3b8', // text-secondary
                borderColor: '#262626', // border-border
                borderWidth: 1
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
        },
    };

    return <Line options={options} data={chartData} />;
}
