import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, ColorType, IChartApi, Time, AreaSeries, HistogramSeries, CrosshairMode, LineSeries, MouseEventParams, LineStyle, SeriesMarker, ISeriesApi } from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import { osrsApi, TimeSeriesPoint, TimeStep } from '@/services/osrs-api';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, Minus, Maximize2, LineChart, BarChart3 } from 'lucide-react';
import { formatGP } from '@/lib/osrs-math';
import { useChartSettings } from '@/hooks/use-chart-settings';
import ChartSettingsDialog from './ChartSettingsDialog';

interface PriceActionChartProps {
    itemId: number;
    latestHigh?: number;
    latestLow?: number;
}

type TimeframeOption = {
    label: string;
    step: TimeStep;
};

// Use type intersection instead of interface extension for compatibility with union types
type MarkerWithMeta = SeriesMarker<Time> & {
    indexObs: number;
    type: 'buy' | 'sell';
};

const TIMEFRAMES: TimeframeOption[] = [
    { label: '5M', step: '5m' },
    { label: '1H', step: '1h' },
    { label: '6H', step: '6h' },
    { label: '1D', step: '24h' },
];

const calculateSMA = (data: number[], period: number): (number | null)[] => {
    const result: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) result.push(null);
        else result.push(data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period);
    }
    return result;
};

const calculateEMA = (data: number[], period: number): number[] => {
    const k = 2 / (period + 1);
    const result: number[] = [];
    let ema = data[0];
    result.push(ema);
    for (let i = 1; i < data.length; i++) {
        ema = data[i] * k + ema * (1 - k);
        result.push(ema);
    }
    return result;
}

const calculateMACD = (data: number[]): { macd: number[]; signal: number[]; histogram: number[] } => {
    if (data.length < 26) return { macd: [], signal: [], histogram: [] };
    const ema12 = calculateEMA(data, 12);
    const ema26 = calculateEMA(data, 26);
    const macdLine = data.map((_, i) => ema12[i] - ema26[i]);
    const signalLine = calculateEMA(macdLine, 9);
    const histogram = macdLine.map((m, i) => m - signalLine[i]);
    return { macd: macdLine, signal: signalLine, histogram };
};

const calculateRSI = (data: number[], period: number = 14): number[] => {
    if (data.length <= period) return new Array(data.length).fill(NaN);
    const rsi: number[] = [];
    let gains = 0;
    let losses = 0;

    // Calculate initial average gain/loss
    for (let i = 1; i <= period; i++) {
        const change = data[i] - data[i - 1];
        if (change > 0) gains += change;
        else losses += Math.abs(change);
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    rsi.push(100 - (100 / (1 + avgGain / avgLoss)));

    // Smooth subsequent values
    for (let i = period + 1; i < data.length; i++) {
        const change = data[i] - data[i - 1];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        rsi.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)));
    }

    // Pad initial values to align with data array
    return [...new Array(period).fill(NaN), rsi[0], ...rsi.slice(1)];
};

const calculateBollinger = (data: number[], period: number = 20, multiplier: number = 2) => {
    const upper: (number | null)[] = [];
    const lower: (number | null)[] = [];
    const sma = calculateSMA(data, period);

    for (let i = 0; i < data.length; i++) {
        const avg = sma[i];
        if (avg === null) {
            upper.push(null);
            lower.push(null);
            continue;
        }

        // StdDev
        const slice = data.slice(i - period + 1, i + 1);
        const sumSq = slice.reduce((a, b) => a + Math.pow(b - avg, 2), 0);
        const stdDev = Math.sqrt(sumSq / period);

        upper.push(avg + stdDev * multiplier);
        lower.push(avg - stdDev * multiplier);
    }
    return { upper, lower };
}

const PriceActionChart = ({ itemId, latestHigh, latestLow }: PriceActionChartProps) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const sellSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
    const isChartDisposed = useRef(false);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const [selectedTimeframe, setSelectedTimeframe] = useState<TimeStep>('5m');
    const [data, setData] = useState<TimeSeriesPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Chart Settings
    const { settings, updateSettings, resetSettings } = useChartSettings();

    // Default Indicators
    const [showSMA, setShowSMA] = useState(false);
    const [showMACD, setShowMACD] = useState(true);
    const [showVolume, setShowVolume] = useState(true);
    const [showSignals, setShowSignals] = useState(false);

    const renderData = useMemo(() => {
        if (data.length === 0) return [];
        const validPoints = data.filter(d => d.avgHighPrice && d.avgHighPrice > 0);
        if (validPoints.length === 0) return [];

        const total = validPoints.reduce((sum, d) => sum + (d.avgHighPrice || 0), 0);
        const avg = total / validPoints.length;

        // Filter outliers
        return validPoints.filter(d =>
            (d.avgHighPrice || 0) > avg * 0.2 &&
            (d.avgHighPrice || 0) < avg * 5
        );
    }, [data]);

    // Calculate weighted average price (volume-weighted)
    const weightedPriceData = useMemo(() => {
        return renderData.map(d => {
            const highVol = d.highPriceVolume || 0;
            const lowVol = d.lowPriceVolume || 0;
            const totalVol = highVol + lowVol;
            if (totalVol === 0) {
                // Fallback to simple average if no volume
                return {
                    timestamp: d.timestamp,
                    weightedPrice: ((d.avgHighPrice || 0) + (d.avgLowPrice || 0)) / 2
                };
            }
            // Volume-weighted average
            const weightedPrice = (
                (d.avgHighPrice || 0) * highVol +
                (d.avgLowPrice || 0) * lowVol
            ) / totalVol;
            return { timestamp: d.timestamp, weightedPrice };
        });
    }, [renderData]);

    const chartSignals = useMemo(() => {
        if (renderData.length < 30) return [];
        const prices = renderData.map(d => d.avgHighPrice as number);
        const rsi = calculateRSI(prices);
        const { lower, upper } = calculateBollinger(prices);

        const markers: MarkerWithMeta[] = [];

        // Generate signals
        for (let i = 20; i < renderData.length; i++) {
            const price = prices[i];
            const prevRsi = rsi[i - 1];
            const currRsi = rsi[i];
            const lowerBand = lower[i];
            const upperBand = upper[i];

            if (!lowerBand || !upperBand || isNaN(currRsi)) continue;

            // BUY SIGNAL: RSI crosses up 35 (relaxed from 30) OR Bounce off Lower Band with low RSI
            if ((prevRsi < 35 && currRsi >= 35) || (price <= lowerBand && currRsi < 45)) {
                // Deduplicate: Don't spam buy signals
                const lastMarker = markers[markers.length - 1];
                if (!lastMarker || (i - lastMarker.indexObs > 5) || lastMarker.type === 'sell') {
                    markers.push({
                        time: renderData[i].timestamp as Time,
                        position: 'belowBar',
                        color: '#10b981',
                        shape: 'arrowUp',
                        text: 'BUY',
                        size: 2,
                        indexObs: i,
                        type: 'buy'
                    });
                }
            }

            // SELL SIGNAL: RSI crosses down 65 (relaxed from 70) OR Reject off Upper Band with high RSI
            if ((prevRsi > 65 && currRsi <= 65) || (price >= upperBand && currRsi > 55)) {
                // Deduplicate
                const lastMarker = markers[markers.length - 1];
                if (!lastMarker || (i - lastMarker.indexObs > 5) || lastMarker.type === 'buy') {
                    markers.push({
                        time: renderData[i].timestamp as Time,
                        position: 'aboveBar',
                        color: '#ef4444',
                        shape: 'arrowDown',
                        text: 'SELL',
                        size: 2,
                        indexObs: i,
                        type: 'sell'
                    });
                }
            }
        }
        console.log(`[PriceActionChart] Generated ${markers.length} signals`);
        return markers;
    }, [renderData]);

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

    // Initialize Chart
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
            layout: { background: { type: ColorType.Solid, color: '#020617' }, textColor: '#94a3b8', fontFamily: "'Inter', sans-serif" },
            grid: { vertLines: { color: 'rgba(30, 41, 59, 0.2)' }, horzLines: { color: 'rgba(30, 41, 59, 0.2)' } },
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

        // 3. Price Series - MODE DEPENDENT
        if (settings.priceMode === 'weighted') {
            // WEIGHTED MODE: Single volume-weighted average line
            const weightedSeries = chart.addSeries(LineSeries, {
                color: '#ef4444',
                lineWidth: 2,
                priceFormat: { type: 'price', precision: 0, minMove: 1 },
                title: 'Weighted',
                crosshairMarkerVisible: settings.showPointMarkers,
            });
            weightedSeries.setData(weightedPriceData.map(d => ({
                time: d.timestamp as Time,
                value: d.weightedPrice
            })));
            sellSeriesRef.current = null; // Not using area series in weighted mode

            // Add recent price line
            if (settings.showRecentPriceLine && latestHigh && latestLow) {
                const avgLatest = (latestHigh + latestLow) / 2;
                weightedSeries.createPriceLine({
                    price: avgLatest,
                    color: '#ef4444',
                    lineWidth: 1,
                    lineStyle: LineStyle.Dashed,
                    axisLabelVisible: true,
                    title: 'Live',
                });
            }
        } else {
            // HIGH/LOW MODE: Dual lines for buy and sell
            // Sell Line (High Price) - Orange/Yellow color to match reference
            const sellSeries = chart.addSeries(LineSeries, {
                color: '#f97316', // Orange
                lineWidth: 2,
                priceFormat: { type: 'price', precision: 0, minMove: 1 },
                title: 'Sell',
                crosshairMarkerVisible: settings.showPointMarkers,
                lastValueVisible: true,
            });
            sellSeries.setData(renderData.map(d => ({ time: d.timestamp as Time, value: d.avgHighPrice as number })));
            sellSeriesRef.current = sellSeries as unknown as ISeriesApi<"Area">;

            // Buy Line (Low Price) - Cyan/Blue color to match reference
            const buySeries = chart.addSeries(LineSeries, {
                color: '#06b6d4', // Cyan
                lineWidth: 2,
                priceFormat: { type: 'price', precision: 0, minMove: 1 },
                title: 'Buy',
                crosshairMarkerVisible: settings.showPointMarkers,
                lastValueVisible: true,
            });
            buySeries.setData(renderData.filter(d => d.avgLowPrice).map(d => ({ time: d.timestamp as Time, value: d.avgLowPrice as number })));

            // Realtime Price Lines
            if (settings.showRecentPriceLine) {
                if (latestHigh) {
                    sellSeries.createPriceLine({
                        price: latestHigh,
                        color: '#f97316',
                        lineWidth: 1,
                        lineStyle: LineStyle.Dashed,
                        axisLabelVisible: true,
                        title: '',
                    });
                }
                if (latestLow) {
                    buySeries.createPriceLine({
                        price: latestLow,
                        color: '#06b6d4',
                        lineWidth: 1,
                        lineStyle: LineStyle.Dashed,
                        axisLabelVisible: true,
                        title: '',
                    });
                }
            }
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
                <div class="font-medium text-slate-300 mb-2 pb-2 border-b border-slate-700/50">${dateStr}</div>
                <div class="flex items-center gap-3 mb-1.5"><div class="w-2 h-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] rounded-full"></div> <span class="text-slate-400">Sell:</span> <span class="text-emerald-400 font-mono font-medium ml-auto">${sell}</span></div>
                <div class="flex items-center gap-3 mb-1.5"><div class="w-2 h-2 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] rounded-full"></div> <span class="text-slate-400">Buy:</span> <span class="text-blue-400 font-mono font-medium ml-auto">${buy}</span></div>
                <div class="flex items-center gap-3 pt-1.5 border-t border-slate-700/50"><span class="text-slate-500 text-[10px] uppercase tracking-wider">Volume</span> <span class="text-slate-300 font-mono ml-auto">${vol}</span></div>
            `;

            const tooltipWidth = 180;
            const tooltipHeight = 130;
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
                sellSeriesRef.current = null;
            }
        };
    }, [renderData, selectedTimeframe, showSMA, showMACD, showVolume, latestHigh, latestLow, settings.priceMode, settings.showPointMarkers, settings.showRecentPriceLine, weightedPriceData]);

    // Separate Effect for Signals to allow toggling without redraw
    useEffect(() => {
        if (!sellSeriesRef.current) return;

        try {
            // Define minimal interface to satisfy TS without full library type complexity
            type SeriesWithMarkers = { setMarkers: (m: SeriesMarker<Time>[]) => void };
            const series = sellSeriesRef.current as unknown as SeriesWithMarkers;

            if (showSignals) {
                // We use 'as unknown' and specific casting to satisfy strict TS rules without 'any'
                const safeMarkers = chartSignals.map(m => ({
                    time: m.time,
                    position: m.position,
                    shape: m.shape,
                    color: m.color,
                    text: m.text,
                    size: m.size
                } as SeriesMarker<Time>));

                // Define a minimal interface for the method we need, bypassing generic complexity
                if (typeof series.setMarkers === 'function') {
                    series.setMarkers(safeMarkers);
                }
            } else {
                if (typeof series.setMarkers === 'function') {
                    series.setMarkers([]);
                }
            }
        } catch (e) {
            console.warn("Failed to set markers:", e);
        }
    }, [showSignals, chartSignals]);

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
                    {/* Price Mode Toggle */}
                    <div className="flex gap-0.5 bg-slate-800/50 p-0.5 rounded-lg border border-slate-700/50">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateSettings({ priceMode: 'highlow' })}
                            className={`h-7 w-7 transition-all ${settings.priceMode === 'highlow'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                            title="High/Low Mode"
                        >
                            <LineChart size={14} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateSettings({ priceMode: 'weighted' })}
                            className={`h-7 w-7 transition-all ${settings.priceMode === 'weighted'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                            title="Weighted Avg Mode"
                        >
                            <BarChart3 size={14} />
                        </Button>
                    </div>

                    <Button variant="ghost" size="icon" onClick={fitContent} className="h-7 w-7 text-slate-400 hover:text-white" title="Reset View">
                        <Maximize2 size={14} />
                    </Button>
                    <div className="w-px h-4 bg-slate-800 mx-1"></div>
                    <div className="flex gap-0.5 bg-slate-800/50 p-0.5 rounded-lg">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowSignals(!showSignals)}
                            className={`h-6 px-2 text-[10px] transition-all duration-300 ${showSignals
                                ? 'bg-rose-900/40 text-rose-200 ring-1 ring-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                                : 'text-slate-500 hover:text-rose-300 hover:bg-slate-800'
                                }`}
                        >
                            Signals
                        </Button>
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

                    {/* Settings Button */}
                    <ChartSettingsDialog
                        settings={settings}
                        onUpdateSettings={updateSettings}
                        onResetSettings={resetSettings}
                        open={settingsOpen}
                        onOpenChange={setSettingsOpen}
                    />
                </div>
            </div>
            <div className="relative flex-1 w-full min-h-[350px]">
                {isLoading && <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 z-20 gap-2"><Loader2 className="animate-spin text-emerald-500" size={28} /><span className="text-xs text-slate-500">Loading chart data...</span></div>}

                {/* No Signals Warning */}
                {showSignals && chartSignals.length === 0 && !isLoading && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-in fade-in zoom-in-95 duration-300">
                        <div className="bg-slate-900/90 backdrop-blur border border-rose-500/30 text-rose-200 text-[10px] px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 ring-1 ring-rose-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                            No signals detected in current timeframe
                        </div>
                    </div>
                )}

                <div ref={chartContainerRef} className="w-full h-full relative" />
                <div ref={tooltipRef} className="absolute pointer-events-none bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-3 rounded-xl shadow-2xl z-10 transition-opacity duration-100 opacity-0 min-w-[180px] text-xs ring-1 ring-white/5" style={{ top: 0, left: 0 }}></div>
            </div>
        </Card>
    );
};

export default PriceActionChart;
