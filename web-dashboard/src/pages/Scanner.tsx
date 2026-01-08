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
import { cn } from '@/lib/utils';
import VirtualizedScannerTable from '@/components/VirtualizedScannerTable';
import StrategyBuilder from '@/components/StrategyBuilder';
import ColumnSelectorDialog from '@/components/scanner/ColumnSelectorDialog';
import FilterBuilderPanel from '@/components/scanner/FilterBuilderPanel';
import SavedFiltersDialog from '@/components/scanner/SavedFiltersDialog';
import PageHeader from '@/components/PageHeader';

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
        // Virtualization allows us to render ALL items without limits
        return [...filteredData].sort((a, b) => {
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
        <div className="space-y-8 animate-page-enter">
            <div>
                <PageHeader
                    title={
                        <div className="flex items-center gap-4">
                            {type === 'crash' ? (
                                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                                    <ArrowDown size={32} className="text-rose-500" />
                                </div>
                            ) : (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                                    <TrendingUp size={32} className="text-emerald-500" />
                                </div>
                            )}
                            <div className="flex flex-col">
                                <span>{type === 'crash' ? 'Crash Watch' : 'Opportunity Scanner'}</span>
                                <span className="text-sm font-medium text-slate-500 normal-case">
                                    Intelligent market scanning engine
                                </span>
                            </div>
                        </div>
                    }
                    subtitle={
                        <>Active Analysis: <span className="text-emerald-400 font-bold">{currentStrategy.name}</span> • Scanning {items.length.toLocaleString()} assets</>
                    }
                    backLink="/"
                    backLabel="Terminal"
                    action={
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Strategy Select */}
                            <div className="flex items-center gap-2 p-1.5 bg-white/5 border border-white/5 rounded-2xl">
                                <Select value={selectedStrategyId} onValueChange={setSelectedStrategyId}>
                                    <SelectTrigger className="w-[200px] border-none bg-transparent h-10 text-xs font-bold uppercase tracking-widest">
                                        <SelectValue placeholder="Strategy" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/5 text-slate-200">
                                        {strategies.map(s => (
                                            <SelectItem key={s.id} value={s.id} className="text-xs font-bold uppercase tracking-widest">{s.name}</SelectItem>
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

                            <div className="h-10 w-px bg-white/5 mx-2" />

                            <div className="bg-white/5 border border-white/5 rounded-2xl p-1.5 flex gap-1">
                                <Button
                                    variant="ghost"
                                    onClick={() => setType('flip')}
                                    className={cn(
                                        "h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                                        type === 'flip' ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20" : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    Flipping
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setType('crash')}
                                    className={cn(
                                        "h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                                        type === 'crash' ? "bg-rose-500 text-slate-950 shadow-lg shadow-rose-500/20" : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    Crashes
                                </Button>
                            </div>
                        </div>
                    }
                />
            </div>

            {/* Premium Toolbar */}
            <div className="glass-card p-4 flex flex-wrap items-center gap-6 bg-white/[0.02]">
                <div className="flex items-center gap-4 flex-1 min-w-[300px]">
                    <div className="relative flex-1">
                        <Input
                            placeholder="SEARCH TERMINAL..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-12 pl-4 pr-10 bg-slate-950/50 border-white/5 rounded-xl font-mono text-xs tracking-widest placeholder:text-slate-600 focus:border-emerald-500/50 transition-all"
                        />
                    </div>

                    <FilterBuilderPanel
                        conditions={conditions}
                        onAddCondition={addCondition}
                        onUpdateCondition={updateCondition}
                        onRemoveCondition={removeCondition}
                        onClearConditions={clearConditions}
                    />

                    <SavedFiltersDialog
                        presets={presets}
                        hasActiveFilters={activeFilterCount > 0}
                        onLoadPreset={loadPreset}
                        onSavePreset={saveAsPreset}
                        onDeletePreset={deletePreset}
                    />
                </div>

                <div className="flex items-center gap-6">
                    <div className="h-8 w-px bg-white/5" />

                    <ColumnSelectorDialog
                        visibleColumns={visibleColumns}
                        columnsByCategory={columnsByCategory}
                        onToggleColumn={toggleColumn}
                        onReset={resetColumns}
                        isColumnVisible={isColumnVisible}
                    />

                    <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/5 rounded-xl">
                        <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Live Refresh</span>
                        <Switch
                            checked={autoRefresh}
                            onCheckedChange={setAutoRefresh}
                            className="data-[state=checked]:bg-emerald-500"
                        />
                    </div>

                    <div className="text-[10px] font-mono text-slate-500 font-bold uppercase whitespace-nowrap">
                        {displayData.length} matches
                    </div>
                </div>
            </div>

            {/* Virtualized Table Container */}
            <div className="premium-card overflow-hidden h-[calc(100vh-420px)] border-white/5">
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Analyzing Market Flows...</span>
                    </div>
                ) : (
                    <VirtualizedScannerTable
                        data={displayData}
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        trackedIds={trackedIds}
                        onTrack={handleTrack}
                    />
                )}
            </div>
        </div>
    );
};


export default Scanner;