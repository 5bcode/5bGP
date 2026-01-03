import React from 'react';
import { Link } from 'react-router-dom';
import { Item } from '@/services/osrs-api';
import { MarketOpportunity } from '@/hooks/use-market-analysis';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, ArrowUpDown, Plus, Check, ExternalLink } from 'lucide-react';
import ItemIcon from '@/components/ItemIcon';
import ScannerRangeBar from '@/components/ScannerRangeBar';
import { useSettings } from '@/context/SettingsContext';
import { cn } from '@/lib/utils';
import { useScannerColumns, ScannerRow } from '@/hooks/use-scanner-columns';
import ConnectedSparklineCell from '@/components/scanner/ConnectedSparklineCell';

interface ScannerTableProps {
    data: MarketOpportunity[];
    type: 'crash' | 'flip';
    sortConfig: { key: string; direction: 'asc' | 'desc' };
    onSort: (key: string) => void;
    trackedIds: Set<number>;
    onTrack: (item: Item) => void;
}

const ScannerTable = ({ data, type, sortConfig, onSort, trackedIds, onTrack }: ScannerTableProps) => {
    const { settings } = useSettings();
    const { compactMode } = settings;
    const { columns } = useScannerColumns();

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
        <div className="w-full overflow-x-auto">
            <Table className="min-w-[1000px]">
                <TableHeader className="bg-slate-950/40 backdrop-blur-md">
                    <TableRow className="border-slate-800/60 hover:bg-transparent">
                        <TableHead className={cn("w-16 border-r border-slate-800/30", compactMode ? "h-10 py-1" : "h-14 py-4")}></TableHead>

                        {columns.map((col) => (
                            <TableHead
                                key={col.id}
                                className={cn(
                                    "text-slate-500 font-bold uppercase tracking-tighter text-[11px] cursor-pointer hover:text-slate-200 select-none transition-colors border-r border-slate-800/30 last:border-r-0",
                                    compactMode ? "h-10 py-1" : "h-14 py-4",
                                    col.align === 'right' && "text-right",
                                    col.align === 'center' && "text-center",
                                )}
                                style={{ width: col.width }}
                                onClick={col.sortable ? () => onSort(col.id) : undefined}
                            >
                                <div className={cn(
                                    "flex items-center gap-1",
                                    col.align === 'right' && "justify-end",
                                    col.align === 'center' && "justify-center"
                                )}>
                                    {col.label}
                                    {col.sortable && <SortIcon column={col.id} />}
                                </div>
                            </TableHead>
                        ))}

                        <TableHead className={cn("w-24 bg-slate-950/20", compactMode ? "h-10" : "h-14")}></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-800/40">
                    {data.map((row) => {
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
                            <TableRow key={row.item.id} className={cn("border-none group transition-all duration-200", isTracked ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-slate-800/40')}>
                                <TableCell className={cn("border-r border-slate-800/20", compactMode ? "py-1" : "py-4")}>
                                    <ItemIcon item={row.item} size={compactMode ? "sm" : "md"} className="bg-slate-900 rounded border border-slate-800 shadow-inner group-hover:scale-110 transition-transform" />
                                </TableCell>

                                {columns.map((col) => {
                                    if (col.id === 'item') {
                                        return (
                                            <TableCell key={col.id} className={cn("font-bold text-slate-100 border-r border-slate-800/20", compactMode ? "py-1 text-xs" : "py-4")}>
                                                <div className="flex flex-col">
                                                    <Link to={`/item/${row.item.id}`} className="hover:text-emerald-400 transition-colors truncate max-w-[180px]">
                                                        {row.item.name}
                                                    </Link>
                                                    {!compactMode && (
                                                        <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono mt-0.5">
                                                            <span>#{row.item.id}</span>
                                                            {row.item.limit && <span className="text-slate-500 font-bold border border-slate-800/50 px-1 rounded">L: {row.item.limit}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        );
                                    }

                                    if (col.id === 'buyPrice') {
                                        return (
                                            <TableCell key={col.id} className={cn("text-right font-mono text-slate-300 border-r border-slate-800/20", compactMode ? "py-1 text-xs" : "py-4")}>
                                                <span className="text-white font-bold">{col.format ? col.format(col.accessor(scannerRow) as any) : col.accessor(scannerRow)}</span>
                                                {!compactMode && row.stats.avgHighPrice && row.stats.avgLowPrice && (
                                                    <div className="w-24 ml-auto mt-1.5">
                                                        <ScannerRangeBar
                                                            current={row.price.low}
                                                            low={row.stats.avgLowPrice}
                                                            high={row.stats.avgHighPrice}
                                                            className="opacity-60 group-hover:opacity-100 transition-opacity"
                                                        />
                                                    </div>
                                                )}
                                            </TableCell>
                                        );
                                    }

                                    if (col.category === 'sparklines') {
                                        const timeframe = col.id.replace('sparkline', '');
                                        const days = timeframe === '7d' ? 7 : 1;
                                        const timestep = timeframe === '24h' ? '5m' : '1h';

                                        return (
                                            <TableCell key={col.id} className={cn("border-r border-slate-800/20", compactMode ? "py-1" : "py-4")}>
                                                <div className="flex justify-center group-hover:scale-105 transition-transform">
                                                    <ConnectedSparklineCell
                                                        itemId={row.item.id}
                                                        timestep={timestep}
                                                        days={days}
                                                    />
                                                </div>
                                            </TableCell>
                                        );
                                    }

                                    const rawValue = col.accessor(scannerRow);
                                    const formattedValue = col.format ? col.format(rawValue as any) : rawValue;

                                    let colorClass = "text-slate-400";
                                    if (col.colorize && typeof rawValue === 'number') {
                                        if (rawValue > 0) colorClass = "text-emerald-400 font-bold drop-shadow-sm";
                                        else if (rawValue < 0) colorClass = "text-rose-500 font-bold";
                                    }

                                    return (
                                        <TableCell
                                            key={col.id}
                                            className={cn(
                                                "border-r border-slate-800/20",
                                                compactMode ? "py-1 text-xs" : "py-4",
                                                col.align === 'right' && "text-right font-mono",
                                                col.align === 'center' && "text-center",
                                                colorClass
                                            )}
                                        >
                                            {formattedValue}
                                        </TableCell>
                                    );
                                })}

                                <TableCell className={cn("bg-slate-950/10", compactMode ? "py-1" : "py-4")}>
                                    <div className="flex justify-end gap-1.5">
                                        {isTracked ? (
                                            <div className="h-8 w-8 flex items-center justify-center text-emerald-500 bg-emerald-500/10 rounded-lg border border-emerald-500/20" title="In Watchlist">
                                                <Check size={16} />
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className={cn("text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all", compactMode ? "h-7 w-7 p-0" : "h-9 w-9 p-0")}
                                                onClick={() => onTrack(row.item)}
                                            >
                                                <Plus size={18} />
                                            </Button>
                                        )}
                                        <a href={`https://prices.runescape.wiki/osrs/item/${row.item.id}`} target="_blank" rel="noreferrer" className="hidden sm:block">
                                            <Button size="sm" variant="ghost" className={cn("text-slate-700 hover:text-blue-400 hover:bg-blue-500/10 transition-all", compactMode ? "h-7 w-7 p-0" : "h-9 w-9 p-0")}>
                                                <ExternalLink size={16} />
                                            </Button>
                                        </a>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
};

export default ScannerTable;