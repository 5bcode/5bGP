import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useScannerColumns, ScannerRow } from '@/hooks/use-scanner-columns';
import { MarketOpportunity } from '@/hooks/use-market-analysis';
import { Item } from '@/services/osrs-api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, ArrowUpDown, Plus, Check, ExternalLink } from 'lucide-react';
import ItemIcon from '@/components/ItemIcon';
import ScannerRangeBar from '@/components/ScannerRangeBar';
import ConnectedSparklineCell from '@/components/scanner/ConnectedSparklineCell';
import { useSettings } from '@/context/SettingsContext';
import { Link } from 'react-router-dom';

interface VirtualizedScannerTableProps {
    data: MarketOpportunity[];
    sortConfig: { key: string; direction: 'asc' | 'desc' };
    onSort: (key: string) => void;
    trackedIds: Set<number>;
    onTrack: (item: Item) => void;
}

const VirtualizedScannerTable = ({ data, sortConfig, onSort, trackedIds, onTrack }: VirtualizedScannerTableProps) => {
    const parentRef = useRef<HTMLDivElement>(null);
    const { settings } = useSettings();
    const { compactMode } = settings;
    const { columns } = useScannerColumns();

    // Virtualizer
    const rowVirtualizer = useVirtualizer({
        count: data.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => compactMode ? 40 : 64, // Row height
        overscan: 10,
    });

    // Column Sizing Strategy using CSS Grid
    // 1. Checkbox/Icon Column: 60px
    // 2. Dynamic Columns: width || minmax(100px, 1fr)
    // 3. Actions Column: 100px
    const gridTemplateColumns = useMemo(() => {
        const colSizes = columns.map(c => c.width ? `${c.width}px` : `minmax(120px, 1fr)`);
        return `60px ${colSizes.join(' ')} 100px`;
    }, [columns]);

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig.key !== column) return <ArrowUpDown size={14} className="ml-1 opacity-20" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="ml-1 text-emerald-500" />
            : <ArrowDown size={14} className="ml-1 text-emerald-500" />;
    };

    if (data.length === 0) {
        return (
            <div className="h-96 flex flex-col items-center justify-center text-slate-600 space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <ArrowUpDown size={32} className="opacity-20" />
                </div>
                <p className="font-bold tracking-tight uppercase text-xs">No scan matches found</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full border border-slate-800 rounded-lg overflow-hidden bg-slate-950/20 backdrop-blur-sm">
            {/* Header Row */}
            <div
                className="grid bg-slate-950/80 border-b border-slate-800 z-10 sticky top-0 font-bold text-[11px] uppercase tracking-tighter text-slate-500 select-none items-center"
                style={{ gridTemplateColumns, paddingRight: 6 }} // Scrollbar padding approx
            >
                {/* Icon Col Header */}
                <div className={cn("h-full flex items-center justify-center border-r border-slate-800/30", compactMode ? "py-1" : "py-4")}></div>

                {columns.map((col) => (
                    <div
                        key={col.id}
                        className={cn(
                            "flex items-center px-4 cursor-pointer hover:text-slate-200 transition-colors border-r border-slate-800/30 h-full",
                            col.align === 'right' && "justify-end",
                            col.align === 'center' && "justify-center",
                            compactMode ? "py-1" : "py-4"
                        )}
                        onClick={col.sortable ? () => onSort(col.id) : undefined}
                    >
                        {col.label}
                        {col.sortable && <SortIcon column={col.id} />}
                    </div>
                ))}

                {/* Actions Col Header */}
                <div className={cn("h-full flex items-center justify-center", compactMode ? "py-1" : "py-4")}></div>
            </div>

            {/* Virtual Body */}
            <div
                ref={parentRef}
                className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
            >
                <div
                    style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const row = data[virtualRow.index];
                        const isTracked = trackedIds.has(row.item.id);

                        // Prep accessors
                        const scannerRow: ScannerRow = {
                            item: row.item,
                            price: row.price,
                            stats: row.stats,
                            score: row.score,
                            metric: row.metric,
                            secondaryMetric: row.secondaryMetric,
                        };

                        return (
                            <div
                                key={virtualRow.key}
                                className={cn(
                                    "absolute top-0 left-0 w-full grid transition-colors border-b border-slate-800/20",
                                    isTracked ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-slate-800/40'
                                )}
                                style={{
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                    gridTemplateColumns,
                                }}
                            >
                                {/* 1. Icon Cell */}
                                <div className={cn("flex items-center justify-center border-r border-slate-800/20 px-2", compactMode ? "py-0" : "py-2")}>
                                    <ItemIcon
                                        item={row.item}
                                        size={compactMode ? "sm" : "md"}
                                        className="bg-slate-900 rounded border border-slate-800 shadow-inner"
                                    />
                                </div>

                                {/* 2. Dynamic Columns */}
                                {columns.map((col) => {
                                    // Custom Renderer: Item Name
                                    if (col.id === 'item') {
                                        return (
                                            <div key={col.id} className={cn("flex flex-col justify-center px-4 border-r border-slate-800/20 truncate", compactMode ? "text-xs" : "")}>
                                                <Link to={`/item/${row.item.id}`} className="font-bold text-slate-100 hover:text-emerald-400 transition-colors truncate">
                                                    {row.item.name}
                                                </Link>
                                                {!compactMode && (
                                                    <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono mt-0.5">
                                                        <span>#{row.item.id}</span>
                                                        {row.item.limit && <span className="border border-slate-800/50 px-1 rounded">L: {row.item.limit}</span>}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    // Custom Renderer: Buy Price (Range Bar)
                                    if (col.id === 'buyPrice') {
                                        return (
                                            <div key={col.id} className={cn("flex flex-col justify-center px-4 border-r border-slate-800/20 text-right font-mono text-slate-300", compactMode ? "text-xs" : "")}>
                                                <span className="text-white font-bold">{col.format ? col.format(col.accessor(scannerRow) as any) : col.accessor(scannerRow)}</span>
                                                {!compactMode && row.stats.avgHighPrice && row.stats.avgLowPrice && (
                                                    <div className="w-24 ml-auto mt-1 opacity-60">
                                                        <ScannerRangeBar
                                                            current={row.price.low}
                                                            low={row.stats.avgLowPrice}
                                                            high={row.stats.avgHighPrice}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    // Custom Renderer: Sparklines
                                    if (col.category === 'sparklines') {
                                        const timeframe = col.id.replace('sparkline', '');
                                        const days = timeframe === '7d' ? 7 : 1;
                                        const timestep = timeframe === '24h' ? '5m' : '1h';

                                        return (
                                            <div key={col.id} className="flex items-center justify-center border-r border-slate-800/20 p-2">
                                                <ConnectedSparklineCell
                                                    itemId={row.item.id}
                                                    timestep={timestep}
                                                    days={days}
                                                />
                                            </div>
                                        )
                                    }

                                    // Default Renderer
                                    const rawValue = col.accessor(scannerRow);
                                    const formattedValue = col.format ? col.format(rawValue as any) : rawValue;
                                    let colorClass = "text-slate-400";
                                    if (col.colorize && typeof rawValue === 'number') {
                                        if (rawValue > 0) colorClass = "text-emerald-400 font-bold";
                                        else if (rawValue < 0) colorClass = "text-rose-500 font-bold";
                                    }

                                    return (
                                        <div
                                            key={col.id}
                                            className={cn(
                                                "flex items-center px-4 border-r border-slate-800/20 truncate",
                                                col.align === 'right' && "justify-end text-right font-mono",
                                                col.align === 'center' && "justify-center text-center",
                                                colorClass,
                                                compactMode ? "text-xs" : ""
                                            )}
                                        >
                                            {formattedValue}
                                        </div>
                                    );
                                })}

                                {/* 3. Actions Column */}
                                <div className="flex items-center justify-center bg-slate-950/10 gap-1.5 px-2">
                                    {isTracked ? (
                                        <div className="h-8 w-8 flex items-center justify-center text-emerald-500 bg-emerald-500/10 rounded-lg" title="In Watchlist">
                                            <Check size={16} />
                                        </div>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10"
                                            onClick={() => onTrack(row.item)}
                                        >
                                            <Plus size={18} />
                                        </Button>
                                    )}
                                    <a href={`https://prices.runescape.wiki/osrs/item/${row.item.id}`} target="_blank" rel="noreferrer" className="hidden sm:block">
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-700 hover:text-blue-400 hover:bg-blue-500/10">
                                            <ExternalLink size={16} />
                                        </Button>
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default VirtualizedScannerTable;
