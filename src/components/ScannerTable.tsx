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
            <div className="h-64 flex flex-col items-center justify-center text-slate-500">
                <p>No results found for this filter.</p>
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto">
            <Table className="min-w-[800px]">
                <TableHeader className="bg-slate-950">
                    <TableRow className="border-slate-800 hover:bg-slate-950">
                        {/* Always show ItemIcon column */}
                        <TableHead className={compactMode ? "h-8 py-1 w-12" : "w-16"}></TableHead>

                        {/* Dynamic Columns */}
                        {columns.map((col) => (
                            <TableHead
                                key={col.id}
                                className={cn(
                                    "text-slate-400 cursor-pointer hover:text-slate-200 select-none",
                                    compactMode && "h-8 py-1",
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

                        {/* Actions Column */}
                        <TableHead className={compactMode ? "h-8 py-1 w-20" : "w-24"}></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row) => {
                        const isTracked = trackedIds.has(row.item.id);

                        // Construct the unified ScannerRow object
                        const scannerRow: ScannerRow = {
                            item: row.item,
                            price: row.price,
                            stats: row.stats,
                            score: row.score,
                            metric: row.metric,
                            secondaryMetric: row.secondaryMetric,
                        };

                        return (
                            <TableRow key={row.item.id} className={cn("border-slate-800", isTracked ? 'bg-emerald-950/10 hover:bg-emerald-950/20' : 'hover:bg-slate-800/50')}>
                                {/* Icon Column */}
                                <TableCell className={compactMode ? "py-1" : ""}>
                                    <ItemIcon item={row.item} size={compactMode ? "sm" : "md"} />
                                </TableCell>

                                {/* Dynamic Cells */}
                                {columns.map((col) => {
                                    // Custom rendering logic for specific columns
                                    if (col.id === 'item') {
                                        return (
                                            <TableCell key={col.id} className={cn("font-medium text-slate-200", compactMode && "py-1 text-xs")}>
                                                <div className="flex flex-col">
                                                    <Link to={`/item/${row.item.id}`} className="hover:text-emerald-400 transition-colors">
                                                        {row.item.name}
                                                    </Link>
                                                    {!compactMode && (
                                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                                            <span>ID: {row.item.id}</span>
                                                            {row.item.limit && <span className="bg-slate-950 px-1 rounded">Lim: {row.item.limit}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        );
                                    }

                                    if (col.id === 'buyPrice') {
                                        return (
                                            <TableCell key={col.id} className={cn("text-right font-mono text-slate-300", compactMode && "py-1 text-xs")}>
                                                {col.format ? col.format(col.accessor(scannerRow) as any) : col.accessor(scannerRow)}
                                                {!compactMode && row.stats.avgHighPrice && row.stats.avgLowPrice && (
                                                    <div className="w-24 ml-auto mt-1">
                                                        <ScannerRangeBar
                                                            current={row.price.low}
                                                            low={row.stats.avgLowPrice}
                                                            high={row.stats.avgHighPrice}
                                                        />
                                                    </div>
                                                )}
                                            </TableCell>
                                        );
                                    }

                                    if (col.category === 'sparklines') {
                                        const timeframe = col.id.replace('sparkline', ''); // '24h', '7d', etc.
                                        let days = 1;
                                        if (timeframe === '7d') days = 7;
                                        // 1m and 1y would need separate logic or passing days=30 etc.

                                        // Assuming 5m timestep for 24h, 1h for 7d+ would be better but let's stick to 5m/1h based on what we have
                                        const timestep = timeframe === '24h' ? '5m' : '1h';

                                        return (
                                            <TableCell key={col.id} className={cn(compactMode && "py-1")}>
                                                <div className="flex justify-center">
                                                    <ConnectedSparklineCell
                                                        itemId={row.item.id}
                                                        timestep={timestep}
                                                        days={days}
                                                    />
                                                </div>
                                            </TableCell>
                                        );
                                    }

                                    // Default rendering
                                    const rawValue = col.accessor(scannerRow);
                                    const formattedValue = col.format ? col.format(rawValue as any) : rawValue;

                                    let colorClass = "text-slate-400";
                                    if (col.colorize && typeof rawValue === 'number') {
                                        if (rawValue > 0) colorClass = "text-emerald-400";
                                        else if (rawValue < 0) colorClass = "text-rose-500";
                                    }
                                    if (col.id.includes('score')) colorClass = "text-slate-500";

                                    return (
                                        <TableCell
                                            key={col.id}
                                            className={cn(
                                                compactMode && "py-1 text-xs",
                                                col.align === 'right' && "text-right font-mono",
                                                col.align === 'center' && "text-center",
                                                colorClass
                                            )}
                                        >
                                            {formattedValue}
                                        </TableCell>
                                    );
                                })}

                                {/* Actions Column */}
                                <TableCell className={compactMode ? "py-1" : ""}>
                                    <div className="flex justify-end gap-2">
                                        {isTracked ? (
                                            <div className="h-8 w-8 flex items-center justify-center text-emerald-500" title="Already Tracked">
                                                <Check size={16} />
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className={cn("text-slate-400 hover:text-emerald-400", compactMode ? "h-6 w-6 p-0" : "h-8 w-8 p-0")}
                                                onClick={() => onTrack(row.item)}
                                                title="Track Item"
                                            >
                                                <Plus size={16} />
                                            </Button>
                                        )}
                                        <a href={`https://prices.runescape.wiki/osrs/item/${row.item.id}`} target="_blank" rel="noreferrer">
                                            <Button size="sm" variant="ghost" className={cn("text-slate-500 hover:text-blue-400", compactMode ? "h-6 w-6 p-0" : "h-8 w-8 p-0")}>
                                                <ExternalLink size={14} />
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