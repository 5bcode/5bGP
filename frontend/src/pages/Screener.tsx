import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMarketData } from '../hooks/useMarketData';
import { formatNumber, formatTimeAgo, isWithinTime } from '../utils/analysis';
import type { TrendSignal } from '../utils/analysis';
import {
    FaSort, FaSortUp, FaSortDown, FaMagnifyingGlass,
    FaArrowTrendUp, FaArrowTrendDown, FaBolt, FaFilter, FaRotateRight,
    FaTableColumns, FaXmark, FaChevronDown
} from 'react-icons/fa6';
import clsx from 'clsx';

const ITEMS_PER_PAGE = 50;

// ============================================
// COLUMN CONFIGURATION SYSTEM
// ============================================

interface ColumnConfig {
    key: string;
    label: string;
    shortLabel?: string;
    category: 'core' | 'price' | 'volume' | 'time' | 'analysis';
    sortable: boolean;
    align: 'left' | 'right' | 'center';
    width?: string;
    defaultEnabled: boolean;
    render: (item: any) => React.ReactNode;
}

const COLUMN_CATEGORIES = {
    core: { label: 'Core', icon: '📊', description: 'Essential item info' },
    price: { label: 'Price', icon: '💰', description: 'Price and margin data' },
    volume: { label: 'Volume', icon: '📈', description: 'Trading volume data' },
    time: { label: 'Time', icon: '⏱️', description: 'Last trade timestamps' },
    analysis: { label: 'Analysis', icon: '🔬', description: 'Calculated metrics' },
};

// Helper functions for rendering
const getTimeColor = (seconds: number) => {
    if (seconds < 60) return 'text-green';
    if (seconds < 300) return 'text-gold';
    if (seconds < 600) return 'text-yellow-400';
    return 'text-muted';
};

const getPriceChangeColor = (change: number) => {
    if (change > 2) return 'text-green';
    if (change < -2) return 'text-red';
    return 'text-muted';
};

const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green';
    if (score >= 50) return 'text-gold';
    if (score >= 30) return 'text-yellow-400';
    return 'text-muted';
};

const getScoreBgColor = (score: number) => {
    if (score >= 70) return 'bg-green/10';
    if (score >= 50) return 'bg-gold/10';
    if (score >= 30) return 'bg-yellow-400/10';
    return 'bg-zinc-800/50';
};

// Trend signal config
const TREND_CONFIG: Record<TrendSignal, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
    pump: { icon: <FaArrowTrendUp />, label: 'PUMP', color: 'text-green', bg: 'bg-green/10' },
    dump: { icon: <FaArrowTrendDown />, label: 'DUMP', color: 'text-red', bg: 'bg-red/10' },
    volatile: { icon: <FaBolt />, label: 'HOT', color: 'text-gold', bg: 'bg-gold/10' },
    stable: { icon: null, label: '', color: 'text-muted', bg: '' },
};

// Define all available columns
const ALL_COLUMNS: ColumnConfig[] = [
    // CORE
    {
        key: 'flipperScore',
        label: "Flipper's Score",
        shortLabel: 'Score',
        category: 'core',
        sortable: true,
        align: 'center',
        width: 'w-16',
        defaultEnabled: true,
        render: (item) => (
            <div className={clsx(
                "inline-flex items-center justify-center w-8 h-6 rounded font-mono font-bold text-xs",
                getScoreBgColor(item.flipperScore || 0),
                getScoreColor(item.flipperScore || 0)
            )}>
                {Math.round(item.flipperScore || 0)}
            </div>
        ),
    },
    {
        key: 'signal',
        label: 'Trend Signal',
        shortLabel: 'Sig',
        category: 'core',
        sortable: false,
        align: 'center',
        width: 'w-12',
        defaultEnabled: true,
        render: (item) => {
            const cfg = TREND_CONFIG[item.trendSignal as TrendSignal];
            return cfg?.label ? (
                <span className={clsx("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase", cfg.bg, cfg.color)}>
                    {cfg.icon}
                </span>
            ) : null;
        },
    },
    {
        key: 'name',
        label: 'Item Name',
        shortLabel: 'Item',
        category: 'core',
        sortable: true,
        align: 'left',
        defaultEnabled: true,
        render: (item) => (
            <div className="flex items-center gap-2">
                {item.icon && (
                    <img
                        src={`https://oldschool.runescape.wiki/images/${item.icon.replace(/ /g, '_')}`}
                        className="w-5 h-5 object-contain flex-shrink-0"
                        alt=""
                    />
                )}
                <span className="truncate max-w-[140px]">{item.name}</span>
            </div >
        ),
    },
    // PRICE
    {
        key: 'buyPrice',
        label: 'Buy Price',
        shortLabel: 'Buy',
        category: 'price',
        sortable: true,
        align: 'right',
        defaultEnabled: false,
        render: (item) => <span className="font-mono text-secondary">{formatNumber(item.buyPrice)}</span>,
    },
    {
        key: 'sellPrice',
        label: 'Sell Price',
        shortLabel: 'Sell',
        category: 'price',
        sortable: true,
        align: 'right',
        defaultEnabled: false,
        render: (item) => <span className="font-mono text-secondary">{formatNumber(item.sellPrice)}</span>,
    },
    {
        key: 'margin',
        label: 'Margin',
        category: 'price',
        sortable: true,
        align: 'right',
        defaultEnabled: true,
        render: (item) => (
            <span className={clsx("font-mono font-bold", item.margin > 0 ? "text-green" : "text-red")}>
                {formatNumber(item.margin)}
            </span>
        ),
    },
    {
        key: 'roi',
        label: 'ROI %',
        shortLabel: 'ROI',
        category: 'price',
        sortable: true,
        align: 'right',
        defaultEnabled: true,
        render: (item) => (
            <span className={clsx("font-mono", item.roi > 5 ? "text-green" : "text-secondary")}>
                {item.roi.toFixed(1)}%
            </span>
        ),
    },
    {
        key: 'priceChange',
        label: 'Price Δ (1h)',
        shortLabel: 'Δ%',
        category: 'price',
        sortable: true,
        align: 'right',
        defaultEnabled: true,
        render: (item) => (
            <span className={clsx("font-mono", getPriceChangeColor(item.priceChange))}>
                {item.priceChange > 0 ? '+' : ''}{item.priceChange.toFixed(1)}%
            </span>
        ),
    },
    // VOLUME
    {
        key: 'volume',
        label: 'Volume (5m)',
        shortLabel: 'Vol',
        category: 'volume',
        sortable: true,
        align: 'right',
        defaultEnabled: false,
        render: (item) => <span className="font-mono text-secondary">{item.volume > 0 ? formatNumber(item.volume) : '-'}</span>,
    },
    {
        key: 'vol1h',
        label: 'Volume (1h)',
        shortLabel: 'Vol 1h',
        category: 'volume',
        sortable: true,
        align: 'right',
        defaultEnabled: false,
        render: (item) => <span className="font-mono text-secondary">{item.vol1h > 0 ? formatNumber(item.vol1h) : '-'}</span>,
    },
    {
        key: 'priceVolume24h',
        label: 'GP Flow (24h)',
        shortLabel: 'GP Flow',
        category: 'volume',
        sortable: true,
        align: 'right',
        defaultEnabled: true,
        render: (item) => <span className="font-mono text-secondary">{formatNumber(item.priceVolume24h)}</span>,
    },
    // TIME
    {
        key: 'lastBuyAgo',
        label: 'Last Buy',
        shortLabel: 'Buy',
        category: 'time',
        sortable: true,
        align: 'right',
        defaultEnabled: true,
        render: (item) => (
            <span className={clsx("font-mono", getTimeColor(item.lastBuyAgo))}>
                {formatTimeAgo(item.lastBuyAgo)}
            </span>
        ),
    },
    {
        key: 'lastSellAgo',
        label: 'Last Sell',
        shortLabel: 'Sell',
        category: 'time',
        sortable: true,
        align: 'right',
        defaultEnabled: true,
        render: (item) => (
            <span className={clsx("font-mono", getTimeColor(item.lastSellAgo))}>
                {formatTimeAgo(item.lastSellAgo)}
            </span>
        ),
    },
    // ANALYSIS
    {
        key: 'limitProfit',
        label: 'Limit Profit',
        shortLabel: 'Limit $',
        category: 'analysis',
        sortable: true,
        align: 'right',
        defaultEnabled: true,
        render: (item) => (
            <span className={clsx("font-mono", item.limitProfit > 0 ? "text-green" : "text-muted")}>
                {formatNumber(item.limitProfit)}
            </span>
        ),
    },
    {
        key: 'potentialProfit',
        label: 'Max Profit',
        shortLabel: 'Max $',
        category: 'analysis',
        sortable: true,
        align: 'right',
        defaultEnabled: false,
        render: (item) => <span className="font-mono text-secondary">{formatNumber(item.potentialProfit)}</span>,
    },
    {
        key: 'limit',
        label: 'GE Limit',
        shortLabel: 'Limit',
        category: 'analysis',
        sortable: true,
        align: 'right',
        defaultEnabled: false,
        render: (item) => <span className="font-mono text-muted">{formatNumber(item.limit || 0)}</span>,
    },
    {
        key: 'alchProfit',
        label: 'Alch Profit',
        shortLabel: 'Alch',
        category: 'analysis',
        sortable: true,
        align: 'right',
        defaultEnabled: false,
        render: (item) => (
            <span className={clsx("font-mono", (item.alchProfit || 0) > 0 ? "text-green" : "text-muted")}>
                {formatNumber(item.alchProfit || 0)}
            </span>
        ),
    },
];

type SortField = string;
type SortDirection = 'asc' | 'desc';
type TrendFilter = 'all' | 'pump' | 'dump' | 'volatile';

// Preset filter configurations
interface FilterPreset {
    name: string;
    description: string;
    filters: {
        minMargin?: number;
        minROI?: number;
        minVolume?: number;
        minPriceVolume24h?: number;
        maxLastBuyMins?: number;
        maxLastSellMins?: number;
        minLimitProfit?: number;
    };
    sortField: SortField;
    sortDir: SortDirection;
}

const PRESETS: Record<string, FilterPreset> = {
    active_flips: {
        name: '🎯 Active Flips',
        description: 'High volume items with recent trades',
        filters: {
            minPriceVolume24h: 500_000_000,
            maxLastBuyMins: 10,
            maxLastSellMins: 10,
            minLimitProfit: 200_000,
        },
        sortField: 'roi',
        sortDir: 'desc',
    },
    high_margin: {
        name: '💰 High Margin',
        description: 'Items with the biggest profit per flip',
        filters: {
            minMargin: 10000,
            minVolume: 10,
        },
        sortField: 'margin',
        sortDir: 'desc',
    },
    quick_flips: {
        name: '⚡ Quick Flips',
        description: 'Fast-moving items traded recently',
        filters: {
            maxLastBuyMins: 5,
            maxLastSellMins: 5,
            minMargin: 100,
        },
        sortField: 'volume',
        sortDir: 'desc',
    },
    whale_items: {
        name: '🐋 Whale Items',
        description: 'High value items with massive GP flow',
        filters: {
            minPriceVolume24h: 1_000_000_000,
        },
        sortField: 'priceVolume24h',
        sortDir: 'desc',
    },
};

// Flipper Score calculation
function estimateFlipperScore(roi: number, margin: number, potentialProfit: number, limit: number, volume: number): number {
    const roiScore = Math.min(100, Math.max(0, roi * 10));
    const marginScore = Math.min(100, Math.max(0, (margin / 10000) * 100));
    const profitScore = Math.min(100, Math.max(0, (potentialProfit / 500000) * 100));
    const volumeScore = Math.min(100, Math.max(0, (volume / 100) * 100));
    const limitBonus = limit >= 100 && limit <= 10000 ? 10 : 0;

    const score = (roiScore * 0.25) + (marginScore * 0.25) + (profitScore * 0.20) + (volumeScore * 0.30);
    return Math.min(100, score + limitBonus);
}

// ============================================
// COLUMN PICKER COMPONENT
// ============================================

interface ColumnPickerProps {
    enabledColumns: string[];
    onToggleColumn: (key: string) => void;
    onClose: () => void;
}

function ColumnPicker({ enabledColumns, onToggleColumn, onClose }: ColumnPickerProps) {
    const [search, setSearch] = useState('');

    const filteredColumns = useMemo(() => {
        if (!search) return ALL_COLUMNS;
        const q = search.toLowerCase();
        return ALL_COLUMNS.filter(col =>
            col.label.toLowerCase().includes(q) ||
            col.category.toLowerCase().includes(q)
        );
    }, [search]);

    const groupedColumns = useMemo(() => {
        const groups: Record<string, ColumnConfig[]> = {};
        filteredColumns.forEach(col => {
            if (!groups[col.category]) groups[col.category] = [];
            groups[col.category].push(col);
        });
        return groups;
    }, [filteredColumns]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col animate-in fade-in slide-in-from-top-4 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <FaTableColumns className="text-gold" />
                        <h3 className="font-bold">Configure Columns</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-hover rounded-lg transition-colors">
                        <FaXmark />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-border">
                    <div className="relative">
                        <FaMagnifyingGlass className="absolute left-3 top-2.5 text-muted text-sm" />
                        <input
                            type="text"
                            placeholder="Search columns..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-gold"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Column List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {Object.entries(COLUMN_CATEGORIES).map(([catKey, catInfo]) => {
                        const cols = groupedColumns[catKey];
                        if (!cols || cols.length === 0) return null;

                        return (
                            <div key={catKey}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span>{catInfo.icon}</span>
                                    <span className="text-sm font-bold text-primary">{catInfo.label}</span>
                                    <span className="text-xs text-muted">— {catInfo.description}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {cols.map(col => (
                                        <label
                                            key={col.key}
                                            className={clsx(
                                                "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                                                enabledColumns.includes(col.key)
                                                    ? "bg-gold/10 border border-gold/30"
                                                    : "bg-zinc-800/50 border border-transparent hover:border-border"
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={enabledColumns.includes(col.key)}
                                                onChange={() => onToggleColumn(col.key)}
                                                className="w-4 h-4 rounded border-border bg-background text-gold focus:ring-gold"
                                            />
                                            <span className="text-sm truncate">{col.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border flex justify-between items-center">
                    <span className="text-xs text-muted">{enabledColumns.length} columns enabled</span>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gold text-black font-bold rounded-lg hover:bg-gold/90 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// MAIN SCREENER COMPONENT
// ============================================

export function Screener() {
    const { items, isLoading, hasVolumeData } = useMarketData();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Column configuration state
    const [enabledColumns, setEnabledColumns] = useState<string[]>(() => {
        const stored = localStorage.getItem('screener_columns');
        if (stored) return JSON.parse(stored);
        return ALL_COLUMNS.filter(c => c.defaultEnabled).map(c => c.key);
    });
    const [showColumnPicker, setShowColumnPicker] = useState(false);

    // Save columns to localStorage
    useEffect(() => {
        localStorage.setItem('screener_columns', JSON.stringify(enabledColumns));
    }, [enabledColumns]);

    const toggleColumn = useCallback((key: string) => {
        setEnabledColumns(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    }, []);

    // Get active columns config
    const activeColumns = useMemo(() =>
        ALL_COLUMNS.filter(col => enabledColumns.includes(col.key)),
        [enabledColumns]);

    // Filters State
    const [search, setSearch] = useState('');
    const [minMargin, setMinMargin] = useState<string>('');
    const [minROI, setMinROI] = useState<string>('');
    const [minVolume, setMinVolume] = useState<string>('');
    const [minPriceVolume24h, setMinPriceVolume24h] = useState<string>('');
    const [maxLastBuyMins, setMaxLastBuyMins] = useState<string>('');
    const [maxLastSellMins, setMaxLastSellMins] = useState<string>('');
    const [minLimitProfit, setMinLimitProfit] = useState<string>('');
    const [onlyF2P, setOnlyF2P] = useState(false);
    const [onlyFav, setOnlyFav] = useState(false);
    const [trendFilter, setTrendFilter] = useState<TrendFilter>('all');
    const [activePreset, setActivePreset] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(true);

    // Sorting State
    const [sortField, setSortField] = useState<SortField>('roi');
    const [sortDir, setSortDir] = useState<SortDirection>('desc');

    // Pagination
    const [page, setPage] = useState(1);

    // Apply preset function
    const applyPreset = useCallback((presetKey: string) => {
        const preset = PRESETS[presetKey];
        if (!preset) return;

        setSearch('');
        setMinMargin(preset.filters.minMargin?.toString() || '');
        setMinROI(preset.filters.minROI?.toString() || '');
        setMinVolume(preset.filters.minVolume?.toString() || '');
        setMinPriceVolume24h(preset.filters.minPriceVolume24h?.toString() || '');
        setMaxLastBuyMins(preset.filters.maxLastBuyMins?.toString() || '');
        setMaxLastSellMins(preset.filters.maxLastSellMins?.toString() || '');
        setMinLimitProfit(preset.filters.minLimitProfit?.toString() || '');
        setOnlyF2P(false);
        setOnlyFav(false);
        setTrendFilter('all');
        setSortField(preset.sortField);
        setSortDir(preset.sortDir);
        setActivePreset(presetKey);
        setPage(1);
    }, []);

    // Reset all filters
    const resetFilters = useCallback(() => {
        setSearch('');
        setMinMargin('');
        setMinROI('');
        setMinVolume('');
        setMinPriceVolume24h('');
        setMaxLastBuyMins('');
        setMaxLastSellMins('');
        setMinLimitProfit('');
        setOnlyF2P(false);
        setOnlyFav(false);
        setTrendFilter('all');
        setSortField('roi');
        setSortDir('desc');
        setActivePreset(null);
        setPage(1);
    }, []);

    // Sync URL params
    useEffect(() => {
        const presetParam = searchParams.get('preset');
        if (presetParam && PRESETS[presetParam]) {
            applyPreset(presetParam);
        }

        if (searchParams.get('dumps') === 'true') {
            setTrendFilter('dump');
        }
    }, []);

    // Use the real Flipper's Score from market data
    const itemsWithScores = useMemo(() => {
        return items.map(item => ({
            ...item,
            flipperScore: item.flipperScore // Now calculated in useMarketData with volume data
        }));
    }, [items]);

    // Counts
    const counts = useMemo(() => ({
        pumps: items.filter(i => i.trendSignal === 'pump').length,
        dumps: items.filter(i => i.trendSignal === 'dump').length,
        volatile: items.filter(i => i.trendSignal === 'volatile').length,
    }), [items]);

    // Filter and sort
    const filteredAndSortedItems = useMemo(() => {
        let result = itemsWithScores;

        if (search) {
            const q = search.toLowerCase();
            result = result.filter(i => i.name.toLowerCase().includes(q));
        }
        if (minMargin) result = result.filter(i => i.margin >= Number(minMargin));
        if (minROI) result = result.filter(i => i.roi >= Number(minROI));
        if (minVolume) result = result.filter(i => i.volume >= Number(minVolume));
        if (minPriceVolume24h) result = result.filter(i => i.priceVolume24h >= Number(minPriceVolume24h));
        if (maxLastBuyMins) result = result.filter(i => isWithinTime(i.lastBuyAgo, Number(maxLastBuyMins)));
        if (maxLastSellMins) result = result.filter(i => isWithinTime(i.lastSellAgo, Number(maxLastSellMins)));
        if (minLimitProfit) result = result.filter(i => i.limitProfit >= Number(minLimitProfit));
        if (onlyF2P) result = result.filter(i => !i.members);
        if (onlyFav) result = result.filter(i => i.fav);
        if (trendFilter !== 'all') result = result.filter(i => i.trendSignal === trendFilter);

        result = [...result].sort((a, b) => {
            let valA = (a as any)[sortField] || 0;
            let valB = (b as any)[sortField] || 0;

            if (sortField === 'lastBuyAgo' || sortField === 'lastSellAgo') {
                if (valA < valB) return sortDir === 'asc' ? 1 : -1;
                if (valA > valB) return sortDir === 'asc' ? -1 : 1;
                return 0;
            }

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [itemsWithScores, search, minMargin, minROI, minVolume, minPriceVolume24h, maxLastBuyMins, maxLastSellMins, minLimitProfit, onlyF2P, onlyFav, trendFilter, sortField, sortDir]);

    const totalPages = Math.ceil(filteredAndSortedItems.length / ITEMS_PER_PAGE);
    const paginatedItems = filteredAndSortedItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
        setActivePreset(null);
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sortField !== field) return <FaSort className="opacity-20 text-[8px]" />;
        return sortDir === 'asc' ? <FaSortUp className="text-gold text-[8px]" /> : <FaSortDown className="text-gold text-[8px]" />;
    };

    return (
        <div className="space-y-3 max-w-[1900px] mx-auto animate-in fade-in pb-20">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold">Market Screener</h1>
                    <p className="text-secondary text-xs">
                        {hasVolumeData && <span className="text-green">● Live</span>}
                        {' '}{filteredAndSortedItems.length} items
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowColumnPicker(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium hover:border-gold/50 transition-colors"
                    >
                        <FaTableColumns />
                        Columns ({enabledColumns.length})
                    </button>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={clsx(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                            showFilters ? "bg-gold/20 text-gold" : "bg-card border border-border"
                        )}
                    >
                        <FaFilter />
                        Filters
                        <FaChevronDown className={clsx("transition-transform", showFilters && "rotate-180")} />
                    </button>
                </div>
            </header>

            {/* Presets */}
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
                {Object.entries(PRESETS).map(([key, preset]) => (
                    <button
                        key={key}
                        onClick={() => applyPreset(key)}
                        title={preset.description}
                        className={clsx(
                            "flex-shrink-0 px-3 py-1.5 rounded-lg font-medium text-xs transition-all",
                            activePreset === key
                                ? "bg-gold/20 text-gold border border-gold/30"
                                : "bg-card border border-border text-muted hover:text-primary"
                        )}
                    >
                        {preset.name}
                    </button>
                ))}
                <button
                    onClick={resetFilters}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg font-medium text-xs bg-card border border-border text-muted hover:text-red flex items-center gap-1"
                >
                    <FaRotateRight className="text-[10px]" />
                    Reset
                </button>
            </div>

            {/* Trend Quick Filters */}
            <div className="flex flex-wrap gap-1.5">
                {(['all', 'dump', 'pump', 'volatile'] as TrendFilter[]).map(tf => {
                    const config = {
                        all: { label: 'All', color: 'text-primary', bg: 'bg-zinc-700' },
                        dump: { label: `Dumps (${counts.dumps})`, color: 'text-red', bg: 'bg-red/20' },
                        pump: { label: `Pumps (${counts.pumps})`, color: 'text-green', bg: 'bg-green/20' },
                        volatile: { label: `Hot (${counts.volatile})`, color: 'text-gold', bg: 'bg-gold/20' },
                    }[tf];

                    return (
                        <button
                            key={tf}
                            onClick={() => { setTrendFilter(tf); setActivePreset(null); setPage(1); }}
                            className={clsx(
                                "px-2.5 py-1 rounded text-[10px] font-medium transition-all",
                                trendFilter === tf ? `${config.bg} ${config.color}` : "bg-card border border-border text-muted"
                            )}
                        >
                            {config.label}
                        </button>
                    );
                })}
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-card border border-border rounded-xl p-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                        {/* Search */}
                        <div className="col-span-2 space-y-1">
                            <label className="text-[9px] font-bold text-muted uppercase">Search</label>
                            <div className="relative">
                                <FaMagnifyingGlass className="absolute left-2.5 top-2 text-muted text-[10px]" />
                                <input
                                    type="text"
                                    className="w-full bg-background border border-border rounded-lg pl-7 pr-2 py-1.5 text-xs focus:outline-none focus:border-gold"
                                    placeholder="Search..."
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setActivePreset(null); setPage(1); }}
                                />
                            </div>
                        </div>

                        {/* Numeric filters */}
                        {[
                            { label: 'Min Margin', value: minMargin, setter: setMinMargin, placeholder: '0' },
                            { label: 'Min ROI %', value: minROI, setter: setMinROI, placeholder: '0' },
                            { label: 'GP Flow 24h', value: minPriceVolume24h, setter: setMinPriceVolume24h, placeholder: '500M' },
                            { label: 'Last Buy (min)', value: maxLastBuyMins, setter: setMaxLastBuyMins, placeholder: '10' },
                            { label: 'Last Sell (min)', value: maxLastSellMins, setter: setMaxLastSellMins, placeholder: '10' },
                            { label: 'Limit Profit', value: minLimitProfit, setter: setMinLimitProfit, placeholder: '200K' },
                        ].map(f => (
                            <div key={f.label} className="space-y-1">
                                <label className="text-[9px] font-bold text-muted uppercase truncate block">{f.label}</label>
                                <input
                                    type="number"
                                    className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-gold"
                                    placeholder={f.placeholder}
                                    value={f.value}
                                    onChange={(e) => { f.setter(e.target.value); setActivePreset(null); }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Checkboxes */}
                    <div className="flex items-center gap-4 mt-2 pt-2 border-t border-border">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                            <input type="checkbox" checked={onlyF2P} onChange={(e) => { setOnlyF2P(e.target.checked); setActivePreset(null); }} className="w-3 h-3 rounded" />
                            F2P Only
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                            <input type="checkbox" checked={onlyFav} onChange={(e) => { setOnlyFav(e.target.checked); setActivePreset(null); }} className="w-3 h-3 rounded" />
                            ★ Favorites
                        </label>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left whitespace-nowrap">
                        <thead className="bg-zinc-900/50 text-[9px] text-muted uppercase border-b border-border">
                            <tr>
                                {activeColumns.map(col => (
                                    <th
                                        key={col.key}
                                        className={clsx(
                                            "px-2 py-2.5 font-medium",
                                            col.sortable && "cursor-pointer hover:text-primary",
                                            col.align === 'right' && "text-right",
                                            col.align === 'center' && "text-center",
                                            col.width
                                        )}
                                        onClick={() => col.sortable && handleSort(col.key)}
                                    >
                                        <div className={clsx(
                                            "flex items-center gap-1",
                                            col.align === 'right' && "justify-end",
                                            col.align === 'center' && "justify-center"
                                        )}>
                                            {col.shortLabel || col.label}
                                            {col.sortable && <SortIcon field={col.key} />}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {isLoading ? (
                                <tr><td colSpan={activeColumns.length} className="p-8 text-center text-muted">
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-5 h-5 border-2 border-zinc-700 border-t-gold rounded-full animate-spin"></div>
                                        Loading...
                                    </div>
                                </td></tr>
                            ) : paginatedItems.length === 0 ? (
                                <tr><td colSpan={activeColumns.length} className="p-8 text-center text-muted">No items match filters</td></tr>
                            ) : (
                                paginatedItems.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => navigate(`/item/${item.id}`)}
                                        className={clsx(
                                            "hover:bg-hover transition-colors cursor-pointer",
                                            item.trendSignal === 'dump' && "bg-red/5",
                                            item.trendSignal === 'pump' && "bg-green/5"
                                        )}
                                    >
                                        {activeColumns.map(col => (
                                            <td
                                                key={col.key}
                                                className={clsx(
                                                    "px-2 py-2",
                                                    col.align === 'right' && "text-right",
                                                    col.align === 'center' && "text-center",
                                                    col.width
                                                )}
                                            >
                                                {col.render(item)}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-zinc-900/50">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="text-xs font-medium text-muted hover:text-primary disabled:opacity-50"
                    >
                        ← Prev
                    </button>
                    <span className="text-[10px] text-muted">
                        {page} / {totalPages || 1}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || totalPages === 0}
                        className="text-xs font-medium text-muted hover:text-primary disabled:opacity-50"
                    >
                        Next →
                    </button>
                </div>
            </div>

            {/* Column Picker Modal */}
            {showColumnPicker && (
                <ColumnPicker
                    enabledColumns={enabledColumns}
                    onToggleColumn={toggleColumn}
                    onClose={() => setShowColumnPicker(false)}
                />
            )}
        </div>
    );
}
