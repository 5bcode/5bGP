import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, Time, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import { TimeSeriesPoint } from '@/services/osrs-api';
import { Button } from '@/components/ui/button';
import { Settings, Maximize2, Camera } from 'lucide-react';

interface PriceActionChartProps {
    data: TimeSeriesPoint[];
}

const PriceActionChart = ({ data }: PriceActionChartProps) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#0f172a' }, // Slate-950
                textColor: '#94a3b8',
            },
            grid: {
                vertLines: { color: '#1e293b' },
                horzLines: { color: '#1e293b' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
        });

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981', // Emerald-500
            downColor: '#ef4444', // Rose-500
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
        });

        const candleData = data.map(d => ({
            time: d.timestamp as Time,
            open: d.avgLowPrice || 0,
            high: (d.avgHighPrice || 0) * 1.01,
            low: (d.avgLowPrice || 0) * 0.99,
            close: d.avgHighPrice || 0,
        })).filter(d => d.open > 0);

        candlestickSeries.setData(candleData);

        const volumeSeries = chart.addSeries(HistogramSeries, {
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '',
        });

        volumeSeries.priceScale().applyOptions({
            scaleMargins: {
                top: 0.8,
                bottom: 0,
            },
        });

        const histogramData = data.map(d => ({
            time: d.timestamp as Time,
            value: d.highPriceVolume + d.lowPriceVolume,
            color: (d.avgHighPrice || 0) > (d.avgLowPrice || 0) ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
        })).filter(d => d.value > 0);

        volumeSeries.setData(histogramData);

        chart.timeScale().fitContent();

        chartRef.current = chart;

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data]);

    return (
        <Card className="bg-slate-900 border-slate-800 p-1 flex flex-col relative group">
            <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white bg-slate-800/50 backdrop-blur">
                    <Settings size={14} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white bg-slate-800/50 backdrop-blur">
                    <Maximize2 size={14} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white bg-slate-800/50 backdrop-blur">
                    <Camera size={14} />
                </Button>
            </div>

            <div className="flex justify-between items-center px-4 py-2 border-b border-slate-800/50">
                <div className="flex gap-4">
                    <h3 className="font-semibold text-slate-200">Price Action</h3>
                </div>
                <div className="flex gap-2 text-xs">
                    <Button variant="ghost" size="sm" className="h-6 text-slate-400 hover:text-emerald-400">1H</Button>
                    <Button variant="ghost" size="sm" className="h-6 text-emerald-500 bg-emerald-500/10">1W</Button>
                    <Button variant="ghost" size="sm" className="h-6 text-slate-400 hover:text-emerald-400">1M</Button>
                    <Button variant="ghost" size="sm" className="h-6 text-slate-400 hover:text-emerald-400">ALL</Button>
                </div>
            </div>

            <div ref={chartContainerRef} className="w-full h-[400px]" />
        </Card>
    );
};

export default PriceActionChart;
