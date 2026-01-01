import { createChart, ColorType, IChartApi, Time, AreaSeries, HistogramSeries, CrosshairMode, LineSeries, MouseEventParams, LineStyle, SeriesMarker } from 'lightweight-charts';
// ... (lines 3-157 skipped for brevity if not editing)

const markers: SeriesMarker<Time>[] = [];

// Generate signals
// Generate signals
for (let i = 20; i < renderData.length; i++) {
    const price = prices[i];
    const prevRsi = rsi[i - 1];
    const currRsi = rsi[i];
    const lowerBand = lower[i];
    const upperBand = upper[i];

    if (!lowerBand || !upperBand || isNaN(currRsi)) continue;

    // BUY SIGNAL: RSI crosses up 30 OR Bounce off Lower Band
    if ((prevRsi < 30 && currRsi >= 30) || (price <= lowerBand && currRsi < 40)) {
        // Deduplicate: Don't spam buy signals
        const lastMarker = markers[markers.length - 1] as any;
        if (!lastMarker || (i - lastMarker.indexObs > 5) || lastMarker.type === 'sell') {
            markers.push({
                time: renderData[i].timestamp as Time,
                position: 'belowBar',
                color: '#10b981',
                shape: 'arrowUp',
                text: 'BUY',
                size: 1, // Small marker
                // custom check hack requiring indexObs
            } as SeriesMarker<Time> & { indexObs: number; type: 'buy' | 'sell' });
            // Actually, let's keep it simple and just cast it to any for the pushing, or define an interface
            // But SeriesMarker is strict.
            // Let's use `as any` for the deduplication logic to avoid complex type extension in this simplified fix.
            (markers[markers.length - 1] as any).indexObs = i;
            (markers[markers.length - 1] as any).type = 'buy';
        }
    }

    // SELL SIGNAL: RSI crosses down 70 OR Reject off Upper Band
    if ((prevRsi > 70 && currRsi <= 70) || (price >= upperBand && currRsi > 60)) {
        // Deduplicate
        const lastMarker = markers[markers.length - 1] as any;
        if (!lastMarker || (i - lastMarker.indexObs > 5) || lastMarker.type === 'buy') {
            markers.push({
                time: renderData[i].timestamp as Time,
                position: 'aboveBar',
                color: '#ef4444',
                shape: 'arrowDown',
                text: 'SELL',
                size: 1,
            } as SeriesMarker<Time>);
            (markers[markers.length - 1] as any).indexObs = i;
            (markers[markers.length - 1] as any).type = 'sell';
        }
    }
}
return markers;

const chartStats = useMemo(() => {
    if (renderData.length < 2) return null;
    const latest = renderData[renderData.length - 1];
    const first = renderData[0];
    const currentSell = latest.avgHighPrice || 0;
    const currentBuy = latest.avgLowPrice || 0;
    const spread = currentSell - currentBuy;
    const spreadPercent = currentBuy > 0 ? (spread / currentBuy) * 100 : 0;
    const priceChange = (latest.avgHighPrice || 0) - (first.avgHighPrice || 0);
    const priceChangePercent = first.avgHighPrice ? (priceChange / first.avgHighPrice) * 100 : 0;
    return { currentSell, currentBuy, spread, spreadPercent, priceChange, priceChangePercent };
}, [renderData]);

useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
        if (!itemId) return;
        setIsLoading(true);
        try {
            const result = await osrsApi.getTimeseries(itemId, selectedTimeframe);
            if (!cancelled) setData(result);
        } catch (e) {
            console.error("Failed to fetch chart data", e);
        } finally {
            if (!cancelled) setIsLoading(false);
        }
    };
    fetchData();
    return () => { cancelled = true; };
}, [itemId, selectedTimeframe]);

useEffect(() => {
    if (!chartContainerRef.current || renderData.length === 0) return;

    if (chartRef.current && !isChartDisposed.current) {
        try {
            chartRef.current.remove();
        } catch (e) {
            // ignore clean up error
        }
        chartRef.current = null;
    }
    isChartDisposed.current = false;

    const pricePaneBottom = showMACD ? 0.30 : 0.05;
    const macdPaneTop = 0.75;

    const chart = createChart(chartContainerRef.current, {
        layout: { background: { type: ColorType.Solid, color: '#020617' }, textColor: '#94a3b8', fontFamily: "'Inter', sans-serif" }, // darkened bg to slate-950
        grid: { vertLines: { color: 'rgba(30, 41, 59, 0.2)' }, horzLines: { color: 'rgba(30, 41, 59, 0.2)' } }, // More subtle grid
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
        rightPriceScale: { borderColor: '#1e293b', scaleMargins: { top: 0.1, bottom: pricePaneBottom }, visible: true },
        timeScale: { timeVisible: true, secondsVisible: selectedTimeframe === '5m', borderColor: '#1e293b' },
        crosshair: {
            mode: CrosshairMode.Normal,
            vertLine: { labelVisible: false },
            horzLine: { labelVisible: true }
        },
    });

    chartRef.current = chart;

    const timestamps = renderData.map(d => d.timestamp as Time);
    const sellPrices = renderData.map(d => d.avgHighPrice as number);

    // 1. VOLUME
    if (showVolume) {
        const volumeSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'volume', lastValueVisible: false, priceLineVisible: false });
        chart.priceScale('volume').applyOptions({ scaleMargins: { top: showMACD ? 0.50 : 0.75, bottom: showMACD ? 0.30 : 0 } });
        volumeSeries.setData(renderData.map((d, i, arr) => ({
            time: d.timestamp as Time,
            value: d.highPriceVolume + d.lowPriceVolume,
            color: (d.avgHighPrice || 0) >= (i > 0 ? (arr[i - 1].avgHighPrice || 0) : 0) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        })));
    }

    // 2. SMA
    if (showSMA && sellPrices.length >= 20) {
        const sma7 = calculateSMA(sellPrices, 7);
        const sma20 = calculateSMA(sellPrices, 20);

        const sma7Series = chart.addSeries(LineSeries, { color: 'rgba(234, 179, 8, 0.8)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        sma7Series.setData(timestamps.map((t, i) => ({ time: t, value: sma7[i] })).filter(d => d.value));

        const sma20Series = chart.addSeries(LineSeries, { color: 'rgba(168, 85, 247, 0.8)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        sma20Series.setData(timestamps.map((t, i) => ({ time: t, value: sma20[i] })).filter(d => d.value));
    }

    // 3. Price Area (Gradient)
    const sellSeries = chart.addSeries(AreaSeries, {
        lineColor: '#10b981', topColor: 'rgba(16, 185, 129, 0.10)', bottomColor: 'rgba(16, 185, 129, 0.01)', // Reduced opacity
        lineWidth: 2, priceFormat: { type: 'price', precision: 0, minMove: 1 }, title: 'Sell'
    });
    sellSeries.setData(renderData.map(d => ({ time: d.timestamp as Time, value: d.avgHighPrice as number })));

    // Realtime Price Line from Header Data
    if (latestHigh) {
        sellSeries.createPriceLine({
            price: latestHigh,
            color: '#10b981',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: false, // HIDDEN LABEL to fix clutter
            title: 'Live Sell',
        });
    }

    // SIGNALS
    if (showSignals) {
        try {
            (sellSeries as any).setMarkers(chartSignals);
        } catch (e) {
            console.warn("Failed to set markers on chart", e);
        }
    }

    const buySeries = chart.addSeries(AreaSeries, {
        lineColor: '#3b82f6', topColor: 'rgba(59, 130, 246, 0.10)', bottomColor: 'rgba(59, 130, 246, 0.01)', // Reduced opacity
        lineWidth: 2, priceFormat: { type: 'price', precision: 0, minMove: 1 }, title: 'Buy'
    });
    buySeries.setData(renderData.filter(d => d.avgLowPrice).map(d => ({ time: d.timestamp as Time, value: d.avgLowPrice as number })));

    if (latestLow) {
        buySeries.createPriceLine({
            price: latestLow,
            color: '#3b82f6',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: false, // HIDDEN LABEL to fix clutter
            title: 'Live Buy',
        });
    }

    // 4. MACD
    if (showMACD && sellPrices.length >= 26) {
        const { histogram } = calculateMACD(sellPrices);
        const macdSeries = chart.addSeries(HistogramSeries, { priceScaleId: 'macd', title: 'MACD' });
        chart.priceScale('macd').applyOptions({ scaleMargins: { top: macdPaneTop, bottom: 0 } });
        macdSeries.setData(timestamps.map((t, i) => ({ time: t, value: histogram[i], color: histogram[i] >= 0 ? '#10b981' : '#ef4444' })));
    }

    chart.timeScale().fitContent();

    // TOOLTIP
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
        if (!tooltipRef.current || !chartContainerRef.current) return;

        if (
            param.point === undefined ||
            !param.time ||
            param.point.x < 0 ||
            param.point.x > chartContainerRef.current.clientWidth ||
            param.point.y < 0 ||
            param.point.y > chartContainerRef.current.clientHeight
        ) {
            tooltipRef.current.style.opacity = '0';
            return;
        }

        const dataPoint = renderData.find(d => d.timestamp === param.time);
        if (!dataPoint) return;

        const dateStr = new Date((param.time as number) * 1000).toLocaleString();
        const sell = formatGP(dataPoint.avgHighPrice || 0);
        const buy = formatGP(dataPoint.avgLowPrice || 0);
        const vol = formatGP(dataPoint.highPriceVolume + dataPoint.lowPriceVolume);

        tooltipRef.current.innerHTML = `
                <div class="font-bold text-slate-200 mb-1">${dateStr}</div>
                <div class="flex items-center gap-2"><div class="w-2 h-2 bg-emerald-500 rounded-full"></div> <span class="text-slate-400">Sell:</span> <span class="text-emerald-400 font-mono ml-auto">${sell}</span></div>
                <div class="flex items-center gap-2"><div class="w-2 h-2 bg-blue-500 rounded-full"></div> <span class="text-slate-400">Buy:</span> <span class="text-blue-400 font-mono ml-auto">${buy}</span></div>
                <div class="flex items-center gap-2 border-t border-slate-700 mt-1 pt-1"><span class="text-slate-500">Vol:</span> <span class="text-slate-300 font-mono ml-auto">${vol}</span></div>
            `;

        const tooltipWidth = 160;
        const tooltipHeight = 100;
        const x = Math.min(chartContainerRef.current.clientWidth - tooltipWidth, Math.max(0, param.point.x));
        const y = Math.min(chartContainerRef.current.clientHeight - tooltipHeight, Math.max(0, param.point.y - 120));

        tooltipRef.current.style.left = x + 'px';
        tooltipRef.current.style.top = y + 'px';
        tooltipRef.current.style.opacity = '1';
    });

    const handleResize = () => {
        if (chartContainerRef.current && chartRef.current && !isChartDisposed.current) {
            chartRef.current.applyOptions({
                width: chartContainerRef.current.clientWidth,
                height: chartContainerRef.current.clientHeight
            });
        }
    };
    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
        isChartDisposed.current = true;
        if (chartRef.current) {
            try {
                chartRef.current.remove();
            } catch (e) {
                // ignore cleanup error
            }
            chartRef.current = null;
        }
    };
}, [renderData, selectedTimeframe, showSMA, showMACD, showVolume, showSignals, chartSignals, latestHigh, latestLow]);

const fitContent = () => {
    if (chartRef.current) chartRef.current.timeScale().fitContent();
};

const handleTimeframeChange = (step: TimeStep) => { if (step !== selectedTimeframe) setSelectedTimeframe(step); };
const TrendIcon = chartStats?.priceChange && chartStats.priceChange > 0 ? TrendingUp : chartStats?.priceChange && chartStats.priceChange < 0 ? TrendingDown : Minus;

return (
    <Card className="bg-slate-900 border-slate-800 flex flex-col relative h-full overflow-hidden">
        <div className="flex justify-between items-center px-4 py-2 border-b border-slate-800/50 bg-slate-950/30">
            <div className="flex gap-4 items-center">
                <h3 className="font-semibold text-slate-200">Price Action</h3>
                {chartStats && (
                    <div className="flex items-center gap-3 text-xs">
                        <span className="text-emerald-400 font-mono font-medium">{formatGP(chartStats.currentSell)}</span>
                        <span className="text-slate-600">/</span>
                        <span className="text-blue-400 font-mono font-medium">{formatGP(chartStats.currentBuy)}</span>
                        <span className={`font-mono flex items-center ml-2 ${chartStats.priceChange > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            <TrendIcon size={12} className="mr-1" />{Math.abs(chartStats.priceChangePercent).toFixed(2)}%
                        </span>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={fitContent} className="h-7 w-7 text-slate-400 hover:text-white" title="Reset View">
                    <Maximize2 size={14} />
                </Button>
                <div className="w-px h-4 bg-slate-800 mx-1"></div>
                <div className="flex gap-0.5 bg-slate-800/50 p-0.5 rounded-lg">
                    <Button variant="ghost" size="sm" onClick={() => setShowSignals(!showSignals)} className={`h-6 px-2 text-[10px] ${showSignals ? 'bg-slate-700 text-rose-100' : 'text-slate-500'}`}>Signals</Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowSMA(!showSMA)} className={`h-6 px-2 text-[10px] ${showSMA ? 'bg-slate-700 text-yellow-400' : 'text-slate-500'}`}>SMA</Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowMACD(!showMACD)} className={`h-6 px-2 text-[10px] ${showMACD ? 'bg-slate-700 text-emerald-400' : 'text-slate-500'}`}>MACD</Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowVolume(!showVolume)} className={`h-6 px-2 text-[10px] ${showVolume ? 'bg-slate-700 text-blue-200' : 'text-slate-500'}`}>Vol</Button>
                </div>
                <div className="flex gap-0.5 bg-slate-800/50 p-0.5 rounded-lg ml-2">
                    {TIMEFRAMES.map((tf) => (
                        <Button key={tf.step} variant="ghost" size="sm" onClick={() => handleTimeframeChange(tf.step)} className={`h-6 px-2 text-[10px] ${selectedTimeframe === tf.step ? 'bg-slate-700 text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                            {tf.label}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
        <div className="relative flex-1 w-full min-h-[350px]">
            {isLoading && <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 z-20 gap-2"><Loader2 className="animate-spin text-emerald-500" size={28} /><span className="text-xs text-slate-500">Loading chart data...</span></div>}
            <div ref={chartContainerRef} className="w-full h-full relative" />
            <div ref={tooltipRef} className="absolute pointer-events-none bg-slate-900/90 backdrop-blur border border-slate-700 p-3 rounded-lg shadow-xl z-10 transition-opacity duration-100 opacity-0 min-w-[160px] text-xs" style={{ top: 0, left: 0 }}></div>
        </div>
    </Card>
);
};

export default PriceActionChart;
