import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ComparativeChart } from '../components/ui/ComparativeChart';
import { DateRangePicker } from '../components/ui/DateRangePicker';
import { FaArrowLeft } from 'react-icons/fa6';

// Timeframe configurations (same as ItemDetail)
const TIMEFRAMES = [
    { key: '5m', label: '5M', description: 'Last ~24 hours (5-min intervals)' },
    { key: '1h', label: '1H', description: 'Last week (1-hour intervals)' },
    { key: '6h', label: '6H', description: 'Last month (6-hour intervals)' },
] as const;

export function ComparativeAnalysis() {
    const navigate = useNavigate();
    const { ids } = useParams<{ ids?: string }>();
    
    // Parse initial item IDs from URL
    const initialItems = ids ? ids.split(',').map(Number).filter(id => !isNaN(id)) : [];
    
    const [timestep, setTimestep] = useState<string>('5m');
    const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | null>(null);
    const [selectedItems, setSelectedItems] = useState<number[]>(initialItems);

    const handleItemsChange = (items: number[]) => {
        setSelectedItems(items);
        // Update URL to reflect current selection
        if (items.length > 0) {
            navigate(`/compare/${items.join(',')}`, { replace: true });
        } else {
            navigate('/compare', { replace: true });
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-hover rounded-full text-muted hover:text-primary transition-colors"
                        aria-label="Go Back"
                    >
                        <FaArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">Comparative Analysis</h1>
                        <p className="text-secondary text-sm">Compare price movements across multiple items</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {/* Date Range Picker */}
                    <DateRangePicker
                        value={customDateRange}
                        onChange={setCustomDateRange}
                    />
                    
                    {/* Timeframe Selector */}
                    <div className="flex bg-background rounded-lg p-1 border border-border">
                        {TIMEFRAMES.map((t) => (
                            <button
                                key={t.key}
                                onClick={() => {
                                    setTimestep(t.key);
                                    setCustomDateRange(null); // Clear custom range when selecting preset
                                }}
                                title={t.description}
                                className="px-3 py-1 text-xs font-medium rounded-md transition-all bg-hover text-primary shadow-sm"
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Comparative Chart */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm h-[600px]">
                <ComparativeChart
                    initialItems={selectedItems}
                    timestep={timestep}
                    customDateRange={customDateRange}
                    onItemsChange={handleItemsChange}
                />
            </div>

            {/* Instructions */}
            {selectedItems.length === 0 && (
                <div className="bg-card border border-border rounded-xl p-6 text-center">
                    <h3 className="text-lg font-semibold mb-2">How to Use Comparative Analysis</h3>
                    <div className="text-muted space-y-2 text-sm">
                        <p>1. Enter item IDs in the input field (e.g., 4151 for Abyssal Whip)</p>
                        <p>2. Add multiple items to compare their price movements</p>
                        <p>3. Use the timeframe selector to change the data range</p>
                        <p>4. Enable volume to see trading volume alongside prices</p>
                        <p>5. Use zoom controls to analyze specific time periods</p>
                    </div>
                </div>
            )}
        </div>
    );
}