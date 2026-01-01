import { useState, useEffect, useMemo, useCallback } from 'react';
import { Item, PriceData, Stats24h } from '@/services/osrs-api';
import { formatGP, calculateMargin, calculateTax } from '@/lib/osrs-math';

const STORAGE_KEY = 'flipto5b-scanner-columns';

// Row data structure for scanner
export interface ScannerRow {
    item: Item;
    price: PriceData;
    stats: Stats24h;
    score?: number;
    metric?: number;
    secondaryMetric?: number;
}

export type ColumnCategory = 
    | 'core' 
    | 'limit' 
    | 'alchemy' 
    | 'timestamps' 
    | 'volume' 
    | 'trends' 
    | 'volTrends' 
    | 'ratios' 
    | 'sparklines';

export interface ColumnDef {
    id: string;
    label: string;
    category: ColumnCategory;
    accessor: (row: ScannerRow) => number | string | null;
    format?: (value: number | string | null) => string;
    sortable?: boolean;
    align?: 'left' | 'right' | 'center';
    width?: number;
    colorize?: boolean; // Whether to color positive/negative values
}

// Helper formatters
const formatPercent = (v: number | string | null) => {
    if (v === null || typeof v === 'string') return '—';
    return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
};

const formatTimeAgo = (timestamp: number | string | null): string => {
    if (timestamp === null || typeof timestamp === 'string') return '—';
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

// All available columns
export const ALL_COLUMNS: ColumnDef[] = [
    // ===== CORE =====
    {
        id: 'item',
        label: 'Item',
        category: 'core',
        accessor: (row) => row.item.name,
        sortable: true,
        align: 'left',
        width: 200,
    },
    {
        id: 'buyPrice',
        label: 'Buy Price',
        category: 'core',
        accessor: (row) => row.price.low,
        format: (v) => formatGP(v as number),
        sortable: true,
        align: 'right',
    },
    {
        id: 'sellPrice',
        label: 'Sell Price',
        category: 'core',
        accessor: (row) => row.price.high,
        format: (v) => formatGP(v as number),
        sortable: true,
        align: 'right',
    },
    {
        id: 'margin',
        label: 'Margin (with tax)',
        category: 'core',
        accessor: (row) => calculateMargin(row.price.low, row.price.high).net,
        format: (v) => {
            const num = v as number;
            return `${num >= 0 ? '+' : ''}${formatGP(num)}`;
        },
        sortable: true,
        align: 'right',
        colorize: true,
    },
    {
        id: 'tax',
        label: 'Tax',
        category: 'core',
        accessor: (row) => calculateTax(row.price.high),
        format: (v) => formatGP(v as number),
        sortable: true,
        align: 'right',
    },
    {
        id: 'roi',
        label: 'ROI',
        category: 'core',
        accessor: (row) => calculateMargin(row.price.low, row.price.high).roi,
        format: formatPercent,
        sortable: true,
        align: 'right',
        colorize: true,
    },
    {
        id: 'members',
        label: 'Members',
        category: 'core',
        accessor: (row) => row.item.members ? 'Yes' : 'No',
        sortable: true,
        align: 'center',
    },

    // ===== LIMIT =====
    {
        id: 'limit',
        label: 'Limit',
        category: 'limit',
        accessor: (row) => row.item.limit || 0,
        format: (v) => formatGP(v as number),
        sortable: true,
        align: 'right',
    },
    {
        id: 'limitProfit',
        label: 'Limit Profit',
        category: 'limit',
        accessor: (row) => {
            const { net } = calculateMargin(row.price.low, row.price.high);
            return net * (row.item.limit || 1);
        },
        format: (v) => {
            const num = v as number;
            return `${num >= 0 ? '+' : ''}${formatGP(num)}`;
        },
        sortable: true,
        align: 'right',
        colorize: true,
    },
    {
        id: 'limitPrice',
        label: 'Limit × Price',
        category: 'limit',
        accessor: (row) => row.price.low * (row.item.limit || 1),
        format: (v) => formatGP(v as number),
        sortable: true,
        align: 'right',
    },

    // ===== ALCHEMY =====
    {
        id: 'lowAlchProfit',
        label: 'Low Alchemy Profit',
        category: 'alchemy',
        accessor: (row) => row.item.lowalch ? (row.item.lowalch - row.price.low) : null,
        format: (v) => v === null ? '—' : `${(v as number) >= 0 ? '+' : ''}${formatGP(v as number)}`,
        sortable: true,
        align: 'right',
        colorize: true,
    },
    {
        id: 'highAlchProfit',
        label: 'High Alchemy Profit',
        category: 'alchemy',
        accessor: (row) => row.item.highalch ? (row.item.highalch - row.price.low - 150) : null, // 150gp for nature rune
        format: (v) => v === null ? '—' : `${(v as number) >= 0 ? '+' : ''}${formatGP(v as number)}`,
        sortable: true,
        align: 'right',
        colorize: true,
    },

    // ===== TIMESTAMPS =====
    {
        id: 'lastTrade',
        label: 'Last Trade',
        category: 'timestamps',
        accessor: (row) => Math.max(row.price.highTime, row.price.lowTime),
        format: (v) => formatTimeAgo(v),
        sortable: true,
        align: 'right',
    },
    {
        id: 'lastBuy',
        label: 'Last Buy',
        category: 'timestamps',
        accessor: (row) => row.price.lowTime,
        format: (v) => formatTimeAgo(v),
        sortable: true,
        align: 'right',
    },
    {
        id: 'lastSell',
        label: 'Last Sell',
        category: 'timestamps',
        accessor: (row) => row.price.highTime,
        format: (v) => formatTimeAgo(v),
        sortable: true,
        align: 'right',
    },

    // ===== VOLUME =====
    {
        id: 'volume24h',
        label: 'Volume 24h',
        category: 'volume',
        accessor: (row) => row.stats.highPriceVolume + row.stats.lowPriceVolume,
        format: (v) => formatGP(v as number),
        sortable: true,
        align: 'right',
    },
    {
        id: 'priceVolume24h',
        label: 'Price × Volume 24h',
        category: 'volume',
        accessor: (row) => row.price.low * (row.stats.highPriceVolume + row.stats.lowPriceVolume),
        format: (v) => formatGP(v as number),
        sortable: true,
        align: 'right',
    },
    {
        id: 'marginVolume24h',
        label: 'Margin × Volume 24h',
        category: 'volume',
        accessor: (row) => {
            const { net } = calculateMargin(row.price.low, row.price.high);
            return net * (row.stats.highPriceVolume + row.stats.lowPriceVolume);
        },
        format: (v) => formatGP(v as number),
        sortable: true,
        align: 'right',
        colorize: true,
    },
    {
        id: 'volumeLimit24h',
        label: 'Volume 24h / Limit',
        category: 'volume',
        accessor: (row) => {
            const vol = row.stats.highPriceVolume + row.stats.lowPriceVolume;
            const limit = row.item.limit || 1;
            return vol / limit;
        },
        format: (v) => (v as number).toFixed(1),
        sortable: true,
        align: 'right',
    },

    // ===== SPARKLINES (placeholder - actual rendering handled separately) =====
    {
        id: 'sparkline24h',
        label: 'Sparkline 24h',
        category: 'sparklines',
        accessor: () => null, // Handled by custom renderer
        sortable: false,
        align: 'center',
        width: 100,
    },
    {
        id: 'sparkline7d',
        label: 'Sparkline 7d',
        category: 'sparklines',
        accessor: () => null,
        sortable: false,
        align: 'center',
        width: 100,
    },
];

// Default visible columns
const DEFAULT_VISIBLE = [
    'item',
    'buyPrice',
    'sellPrice',
    'margin',
    'roi',
    'limit',
    'volume24h',
    'lastTrade',
];

// Category labels for UI
export const CATEGORY_LABELS: Record<ColumnCategory, string> = {
    core: 'Core',
    limit: 'Limit',
    alchemy: 'Alchemy',
    timestamps: 'Timestamps',
    volume: 'Volume',
    trends: 'Price Trends',
    volTrends: 'Volume Trends',
    ratios: 'Buy/Sell Ratios',
    sparklines: 'Sparklines',
};

export function useScannerColumns() {
    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Failed to parse scanner columns from localStorage:', e);
        }
        return DEFAULT_VISIBLE;
    });

    // Persist to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
        } catch (e) {
            console.warn('Failed to save scanner columns to localStorage:', e);
        }
    }, [visibleColumns]);

    // Get active column definitions in order
    const columns = useMemo(() => {
        return visibleColumns
            .map(id => ALL_COLUMNS.find(col => col.id === id))
            .filter((col): col is ColumnDef => col !== undefined);
    }, [visibleColumns]);

    // Group columns by category for selector
    const columnsByCategory = useMemo(() => {
        const grouped: Record<ColumnCategory, ColumnDef[]> = {
            core: [],
            limit: [],
            alchemy: [],
            timestamps: [],
            volume: [],
            trends: [],
            volTrends: [],
            ratios: [],
            sparklines: [],
        };
        ALL_COLUMNS.forEach(col => {
            grouped[col.category].push(col);
        });
        return grouped;
    }, []);

    const toggleColumn = useCallback((columnId: string) => {
        setVisibleColumns(prev => {
            if (prev.includes(columnId)) {
                return prev.filter(id => id !== columnId);
            }
            // Add at appropriate position
            const colIndex = ALL_COLUMNS.findIndex(c => c.id === columnId);
            const newList = [...prev];
            // Find insertion point
            let insertAt = newList.length;
            for (let i = 0; i < newList.length; i++) {
                const existingIndex = ALL_COLUMNS.findIndex(c => c.id === newList[i]);
                if (existingIndex > colIndex) {
                    insertAt = i;
                    break;
                }
            }
            newList.splice(insertAt, 0, columnId);
            return newList;
        });
    }, []);

    const resetToDefault = useCallback(() => {
        setVisibleColumns(DEFAULT_VISIBLE);
    }, []);

    const isColumnVisible = useCallback((columnId: string) => {
        return visibleColumns.includes(columnId);
    }, [visibleColumns]);

    return {
        columns,
        visibleColumns,
        columnsByCategory,
        toggleColumn,
        resetToDefault,
        isColumnVisible,
    };
}
