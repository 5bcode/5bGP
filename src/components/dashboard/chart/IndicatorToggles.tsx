import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface IndicatorTogglesProps {
    showSignals: boolean;
    setShowSignals: (show: boolean) => void;
    showSMA: boolean;
    setShowSMA: (show: boolean) => void;
    showMACD: boolean;
    setShowMACD: (show: boolean) => void;
    showVolume: boolean;
    setShowVolume: (show: boolean) => void;
}

const IndicatorToggles = ({
    showSignals, setShowSignals,
    showSMA, setShowSMA,
    showMACD, setShowMACD,
    showVolume, setShowVolume
}: IndicatorTogglesProps) => {
    return (
        <div className="flex gap-0.5 bg-slate-800/50 p-0.5 rounded-lg">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSignals(!showSignals)}
                className={cn(
                    "h-6 px-2 text-[10px] transition-all",
                    showSignals ? "bg-rose-900/40 text-rose-200 ring-1 ring-rose-500/50" : "text-slate-500"
                )}
            >
                Signals
            </Button>
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowSMA(!showSMA)} 
                className={cn("h-6 px-2 text-[10px]", showSMA ? "bg-slate-700 text-yellow-400" : "text-slate-500")}
            >
                SMA
            </Button>
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowMACD(!showMACD)} 
                className={cn("h-6 px-2 text-[10px]", showMACD ? "bg-slate-700 text-emerald-400" : "text-slate-500")}
            >
                MACD
            </Button>
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowVolume(!showVolume)} 
                className={cn("h-6 px-2 text-[10px]", showVolume ? "bg-slate-700 text-blue-200" : "text-slate-500")}
            >
                Vol
            </Button>
        </div>
    );
};

export default IndicatorToggles;