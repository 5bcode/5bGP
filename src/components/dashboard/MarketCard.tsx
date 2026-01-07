import React from 'react';
import { Card } from '@/components/ui/card';
import { ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { MarketHighlightItem } from '@/hooks/use-market-highlights';
import { useNavigate } from 'react-router-dom';
import { formatGP } from '@/lib/osrs-math';

interface MarketCardProps {
    title: string;
    icon?: React.ReactNode;
    items: MarketHighlightItem[];
    type?: 'gainers' | 'losers' | 'neutral';
    onViewAll?: () => void;
}

const MarketCard = React.memo(({ title, icon, items, type = 'neutral', onViewAll }: MarketCardProps) => {
    const navigate = useNavigate();

    return (
        <div className="glass-card flex flex-col overflow-hidden h-full clickable-card group/card">
            <div className="p-4 border-b border-slate-800/60 flex justify-between items-center bg-slate-950/20 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-slate-100 font-bold tracking-tight">
                    {icon}
                    <span>{title}</span>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onViewAll?.(); }}
                    className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-500 hover:text-emerald-400 transition-colors"
                >
                    <ArrowRight size={14} />
                </button>
            </div>

            <div className="flex-1 overflow-auto px-2 py-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                <table className="w-full text-sm border-separate border-spacing-y-1">
                    <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-slate-600">
                            <th className="text-left px-2 font-bold">Item</th>
                            <th className="text-right px-2 font-bold">Price</th>
                            <th className="text-right px-2 font-bold">
                                {type === 'gainers' ? 'Change' : type === 'losers' ? 'Change' : 'Profit'}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr
                                key={item.id}
                                onClick={() => navigate(`/item/${item.id}`)}
                                className="group hover:bg-slate-800/40 transition-colors cursor-pointer rounded-lg overflow-hidden"
                            >
                                <td className="py-2 px-2 rounded-l-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden shadow-sm group-hover:border-slate-700 transition-colors">
                                            <img
                                                src={`https://static.runelite.net/cache/item/icon/${item.id}.png`}
                                                alt={item.name}
                                                loading="lazy"
                                                className="w-full h-full object-contain p-1"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                    (e.target as HTMLImageElement).parentElement!.innerText = '??';
                                                    (e.target as HTMLImageElement).parentElement!.classList.add('text-[8px]', 'text-slate-500');
                                                }}
                                            />
                                        </div>
                                        <span className="text-slate-300 font-medium truncate max-w-[120px] group-hover:text-emerald-300 transition-colors text-xs">
                                            {item.name}
                                        </span>
                                    </div>
                                </td>
                                <td className="text-right py-2 px-2 text-slate-400 font-mono text-xs">
                                    {formatGP(item.price)}
                                </td>
                                <td className={`text-right py-2 px-2 rounded-r-lg font-mono text-xs font-bold ${item.isPositive === true ? 'text-emerald-400' :
                                    item.isPositive === false ? 'text-rose-400' : 'text-slate-300'
                                    }`}>
                                    {item.metricLabel}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

export default MarketCard;
