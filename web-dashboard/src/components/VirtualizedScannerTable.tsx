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
        estimateSize: () => compactMode ? 48 : 80, // Slightly larger for premium feel
        overscan: 15,
    });

    const gridTemplateColumns = useMemo(() => {
        const colSizes = columns.map(c => c.width ? `${c.width}px` : `minmax(140px, 1fr)`);
        return `80px ${colSizes.join(' ')} 120px`;
    }, [columns]);

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig.key !== column) return <ArrowUpDown size={12} className="ml-2 opacity-10" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={12} className="ml-2 text-emerald-500" />
            : <ArrowDown size={12} className="ml-2 text-emerald-500" />;
    };

    if (data.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-6 bg-slate-950/40">
                <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center">
                    <ArrowUpDown size={48} className="opacity-10" />
                </div>
                <div className="text-center space-y-2">
                    <p className="font-black tracking-[0.2em] uppercase text-xs text-slate-400">No signals detected</p>
                    <p className="text-sm text-slate-600">Adjust your strategy or filters to find opportunities.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-950/20">
            {/* Header Row */}
            <div
                className="grid bg-slate-950 border-b border-white/5 z-10 sticky top-0 font-black text-[10px] uppercase tracking-[0.2em] text-slate-500 items-center"
                style={{ gridTemplateColumns, paddingRight: 6 }}
            >
                <div className={cn("h-full flex items-center justify-center border-r border-white/5", compactMode ? "py-3" : "py-6")}>
                    Icon
                </div>

                {columns.map((col) => (
                    <div
                        key={col.id}
                        className={cn(
                            "flex items-center px-6 cursor-pointer hover:text-white transition-colors border-r border-white/5 h-full group",
                            col.align === 'right' && "justify-end",
                            col.align === 'center' && "justify-center",
                            compactMode ? "py-3" : "py-4"
                        )}
                        onClick={col.sortable ? () => onSort(col.id) : undefined}
                    >
                        {col.label}
                        {col.sortable && <SortIcon column={col.id} />}
                    </div>
                ))}

                <div className={cn("h-full flex items-center justify-center", compactMode ? "py-3" : "py-6")}>
                    Actions
                </div>
            </div>

            {/* Virtual Body */}
            <div
                ref={parentRef}
                className="flex-1 overflow-y-auto scrollbar-none"
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
                                    "absolute top-0 left-0 w-full grid transition-all border-b border-white/5 group/row",
                                    isTracked ? 'bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06]' : 'hover:bg-white/[0.02]'
                                )}
                                style={{
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                    gridTemplateColumns,
                                }}
                            >
                                {/* 1. Icon Cell */}
                                <div className={cn("flex items-center justify-center border-r border-white/5 px-2", compactMode ? "py-1" : "py-3")}>
                                    <div className="relative group/icon">
                                        <div className="absolute -inset-2 bg-emerald-500/20 rounded-xl blur opacity-0 group-hover/row:opacity-100 transition duration-500" />
                                        <ItemIcon
                                            item={row.item}
                                            size={compactMode ? "sm" : "md"}
                                            className="relative bg-slate-950 rounded-xl border border-white/5 shadow-2xl group-hover/row:scale-110 transition-transform"
                                        />
                                    </div>
                                </div>

                                {/* 2. Dynamic Columns */}
                                {columns.map((col) => {
                                    if (col.id === 'item') {
                                        return (
                                            <div key={col.id} className={cn("flex flex-col justify-center px-6 border-r border-white/5 truncate", compactMode ? "text-xs" : "")}>
                                                <Link to={`/item/${row.item.id}`} className="font-black text-white hover:text-emerald-400 transition-colors truncate uppercase tracking-tight">
                                                    {row.item.name}
                                                </Link>
                                                {!compactMode && (
                                                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono mt-1">
                                                        <span className="bg-white/5 px-1.5 py-0.5 rounded">#{row.item.id}</span>
                                                        {row.item.limit && <span className="text-slate-600">Limit: {row.item.limit.toLocaleString()}</span>}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    if (col.id === 'buyPrice') {
                                        return (
                                            <div key={col.id} className={cn("flex flex-col justify-center px-6 border-r border-white/5 text-right font-mono", compactMode ? "text-xs" : "")}>
                                                <span className="text-white font-black">{col.format ? col.format(col.accessor(scannerRow) as any) : col.accessor(scannerRow)}</span>
                                                {!compactMode && row.stats.avgHighPrice && row.stats.avgLowPrice && (
                                                    <div className="w-24 ml-auto mt-2 opacity-40 group-hover/row:opacity-100 transition-opacity">
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

                                    if (col.category === 'sparklines') {
                                        const timeframe = col.id.replace('sparkline', '');
                                        const days = timeframe === '7d' ? 7 : 1;
                                        const timestep = timeframe === '24h' ? '5m' : '1h';

                                        return (
                                            <div key={col.id} className="flex items-center justify-center border-r border-white/5 p-4">
                                                <div className="w-full h-full opacity-60 group-hover/row:opacity-100 transition-opacity">
                                                    <ConnectedSparklineCell
                                                        itemId={row.item.id}
                                                        timestep={timestep}
                                                        days={days}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    }

                                    const rawValue = col.accessor(scannerRow);
                                    const formattedValue = col.format ? col.format(rawValue as any) : rawValue;
                                    let colorClass = "text-slate-400";
                                    if (col.colorize && typeof rawValue === 'number') {
                                        if (rawValue > 0) colorClass = "text-emerald-400 font-black";
                                        else if (rawValue < 0) colorClass = "text-rose-500 font-black";
                                    }

                                    return (
                                        <div
                                            key={col.id}
                                            className={cn(
                                                "flex items-center px-6 border-r border-white/5 truncate",
                                                col.align === 'right' && "justify-end text-right font-mono",
                                                col.align === 'center' && "justify-center text-center",
                                                colorClass,
                                                compactMode ? "text-xs" : "text-sm"
                                            )}
                                        >
                                            {formattedValue}
                                        </div>
                                    );
                                })}

                                {/* 3. Actions Column */}
                                <div className="flex items-center justify-center gap-3 px-4">
                                    {isTracked ? (
                                        <div className="h-10 w-10 flex items-center justify-center text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/20" title="In Watchlist">
                                            <Check size={18} />
                                        </div>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-10 w-10 p-0 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl"
                                            onClick={() => onTrack(row.item)}
                                        >
                                            <Plus size={20} />
                                        </Button>
                                    )}
                                    <a href={`https://prices.runescape.wiki/osrs/item/${row.item.id}`} target="_blank" rel="noreferrer" className="hidden sm:block">
                                        <Button size="sm" variant="ghost" className="h-10 w-10 p-0 text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl">
                                            <ExternalLink size={18} />
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
