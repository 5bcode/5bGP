import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Item } from '@/services/osrs-api';
import { useMarketAnalysis, DEFAULT_STRATEGY, MarketOpportunity } from '@/hooks/use-market-analysis';
import { useMarketData } from '@/hooks/use-osrs-query';
import { useStrategies, Strategy } from '@/hooks/use-strategies';
import { useScannerColumns, ALL_COLUMNS, ScannerRow } from '@/hooks/use-scanner-columns';
import { useScannerFilters } from '@/hooks/use-scanner-filters';
import { Loader2, ArrowLeft, TrendingUp, ArrowDown, Trash2, RefreshCw, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import ScannerTable from '@/components/ScannerTable';
import StrategyBuilder from '@/components/StrategyBuilder';
import ColumnSelectorDialog from '@/components/scanner/ColumnSelectorDialog';
import FilterBuilderPanel from '@/components/scanner/FilterBuilderPanel';
import SavedFiltersDialog from '@/components/scanner/SavedFiltersDialog';

const Scanner = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const typeParam = searchParams.get('type') === 'crash' ? 'crash' : 'flip';

    const [type, setType] = useState<'crash' | 'flip'>(typeParam);
    const [trackedIds, setTrackedIds] = useState<Set<number>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'score',
        direction: 'desc'
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Strategy Management
    const { strategies, saveStrategy, deleteStrategy } = useStrategies();
    const [selectedStrategyId, setSelectedStrategyId] = useState<string>('default_safe');

    const currentStrategy = useMemo(() => {
        return strategies.find(s => s.id === selectedStrategyId) || DEFAULT_STRATEGY;
    }, [strategies, selectedStrategyId]);

    // Column & Filter Hooks
    const {
        columns,
        visibleColumns,
        columnsByCategory,
        toggleColumn,
        resetToDefault: resetColumns,
        isColumnVisible,
    } = useScannerColumns();

    const {
        conditions,
        presets,
        addCondition,
        updateCondition,
        removeCondition,
        clearConditions,
        loadPreset,
        saveAsPreset,
        deletePreset,
        filterRow,
        activeFilterCount,
    } = useScannerFilters();

    // React Query
    const { items, prices, stats, isLoading } = useMarketData(autoRefresh ? 60000 : 0);

    useEffect(() => {
        setSearchParams({ type, strategy: selectedStrategyId });
    }, [type, selectedStrategyId, setSearchParams]);

    useEffect(() => {
        const saved = localStorage.getItem('trackedItems');
        if (saved) {
            const parsed = JSON.parse(saved);
            setTrackedIds(new Set(parsed.map((i: Item) => i.id)));
        }
    }, []);

    const { dumps, bestFlips } = useMarketAnalysis(items, prices, stats, currentStrategy);
    const rawData = type === 'crash' ? dumps : bestFlips;

    // Apply filters and search
    const filteredData = useMemo(() => {
        let result = rawData;

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(row =>
                row.item.name.toLowerCase().includes(query)
            );
        }

        // Column filters
        if (conditions.length > 0) {
            result = result.filter(row => {
                const scannerRow: ScannerRow = {
                    item: row.item,
                    price: row.price,
                    stats: row.stats,
                    score: row.score,
                    metric: row.metric,
                    secondaryMetric: row.secondaryMetric,
                };

                return filterRow((columnId: string) => {
                    const colDef = ALL_COLUMNS.find(c => c.id === columnId);
                    if (!colDef) return null;
                    return colDef.accessor(scannerRow);
                });
            });
        }

        return result;
    }, [rawData, searchQuery, conditions, filterRow]);

    // Sort and paginate
    const displayData = useMemo(() => {
        const topItems = filteredData.slice(0, 200);

        return [...topItems].sort((a, b) => {
            let aValue: number | string = 0;
            let bValue: number | string = 0;

            switch (sortConfig.key) {
                case 'name':
                    aValue = a.item.name;
                    bValue = b.item.name;
                    break;
                case 'price':
                    aValue = a.price.low;
                    bValue = b.price.low;
                    break;
                case 'metric':
                    aValue = a.metric;
                    bValue = b.metric;
                    break;
                case 'secondary':
                    aValue = a.secondaryMetric;
                    bValue = b.secondaryMetric;
                    break;
                case 'volume':
                    aValue = a.stats.highPriceVolume + a.stats.lowPriceVolume;
                    bValue = b.stats.highPriceVolume + b.stats.lowPriceVolume;
                    break;
                case 'score':
                    aValue = a.score;
                    bValue = b.score;
                    break;
                default: return 0;
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredData, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handleTrack = (item: Item) => {
        const saved = localStorage.getItem('trackedItems');
        const tracked = saved ? JSON.parse(saved) : [];
        if (tracked.find((i: Item) => i.id === item.id)) {
            toast.info("Already tracking");
            return;
        }
        localStorage.setItem('trackedItems', JSON.stringify([item, ...tracked]));
        setTrackedIds(prev => new Set(prev).add(item.id));
        toast.success(`Tracking ${item.name}`);
    }

    const handleDeleteStrategy = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentStrategy.id.startsWith('default')) return;
        if (confirm(`Delete strategy ${currentStrategy.name}?`)) {
            deleteStrategy(currentStrategy.id);
            setSelectedStrategyId('default_safe');
        }
    }

    return (
        <>
            <div className="mb-4">
                <Link to="/" className="text-slate-400 hover:text-emerald-400 flex items-center gap-2 mb-4 transition-colors">
                    <ArrowLeft size={16} /> Back to Dashboard
                </Link>

                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
                            {type === 'crash' ? (
                                <><ArrowDown className="text-rose-500" /> Crash Watch</>
                            ) : (
                                <><TrendingUp className="text-emerald-500" /> Opportunity Scanner</>
                            )}
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Scanned {items.length} items using strategy: <span className="text-emerald-400 font-bold">{currentStrategy.name}</span>
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <div className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
                            <Select value={selectedStrategyId} onValueChange={setSelectedStrategyId}>
                                <SelectTrigger className="w-[200px] border-none bg-transparent">
                                    <SelectValue placeholder="Select Strategy" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                                    {strategies.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {!currentStrategy.id.startsWith('default') && (
                                <Button size="icon" variant="ghost" className="h-10 w-10 text-slate-500 hover:text-rose-500" onClick={handleDeleteStrategy}>
                                    <Trash2 size={16} />
                                </Button>
                            )}
                        </div>

                        <StrategyBuilder onSave={(s) => {
                            saveStrategy(s);
                            setSelectedStrategyId(s.id);
                        }} />

                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-1 inline-flex">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setType('flip')}
                                className={type === 'flip' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}
                            >
                                Flips
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setType('crash')}
                                className={type === 'crash' ? 'bg-rose-600/20 text-rose-400' : 'text-slate-400 hover:text-slate-200'}
                            >
                                Crashes
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Toolbar */}
            <div className="bg-slate-900 border border-slate-800 rounded-t-lg px-4 py-3 flex flex-wrap items-center gap-3">
                {/* Filter Builder */}
                <FilterBuilderPanel
                    conditions={conditions}
                    onAddCondition={addCondition}
                    onUpdateCondition={updateCondition}
                    onRemoveCondition={removeCondition}
                    onClearConditions={clearConditions}
                />

                {/* Saved Filters */}
                <SavedFiltersDialog
                    presets={presets}
                    hasActiveFilters={activeFilterCount > 0}
                    onLoadPreset={loadPreset}
                    onSavePreset={saveAsPreset}
                    onDeletePreset={deletePreset}
                />

                {/* Sort Button */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSort(sortConfig.key)}
                    className="gap-2 bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300"
                >
                    <ArrowUpDown size={14} />
                    Sort
                </Button>

                {/* Column Selector */}
                <ColumnSelectorDialog
                    visibleColumns={visibleColumns}
                    columnsByCategory={columnsByCategory}
                    onToggleColumn={toggleColumn}
                    onReset={resetColumns}
                    isColumnVisible={isColumnVisible}
                />

                {/* Spacer */}
                <div className="flex-1" />

                {/* Search */}
                <Input
                    placeholder="Search all columns..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48 h-8 text-sm bg-slate-800 border-slate-700 placeholder:text-slate-500"
                />

                {/* Auto Refresh Toggle */}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Switch
                        checked={autoRefresh}
                        onCheckedChange={setAutoRefresh}
                        className="data-[state=checked]:bg-emerald-600"
                    />
                    <span>Auto-refresh</span>
                </div>

                {/* Item Count */}
                <span className="text-xs text-slate-500">
                    {displayData.length} / {items.length} items
                </span>
            </div>

            <div className="bg-slate-900 border border-t-0 border-slate-800 rounded-b-lg overflow-hidden">
                {isLoading ? (
                    <div className="h-64 flex items-center justify-center">
                        <Loader2 className="animate-spin text-emerald-500 h-8 w-8" />
                    </div>
                ) : (
                    <ScannerTable
                        data={displayData}
                        type={type}
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        trackedIds={trackedIds}
                        onTrack={handleTrack}
                    />
                )}
            </div>
        </>
    );
};

export default Scanner;