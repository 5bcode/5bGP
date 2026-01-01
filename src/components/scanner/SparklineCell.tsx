import React, { useEffect, useRef, useMemo } from 'react';

interface SparklineData {
    timestamp: number;
    value: number;
}

interface SparklineCellProps {
    data: SparklineData[];
    width?: number;
    height?: number;
    showDualLines?: boolean; // For buy/sell lines
    buyData?: SparklineData[];
    sellData?: SparklineData[];
}

const SparklineCell = ({
    data,
    width = 80,
    height = 32,
    showDualLines = false,
    buyData,
    sellData,
}: SparklineCellProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Determine trend direction and color
    const trend = useMemo(() => {
        if (!data || data.length < 2) return 'neutral';
        const first = data[0]?.value ?? 0;
        const last = data[data.length - 1]?.value ?? 0;
        if (last > first * 1.01) return 'up';
        if (last < first * 0.99) return 'down';
        return 'neutral';
    }, [data]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set up high DPI
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);

        // Clear
        ctx.clearRect(0, 0, width, height);

        const drawLine = (lineData: SparklineData[], color: string, lineWidth: number = 1.5) => {
            if (!lineData || lineData.length < 2) return;

            // Calculate bounds
            const values = lineData.map(d => d.value).filter(v => v != null && !isNaN(v));
            if (values.length < 2) return;

            const minVal = Math.min(...values);
            const maxVal = Math.max(...values);
            const range = maxVal - minVal || 1;

            // Padding
            const padding = 2;
            const chartWidth = width - padding * 2;
            const chartHeight = height - padding * 2;

            // Draw
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            lineData.forEach((point, i) => {
                if (point.value == null || isNaN(point.value)) return;

                const x = padding + (i / (lineData.length - 1)) * chartWidth;
                const y = padding + chartHeight - ((point.value - minVal) / range) * chartHeight;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.stroke();
        };

        if (showDualLines && buyData && sellData) {
            // Dual lines for buy/sell
            drawLine(buyData, '#06b6d4', 1.2);  // Cyan for buy
            drawLine(sellData, '#f97316', 1.2); // Orange for sell
        } else {
            // Single line with trend color
            const color = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#64748b';
            drawLine(data, color, 1.5);
        }

    }, [data, buyData, sellData, width, height, showDualLines, trend]);

    if (!data || data.length < 2) {
        return (
            <div
                className="flex items-center justify-center text-slate-600 text-xs"
                style={{ width, height }}
            >
                —
            </div>
        );
    }

    return (
        <canvas
            ref={canvasRef}
            style={{
                width,
                height,
                display: 'block',
            }}
        />
    );
};

export default SparklineCell;
