import React from 'react';
import { useSignalSettings } from '@/contexts/useSignalSettings';
import { FREQUENCY_OPTIONS, RiskLevel } from '@/contexts/signal-settings-types';
import { Settings2 } from 'lucide-react';

interface SignalSettingsPanelProps {
    compact?: boolean;
}

const SignalSettingsPanel = ({ compact = false }: SignalSettingsPanelProps) => {
    const { settings, setFrequency, setRiskLevel, frequencyLabel } = useSignalSettings();

    const riskLevels: { value: RiskLevel; label: string }[] = [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Med' },
        { value: 'high', label: 'High' },
    ];

    // Find current frequency index for slider
    const currentFreqIndex = FREQUENCY_OPTIONS.findIndex(o => o.minutes === settings.frequencyMinutes);
    const sliderIndex = currentFreqIndex >= 0 ? currentFreqIndex : 0;

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const index = parseInt(e.target.value);
        if (FREQUENCY_OPTIONS[index]) {
            setFrequency(FREQUENCY_OPTIONS[index].minutes);
        }
    };

    if (compact) {
        return (
            <div className="flex items-center gap-3 text-xs">
                {/* Frequency Buttons */}
                <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                    {FREQUENCY_OPTIONS.map(opt => (
                        <button
                            key={opt.minutes}
                            onClick={() => setFrequency(opt.minutes)}
                            className={`px-2 py-1 rounded transition-colors ${settings.frequencyMinutes === opt.minutes
                                ? 'bg-amber-500 text-slate-900 font-semibold'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* Risk Buttons */}
                <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                    {riskLevels.map(r => (
                        <button
                            key={r.value}
                            onClick={() => setRiskLevel(r.value)}
                            className={`px-2 py-1 rounded transition-colors ${settings.riskLevel === r.value
                                ? 'bg-amber-500 text-slate-900 font-semibold'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 text-slate-300">
                <Settings2 size={14} className="text-slate-500" />
                <span className="text-xs font-medium uppercase tracking-wide">Signal Settings</span>
            </div>

            {/* Frequency Selection */}
            <div className="space-y-2">
                <p className="text-sm text-slate-400">How often do you adjust offers?</p>

                {/* Button Row */}
                <div className="flex items-center gap-1">
                    {FREQUENCY_OPTIONS.map(opt => (
                        <button
                            key={opt.minutes}
                            onClick={() => setFrequency(opt.minutes)}
                            className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${settings.frequencyMinutes === opt.minutes
                                ? 'bg-slate-700 text-white border border-slate-600'
                                : 'bg-slate-800 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-300'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                    {/* More options indicator */}
                    <button className="px-2 py-1.5 rounded-lg bg-amber-500 text-slate-900 font-bold text-sm">
                        ···
                    </button>
                </div>

                {/* Slider */}
                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min={0}
                        max={FREQUENCY_OPTIONS.length - 1}
                        value={sliderIndex}
                        onChange={handleSliderChange}
                        className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                            [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                            [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-amber-500 
                            [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                    />
                    <span className="text-amber-400 font-mono text-sm w-10 text-right">{frequencyLabel}</span>
                </div>
            </div>

            {/* Risk Level Selection */}
            <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">Risk level:</span>
                <div className="flex items-center gap-1">
                    {riskLevels.map(r => (
                        <button
                            key={r.value}
                            onClick={() => setRiskLevel(r.value)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${settings.riskLevel === r.value
                                ? 'bg-amber-500 text-slate-900'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                                }`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SignalSettingsPanel;
