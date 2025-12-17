// charts.js
import { calculateSMA } from './analysis.js';

let chartInstance = null;

export function renderPriceChart(ctx, timeseriesData) {
    if (chartInstance) {
        chartInstance.destroy();
    }

    const labels = timeseriesData.map(d => new Date(d.timestamp * 1000).toLocaleTimeString());
    const highPrices = timeseriesData.map(d => d.avgHighPrice);
    const lowPrices = timeseriesData.map(d => d.avgLowPrice);

    // Calculate SMA (using average of high/low for the trend)
    const avgPrices = timeseriesData.map(d => (d.avgHighPrice + d.avgLowPrice) / 2);
    const sma12 = calculateSMA(avgPrices, 12);
    const sma24 = calculateSMA(avgPrices, 24);

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Buy Price',
                    data: highPrices, // Wiki "High" is instant buy
                    borderColor: '#d4af37',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Sell Price',
                    data: lowPrices,
                    borderColor: '#00e676',
                    backgroundColor: 'rgba(0, 230, 118, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'SMA (12)',
                    data: sma12,
                    borderColor: '#29b6f6', // Light Blue
                    borderDash: [5, 5],
                    borderWidth: 1,
                    pointRadius: 0,
                    tension: 0.4
                },
                {
                    label: 'SMA (24)',
                    data: sma24,
                    borderColor: '#ab47bc', // Purple
                    borderDash: [5, 5],
                    borderWidth: 1,
                    pointRadius: 0,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    labels: { color: '#f0f0f0' }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                y: {
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            }
        }
    });
}
