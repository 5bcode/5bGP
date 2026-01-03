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

const MarketCard = ({ title, icon, items, type = 'neutral', onViewAll }: MarketCardProps) => {
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
                    className="text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-emerald-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                    view all <ArrowRight size={12} />
                </button>
            </div>

            <div className="flex-1 overflow-auto p-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800/40">
                            <th className="text-left pb-2 pl-2 font-semibold">Item</th>
                            <th className="text-right pb-2 font-semibold">Price</th>
                            <th className="text-right pb-2 pr-2 font-semibold">
                                {type === 'gainers' ? 'Change' : type === 'losers' ? 'Change' : 'Profit'}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30">
                        {items.map((item) => (
                            <tr
                                key={item.id}
                                onClick={() => navigate(`/item/${item.id}`)}
                                className="group hover:bg-slate-800/40 transition-colors cursor-pointer"
                            >
                                <td className="py-2.5 pl-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden shadow-sm group-hover:border-slate-700 transition-colors">
                                            <img
                                                src={`https://static.runelite.net/cache/item/icon/${item.id}.png`}
                                                alt={item.name}
                                                className="w-full h-full object-contain p-1"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                    (e.target as HTMLImageElement).parentElement!.innerText = '??';
                                                    (e.target as HTMLImageElement).parentElement!.classList.add('text-[8px]', 'text-slate-500');
                                                }}
                                            />
                                        </div>
                                        <span className="text-slate-300 font-medium truncate max-w-[120px] group-hover:text-emerald-300 transition-colors">
                                            {item.name}
                                        </span>
                                    </div>
                                </td>
                                <td className="text-right py-2.5 text-slate-400 font-mono text-xs">
                                    {formatGP(item.price)}
                                </td>
                                <td className={`text-right py-2.5 pr-2 font-mono text-xs font-bold ${item.isPositive === true ? 'text-emerald-400' :
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
};

export default MarketCard;
