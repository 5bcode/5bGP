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
        <div className="premium-card flex flex-col h-full group/card animate-page-enter">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-slate-100 shadow-xl border border-white/5 group-hover/card:rotate-6 transition-transform">
                        {icon}
                    </div>
                    <span className="font-black text-sm uppercase tracking-wider text-white">{title}</span>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onViewAll?.(); }}
                    className="h-8 px-3 rounded-lg flex items-center gap-2 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                >
                    All <ArrowRight size={12} />
                </button>
            </div>

            <div className="flex-1 overflow-auto p-4 scrollbar-none">
                <table className="w-full text-sm border-separate border-spacing-y-2">
                    <thead>
                        <tr className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black">
                            <th className="text-left px-2 pb-2">Asset</th>
                            <th className="text-right px-2 pb-2">Entry</th>
                            <th className="text-right px-2 pb-2">
                                {type === 'gainers' ? 'Move' : type === 'losers' ? 'Move' : 'Profit'}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr
                                key={item.id}
                                onClick={() => navigate(`/item/${item.id}`)}
                                className="group/row hover:bg-white/[0.03] transition-all cursor-pointer"
                            >
                                <td className="py-2 px-2 rounded-l-xl border-l border-y border-transparent group-hover/row:border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xl group-hover/row:scale-110 transition-transform">
                                            <img
                                                src={`https://static.runelite.net/cache/item/icon/${item.id}.png`}
                                                alt={item.name}
                                                loading="lazy"
                                                className="w-7 h-7 object-contain"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                    (e.target as HTMLImageElement).parentElement!.innerText = '??';
                                                }}
                                            />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-white font-bold truncate group-hover/row:text-emerald-400 transition-colors text-xs">
                                                {item.name}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-mono">ID: {item.id}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="text-right py-2 px-2 text-slate-300 font-mono text-xs border-y border-transparent group-hover/row:border-white/5">
                                    {formatGP(item.price)}
                                </td>
                                <td className={`text-right py-2 px-2 rounded-r-xl border-r border-y border-transparent group-hover/row:border-white/5 font-mono text-xs font-black ${item.isPositive === true ? 'text-emerald-500' :
                                        item.isPositive === false ? 'text-rose-500' : 'text-slate-300'
                                    }`}>
                                    <div className="flex items-center justify-end gap-1">
                                        {item.isPositive === true && <ArrowUpRight size={10} />}
                                        {item.isPositive === false && <ArrowDownRight size={10} />}
                                        {item.metricLabel}
                                    </div>
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
