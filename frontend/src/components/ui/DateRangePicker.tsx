import { useState } from 'react';
import { FaCalendar, FaXmark } from 'react-icons/fa6';
import clsx from 'clsx';

interface DateRangePickerProps {
    value: { start: Date; end: Date } | null;
    onChange: (range: { start: Date; end: Date } | null) => void;
    minDate?: Date;
    maxDate?: Date;
}

export function DateRangePicker({ 
    value, 
    onChange, 
    minDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
    maxDate = new Date() 
}: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [tempStart, setTempStart] = useState(value?.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)); // 1 week ago
    const [tempEnd, setTempEnd] = useState(value?.end || new Date());

    const handleApply = () => {
        if (tempStart && tempEnd && tempStart <= tempEnd) {
            onChange({ start: tempStart, end: tempEnd });
            setIsOpen(false);
        }
    };

    const handleClear = () => {
        onChange(null);
        setIsOpen(false);
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    };

    const formatInputDate = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-md transition-all border",
                    value 
                        ? "bg-gold/20 text-gold border-gold/30" 
                        : "bg-zinc-900 text-muted hover:text-secondary border-border"
                )}
            >
                <FaCalendar className="text-xs" />
                {value ? (
                    <span className="text-xs">
                        {formatDate(value.start)} - {formatDate(value.end)}
                    </span>
                ) : (
                    <span className="text-xs">Custom Range</span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-80 bg-card border border-border rounded-lg shadow-lg z-50 p-4">
                    <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium text-sm">Select Date Range</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-muted hover:text-secondary"
                            >
                                <FaXmark className="text-xs" />
                            </button>
                        </div>

                        {/* Date Inputs */}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-muted mb-1">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={formatInputDate(tempStart)}
                                    onChange={(e) => setTempStart(new Date(e.target.value))}
                                    min={formatInputDate(minDate)}
                                    max={formatInputDate(maxDate)}
                                    className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-primary focus:outline-none focus:border-gold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted mb-1">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={formatInputDate(tempEnd)}
                                    onChange={(e) => setTempEnd(new Date(e.target.value))}
                                    min={formatInputDate(tempStart)}
                                    max={formatInputDate(maxDate)}
                                    className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-primary focus:outline-none focus:border-gold"
                                />
                            </div>
                        </div>

                        {/* Quick Selects */}
                        <div>
                            <label className="block text-xs font-medium text-muted mb-2">Quick Select</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => {
                                        const now = new Date();
                                        setTempEnd(now);
                                        setTempStart(new Date(now.getTime() - 24 * 60 * 60 * 1000)); // 1 day
                                    }}
                                    className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                                >
                                    Last 24h
                                </button>
                                <button
                                    onClick={() => {
                                        const now = new Date();
                                        setTempEnd(now);
                                        setTempStart(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)); // 1 week
                                    }}
                                    className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                                >
                                    Last Week
                                </button>
                                <button
                                    onClick={() => {
                                        const now = new Date();
                                        setTempEnd(now);
                                        setTempStart(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)); // 1 month
                                    }}
                                    className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                                >
                                    Last Month
                                </button>
                                <button
                                    onClick={() => {
                                        const now = new Date();
                                        setTempEnd(now);
                                        setTempStart(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)); // 3 months
                                    }}
                                    className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                                >
                                    Last 3 Months
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleClear}
                                className="flex-1 px-3 py-1 text-xs font-medium text-muted hover:text-secondary border border-border rounded transition-colors"
                            >
                                Clear
                            </button>
                            <button
                                onClick={handleApply}
                                className="flex-1 px-3 py-1 text-xs font-medium bg-gold hover:bg-yellow-400 text-black rounded transition-colors"
                                disabled={!tempStart || !tempEnd || tempStart > tempEnd}
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Overlay to close when clicking outside */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}