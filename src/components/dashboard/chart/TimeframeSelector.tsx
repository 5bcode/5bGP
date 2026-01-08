import React from 'react';
import { Button } from '@/components/ui/button';
import { TimeStep } from '@/services/osrs-api';

interface TimeframeSelectorProps {
    selected: TimeStep;
    onChange: (step: TimeStep) => void;
}

const TIMEFRAMES: { label: string; step: TimeStep }[] = [
    { label: '5M', step: '5m' },
    { label: '1H', step: '1h' },
    { label: '6H', step: '6h' },
    { label: '1D', step: '24h' },
];

const TimeframeSelector = ({ selected, onChange }: TimeframeSelectorProps) => {
    return (
        <div className="flex gap-0.5 bg-slate-800/50 p-0.5 rounded-lg ml-2">
            {TIMEFRAMES.map((tf) => (
                <Button 
                    key={tf.step} 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onChange(tf.step)} 
                    className={`h-6 px-2 text-[10px] ${selected === tf.step ? 'bg-slate-700 text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    {tf.label}
                </Button>
            ))}
        </div>
    );
};

export default TimeframeSelector;