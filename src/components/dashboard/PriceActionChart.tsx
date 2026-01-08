import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, ColorType, IChartApi, Time, HistogramSeries, CrosshairMode, LineSeries, MouseEventParams, LineStyle, SeriesMarker, ISeriesApi } from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import { osrsApi, TimeSeriesPoint, TimeStep } from '@/services/osrs-api';
import { Button } from '@/components/ui/button';
import { Loader2, Maximize2, LineChart, BarChart3 } from 'lucide-react';
import { formatGP } from '@/lib/osrs-math';
import { useChartSettings } from '@/hooks/use-chart-settings';
import ChartSettingsDialog from './ChartSettingsDialog';
import ChartHeader from './chart/ChartHeader';
import IndicatorToggles from './chart/IndicatorToggles';
import TimeframeSelector from './chart/TimeframeSelector';
import { calculateSMA, calculateMACD, calculateRSI, calculateBollingerBands } from '@/lib/technical-analysis';

interface PriceActionChartProps {
    itemId: number;
    latestHigh?: number;
    latestLow?: number;
}

const PriceActionChart = ({ itemId, latestHigh, latestLow }: PriceActionChartProps) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const sellSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const [selectedTimeframe, setSelectedTimeframe] = useState<TimeStep>('5m');
    const [data, setData] = useState<TimeSeriesPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const { settings, updateSettings, resetSettings } = useChartSettings();

    const [showSMA, setShowSMA] = useState(false);
    const [showMACD, setShowMACD] = useState(true);
    const [showVolume, setShowVolume] = useState(true);
    const [showSignals, setShowSignals] = useState(false);

    const renderData = useMemo(() => {
        if (data.length === 0) return [];
        const validPoints = data.filter(d => d.avgHighPrice && d.avgHighPrice > 0);
        if (validPoints.length === 0) return [];
        const avg = validPoints.reduce((sum, d) => sum + (d.avgHighPrice || 0), 0) / validPoints.length;
        return validPoints.filter(d => (d.avgHighPrice || 0) > avg * 0.2 && (d.avgHighPrice || 0) < avg * 5);
    }, [data]);

    const chartSignals = useMemo(() => {
        if (renderData.length < 30) return [];
        const prices = renderData.map(d => d.avgHighPrice as number);
        const rsi = calculateRSI(prices);
        const bb = calculateBollingerBands(prices);
        if (!bb) return [];
        const markers: SeriesMarker<Time>[] = [];
        for (let i = 20; i < renderData.length; i++) {
            if (rsi[i] < 35) {
                markers.push({ time: renderData[i].timestamp as Time, position: 'belowBar', color: '#10b981', shape: 'arrowUp', text: 'BUY' });
            } else if (rsi[i] > 65) {
                markers.push({ time: renderData[i].timestamp as Time, position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: 'SELL' });
            }
        }
        return markers;
    }, [renderData]);

    const chartStats = useMemo(() => {
        if (renderData.length < 2) return null;
        const latest = renderData[renderData.length - 1];
        const first = renderData[0];
        const currentSell = latest.avgHighPrice || 0;
        const currentBuy = latest.avgLowPrice || 0;
        const priceChangePercent = first.avgHighPrice ? ((currentSell - first.avgHighPrice) / first.avgHighPrice) * 100 : 0;
        return { currentSell, currentBuy, priceChangePercent };
    }, [renderData]);

    useEffect(() => {
        let cancelled = false;
        osrsApi.getTimeseries(itemId, selectedTimeframe).then(res => {
            if (!cancelled) { setData(res); setIsLoading(false); }
        });
        return () => { cancelled = true; };
    }, [itemId, selectedTimeframe]);

    useEffect(() => {
        if (!chartContainerRef.current || renderData.length === 0) return;
        if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

        const chart = createChart(chartContainerRef.current, {
            layout: { background: { type: ColorType.Solid, color: '#020617' }, textColor: '#94a3b8' },
            grid: { vertLines: { color: 'rgba(30, 41, 59, 0.1)' }, horzLines: { color: 'rgba(30, 41, 59, 0.1)' } },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            rightPriceScale: { borderColor: '#1e293b' },
            timeScale: { borderColor: '#1e293b', timeVisible: true },
        });

        chartRef.current = chart;
        const sellSeries = chart.addSeries(LineSeries, { color: '#f97316', lineWidth: 2, title: 'Sell' });
        sellSeries.setData(renderData.map(d => ({ time: d.timestamp as Time, value: d.avgHighPrice as number })));
        sellSeriesRef.current = sellSeries;

        if (showVolume) {
            const vol = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'volume' });
            chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
            vol.setData(renderData.map(d => ({ time: d.timestamp as Time, value: d.highPriceVolume + d.lowPriceVolume, color: 'rgba(16, 185, 129, 0.2)' })));
        }

        chart.timeScale().fitContent();
        return () => { if (chartRef.current) chart.remove(); };
    }, [renderData, showVolume]);

    return (
        <Card className="bg-slate-900 border-slate-800 flex flex-col relative h-full overflow-hidden">
            <div className="flex justify-between items-center px-4 py-2 border-b border-slate-800/50 bg-slate-950/30">
                {chartStats && <ChartHeader {...chartStats} />}
                <div className="flex items-center gap-2">
                    <IndicatorToggles 
                        showSignals={showSignals} setShowSignals={setShowSignals}
                        showSMA={showSMA} setShowSMA={setShowSMA}
                        showMACD={showMACD} setShowMACD={setShowMACD}
                        showVolume={showVolume} setShowVolume={setShowVolume}
                    />
                    <TimeframeSelector selected={selectedTimeframe} onChange={setSelectedTimeframe} />
                    <ChartSettingsDialog settings={settings} onUpdateSettings={updateSettings} onResetSettings={resetSettings} open={settingsOpen} onOpenChange={setSettingsOpen} />
                </div>
            </div>
            <div className="relative flex-1 w-full min-h-[350px]">
                {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-20"><Loader2 className="animate-spin text-emerald-500" /></div>}
                <div ref={chartContainerRef} className="w-full h-full" />
                <div ref={tooltipRef} className="absolute pointer-events-none bg-slate-900/95 border border-slate-700 p-3 rounded-xl opacity-0 z-10"></div>
            </div>
        </Card>
    );
};

export default PriceActionChart;