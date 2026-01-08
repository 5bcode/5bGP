import React from 'react';
import { cn } from '@/lib/utils';
import { formatGP } from '@/lib/osrs-math';

interface ScannerRangeBarProps {
    current: number;
    low: number;
    high: number;
    className?: string;
    showLabels?: boolean;
}

const ScannerRangeBar = ({ current, low, high, className, showLabels = false }: ScannerRangeBarProps) => {
    // Guard against division by zero or invalid data
    if (!high || !low || high === low) {
        return <div className="h-1 w-full bg-slate-800 rounded opacity-20" />;
    }

    // Calculate percentage position (0 to 100)
    // Clamp between 0 and 100
    let percent = ((current - low) / (high - low)) * 100;
    percent = Math.max(0, Math.min(100, percent));

    // Determine color based on position
    // Near Low (0-20%) = Green (Good buy)
    // Near High (80-100%) = Red (Bad buy/Good sell)
    // Middle = Blue/Webos
    let markerColor = "bg-blue-400";
    if (percent < 20) markerColor = "bg-emerald-400";
    else if (percent > 80) markerColor = "bg-rose-400";

    return (
        <div className={cn("flex flex-col w-full", className)}>
            <div className="relative h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                {/* Range Track */}
                <div className="absolute inset-y-0 left-0 w-full bg-slate-800" />

                {/* Current Position Marker */}
                {/* We render a small pill or dot. Using absolute positioning. */}
                <div
                    className={cn("absolute top-0 bottom-0 w-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] transition-all duration-500", markerColor)}
                    style={{ left: `${percent}%`, transform: 'translateX(-50%)' }}
                />
            </div>

            {showLabels && (
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                    <span>L: {formatGP(low)}</span>
                    <span>H: {formatGP(high)}</span>
                </div>
            )}
        </div>
    );
};

export default ScannerRangeBar;
