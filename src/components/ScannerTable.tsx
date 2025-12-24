import React from 'react';
import { Link } from 'react-router-dom';
import { Item, PriceData, Stats24h } from '@/services/osrs-api';
import { MarketOpportunity } from '@/hooks/use-market-analysis';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, ArrowUpDown, Plus, Check, ExternalLink } from 'lucide-react';
import { formatGP } from '@/lib/osrs-math';
import ItemIcon from '@/components/ItemIcon';

interface ScannerTableProps {
  data: MarketOpportunity[];
  type: 'crash' | 'flip';
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  onSort: (key: string) => void;
  trackedIds: Set<number>;
  onTrack: (item: Item) => void;
}

const ScannerTable = ({ data, type, sortConfig, onSort, trackedIds, onTrack }: ScannerTableProps) => {
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
    <Table>
        <TableHeader className="bg-slate-950">
            <TableRow className="border-slate-800 hover:bg-slate-950">
                <TableHead className="w-[80px]"></TableHead>
                
                <TableHead 
                    className="text-slate-400 cursor-pointer hover:text-slate-200 select-none"
                    onClick={() => onSort('name')}
                >
                    <div className="flex items-center gap-1">Item <SortIcon column="name"/></div>
                </TableHead>
                
                <TableHead 
                    className="text-right text-slate-400 cursor-pointer hover:text-slate-200 select-none"
                    onClick={() => onSort('price')}
                >
                    <div className="flex items-center justify-end gap-1">Buy Price <SortIcon column="price"/></div>
                </TableHead>
                
                <TableHead 
                    className="text-right text-slate-400 cursor-pointer hover:text-slate-200 select-none"
                    onClick={() => onSort('metric')}
                >
                    <div className="flex items-center justify-end gap-1">
                        {type === 'crash' ? 'Drop %' : 'Profit / Item'} <SortIcon column="metric"/>
                    </div>
                </TableHead>
                
                <TableHead 
                    className="text-right text-slate-400 cursor-pointer hover:text-slate-200 select-none"
                    onClick={() => onSort('secondary')}
                >
                    <div className="flex items-center justify-end gap-1">
                        {type === 'crash' ? 'Potential Profit' : 'ROI'} <SortIcon column="secondary"/>
                    </div>
                </TableHead>
                
                <TableHead 
                    className="text-right text-slate-400 cursor-pointer hover:text-slate-200 select-none"
                    onClick={() => onSort('volume')}
                >
                    <div className="flex items-center justify-end gap-1">Volume (24h) <SortIcon column="volume"/></div>
                </TableHead>
                
                <TableHead 
                    className="text-right text-slate-400 cursor-pointer hover:text-slate-200 select-none"
                    onClick={() => onSort('score')}
                >
                    <div className="flex items-center justify-end gap-1">Score <SortIcon column="score"/></div>
                </TableHead>
                
                <TableHead className="w-[100px]"></TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {data.map((row) => {
                const isTracked = trackedIds.has(row.item.id);
                return (
                    <TableRow key={row.item.id} className={`border-slate-800 ${isTracked ? 'bg-emerald-950/10 hover:bg-emerald-950/20' : 'hover:bg-slate-800/50'}`}>
                        <TableCell>
                            <ItemIcon item={row.item} size="md" />
                        </TableCell>
                        <TableCell className="font-medium text-slate-200">
                            <div className="flex flex-col">
                                <Link to={`/item/${row.item.id}`} className="hover:text-emerald-400 transition-colors">
                                    {row.item.name}
                                </Link>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span>ID: {row.item.id}</span>
                                    {row.item.limit && <span className="bg-slate-950 px-1 rounded">Lim: {row.item.limit}</span>}
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-300">
                            {formatGP(row.price.low)}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${type === 'crash' ? 'text-rose-500' : 'text-emerald-400'}`}>
                            {type === 'crash' 
                                ? `-${row.metric.toFixed(1)}%` 
                                : `+${formatGP(row.metric)}`
                            }
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-400">
                            {type === 'crash'
                                ? formatGP(row.secondaryMetric)
                                : `${row.secondaryMetric.toFixed(2)}%`
                            }
                        </TableCell>
                        <TableCell className="text-right text-slate-400">
                            {formatGP(row.stats.highPriceVolume + row.stats.lowPriceVolume)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-slate-500">
                            {row.score.toFixed(1)}
                        </TableCell>
                        <TableCell>
                            <div className="flex justify-end gap-2">
                                {isTracked ? (
                                    <div className="h-8 w-8 flex items-center justify-center text-emerald-500" title="Already Tracked">
                                        <Check size={16} />
                                    </div>
                                ) : (
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-400"
                                        onClick={() => onTrack(row.item)}
                                        title="Track Item"
                                    >
                                        <Plus size={16} />
                                    </Button>
                                )}
                                <a href={`https://prices.runescape.wiki/osrs/item/${row.item.id}`} target="_blank" rel="noreferrer">
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-blue-400">
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
  );
};

export default ScannerTable;