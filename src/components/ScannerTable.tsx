import React from 'react';
import { Link } from 'react-router-dom';
import { Item } from '@/services/osrs-api';
import { MarketOpportunity } from '@/hooks/use-market-analysis';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, ArrowUpDown, Plus, Check, ExternalLink } from 'lucide-react';
import { formatGP } from '@/lib/osrs-math';
import ItemIcon from '@/components/ItemIcon';
import ScannerRangeBar from '@/components/ScannerRangeBar';
import { useSettings } from '@/context/SettingsContext';
import { cn } from '@/lib/utils';

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
                        <TableHead className={compactMode ? "h-8 py-1" : ""}></TableHead>

                        <TableHead
                            className={cn("text-slate-400 cursor-pointer hover:text-slate-200 select-none", compactMode && "h-8 py-1")}
                            onClick={() => onSort('name')}
                        >
                            <div className="flex items-center gap-1">Item <SortIcon column="name" /></div>
                        </TableHead>

                        <TableHead
                            className={cn("text-right text-slate-400 cursor-pointer hover:text-slate-200 select-none", compactMode && "h-8 py-1")}
                            onClick={() => onSort('price')}
                        >
                            <div className="flex items-center justify-end gap-1">Buy Price <SortIcon column="price" /></div>
                        </TableHead>

                        <TableHead
                            className={cn("text-right text-slate-400 cursor-pointer hover:text-slate-200 select-none", compactMode && "h-8 py-1")}
                            onClick={() => onSort('metric')}
                        >
                            <div className="flex items-center justify-end gap-1">
                                {type === 'crash' ? 'Drop %' : 'Profit / Item'} <SortIcon column="metric" />
                            </div>
                        </TableHead>

                        <TableHead
                            className={cn("text-right text-slate-400 cursor-pointer hover:text-slate-200 select-none", compactMode && "h-8 py-1")}
                            onClick={() => onSort('secondary')}
                        >
                            <div className="flex items-center justify-end gap-1">
                                {type === 'crash' ? 'Potential Profit' : 'ROI'} <SortIcon column="secondary" />
                            </div>
                        </TableHead>

                        <TableHead
                            className={cn("text-right text-slate-400 cursor-pointer hover:text-slate-200 select-none", compactMode && "h-8 py-1")}
                            onClick={() => onSort('volume')}
                        >
                            <div className="flex items-center justify-end gap-1">Volume (24h) <SortIcon column="volume" /></div>
                        </TableHead>

                        <TableHead
                            className={cn("text-right text-slate-400 cursor-pointer hover:text-slate-200 select-none", compactMode && "h-8 py-1")}
                            onClick={() => onSort('score')}
                        >
                            <div className="flex items-center justify-end gap-1">Score <SortIcon column="score" /></div>
                        </TableHead>

                        <TableHead className={compactMode ? "h-8 py-1" : ""}></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row) => {
                        const isTracked = trackedIds.has(row.item.id);
                        return (
                            <TableRow key={row.item.id} className={cn("border-slate-800", isTracked ? 'bg-emerald-950/10 hover:bg-emerald-950/20' : 'hover:bg-slate-800/50')}>
                                <TableCell className={compactMode ? "py-1" : ""}>
                                    <ItemIcon item={row.item} size={compactMode ? "sm" : "md"} />
                                </TableCell>
                                <TableCell className={cn("font-medium text-slate-200", compactMode && "py-1 text-xs")}>
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
                                <TableCell className={cn("text-right font-mono text-slate-300", compactMode && "py-1 text-xs")}>
                                    {formatGP(row.price.low)}
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
                                <TableCell className={cn("text-right font-bold", type === 'crash' ? 'text-rose-500' : 'text-emerald-400', compactMode && "py-1 text-xs")}>
                                    {type === 'crash'
                                        ? `-${row.metric.toFixed(1)}%`
                                        : `+${formatGP(row.metric)}`
                                    }
                                </TableCell>
                                <TableCell className={cn("text-right font-mono text-slate-400", compactMode && "py-1 text-xs")}>
                                    {type === 'crash'
                                        ? formatGP(row.secondaryMetric)
                                        : `${row.secondaryMetric.toFixed(2)}%`
                                    }
                                </TableCell>
                                <TableCell className={cn("text-right text-slate-400", compactMode && "py-1 text-xs")}>
                                    {formatGP(row.stats.highPriceVolume + row.stats.lowPriceVolume)}
                                </TableCell>
                                <TableCell className={cn("text-right font-mono text-xs text-slate-500", compactMode && "py-1")}>
                                    {row.score.toFixed(1)}
                                </TableCell>
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