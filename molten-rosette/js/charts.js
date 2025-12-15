// charts.js
let chartInstance = null;

export function renderPriceChart(ctx, timeseriesData) {
    if (chartInstance) {
        chartInstance.destroy();
    }

    const labels = timeseriesData.map(d => new Date(d.timestamp * 1000).toLocaleTimeString());
    const highPrices = timeseriesData.map(d => d.avgHighPrice);
    const lowPrices = timeseriesData.map(d => d.avgLowPrice);

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
