import React, { useState, useMemo } from 'react';
import { MarketHighlightItem } from '@/hooks/use-market-highlights';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatGP } from '@/lib/osrs-math';

interface SortableMarketTableProps {
    data: MarketHighlightItem[];
}

type SortKey = 'name' | 'price' | 'metric' | 'volume' | 'roi' | 'spread';
type SortDirection = 'asc' | 'desc';

const SortableMarketTable = React.memo(({ data }: SortableMarketTableProps) => {
    const navigate = useNavigate();
    const [sortKey, setSortKey] = useState<SortKey>('metric');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('desc');
        }
    };

    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            let aVal: string | number | boolean = '';
            let bVal: string | number | boolean = '';

            if (sortKey === 'name') {
                aVal = a.name.toLowerCase();
                bVal = b.name.toLowerCase();
            } else if (sortKey === 'price') {
                aVal = a.price;
                bVal = b.price;
            } else if (sortKey === 'metric') {
                aVal = a.metric;
                bVal = b.metric;
            } else if (sortKey === 'volume') {
                aVal = a.volume;
                bVal = b.volume;
            } else if (sortKey === 'roi') {
                aVal = a.roi;
                bVal = b.roi;
            } else if (sortKey === 'spread') {
                aVal = a.spread;
                bVal = b.spread;
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortKey, sortDirection]);

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortKey !== column) return <ArrowUpDown size={14} className="ml-1 text-slate-600 opacity-50" />;
        return sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1 text-emerald-500" /> : <ArrowDown size={14} className="ml-1 text-emerald-500" />;
    };

    return (
        <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-950/20 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-800/40">
                        <tr>
                            <th
                                className="px-6 py-4 cursor-pointer hover:text-slate-300 transition-colors select-none group"
                                onClick={() => handleSort('name')}
                            >
                                <div className="flex items-center">
                                    Item <SortIcon column="name" />
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 text-right cursor-pointer hover:text-slate-300 transition-colors select-none group"
                                onClick={() => handleSort('volume')}
                            >
                                <div className="flex items-center justify-end">
                                    Volume <SortIcon column="volume" />
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 text-right cursor-pointer hover:text-slate-300 transition-colors select-none group"
                                onClick={() => handleSort('price')}
                            >
                                <div className="flex items-center justify-end">
                                    Price <SortIcon column="price" />
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 text-right cursor-pointer hover:text-slate-300 transition-colors select-none group"
                                onClick={() => handleSort('spread')}
                            >
                                <div className="flex items-center justify-end">
                                    Spread <SortIcon column="spread" />
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 text-right cursor-pointer hover:text-slate-300 transition-colors select-none group"
                                onClick={() => handleSort('roi')}
                            >
                                <div className="flex items-center justify-end">
                                    ROI <SortIcon column="roi" />
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 text-right cursor-pointer hover:text-slate-300 transition-colors select-none group"
                                onClick={() => handleSort('metric')}
                            >
                                <div className="flex items-center justify-end">
                                    Metric <SortIcon column="metric" />
                                </div>
                            </th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30">
                        {sortedData.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-800/40 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center relative overflow-hidden shadow-sm group-hover:border-slate-700 transition-colors">
                                            <img
                                                src={`https://static.runelite.net/cache/item/icon/${item.id}.png`}
                                                alt={item.name}
                                                loading="lazy"
                                                className="w-8 h-8 object-contain"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                            {item.members && (
                                                <div className="absolute top-1 right-1">
                                                    <Crown size={8} className="text-amber-500 fill-amber-500" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-200 group-hover:text-emerald-300 transition-colors">{item.name}</span>
                                            {item.members ?
                                                <span className="text-[10px] text-amber-500/80 font-medium">MEMBERS</span> :
                                                <span className="text-[10px] text-slate-500 font-medium">F2P</span>
                                            }
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-slate-400 text-xs">
                                    <div className="flex items-center justify-end gap-2">
                                        <span>{item.volume.toLocaleString()}</span>
                                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-slate-600 rounded-full"
                                                style={{ width: `${Math.min(100, Math.max(5, (item.volume / 10000) * 100))}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-slate-300 text-sm font-medium">
                                    {formatGP(item.price)}
                                </td>

                                {/* Spread Column */}
                                <td className="px-6 py-4 text-right font-mono text-xs">
                                    <span className={`px-2 py-0.5 rounded font-medium ${item.spread > 5 ? 'bg-amber-500/10 text-amber-500' :
                                        item.spread > 1 ? 'bg-emerald-500/10 text-emerald-500' :
                                            'text-slate-500'
                                        }`}>
                                        {item.spread.toFixed(2)}%
                                    </span>
                                </td>

                                {/* ROI Column */}
                                <td className="px-6 py-4 text-right font-mono text-xs">
                                    <span className={`px-2 py-0.5 rounded font-bold ${item.roi > 5 ? 'bg-purple-500/10 text-purple-400' :
                                        item.roi > 1 ? 'bg-emerald-500/10 text-emerald-400' :
                                            'text-slate-500'
                                        }`}>
                                        {item.roi.toFixed(2)}%
                                    </span>
                                </td>

                                <td className={`px-6 py-4 text-right font-mono font-bold text-sm ${item.isPositive === true ? 'text-emerald-400 shadow-emerald-900/10 drop-shadow-sm' :
                                    item.isPositive === false ? 'text-rose-400' : 'text-slate-300'
                                    }`}>
                                    {item.metricLabel}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => navigate(`/item/${item.id}`)}
                                        className="text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 h-8 text-xs font-medium"
                                    >
                                        Analyze
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

export default SortableMarketTable;
