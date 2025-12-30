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
}

const MarketCard = ({ title, icon, items, type = 'neutral' }: MarketCardProps) => {
    const navigate = useNavigate();

    return (
        <Card className="bg-slate-900 border-slate-800 flex flex-col overflow-hidden h-full">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <div className="flex items-center gap-2 text-slate-200 font-semibold">
                    {icon}
                    <span>{title}</span>
                </div>
                <button className="text-xs text-slate-500 hover:text-emerald-400 flex items-center gap-1 transition-colors">
                    view all <ArrowRight size={12} />
                </button>
            </div>

            <div className="flex-1 overflow-auto p-2">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-xs text-slate-500 border-b border-slate-800/50">
                            <th className="text-left pb-2 pl-2 font-medium">Item</th>
                            <th className="text-right pb-2 font-medium">Price</th>
                            <th className="text-right pb-2 pr-2 font-medium">
                                {type === 'gainers' ? 'Change' : type === 'losers' ? 'Change' : 'Profit'}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr
                                key={item.id}
                                onClick={() => navigate(`/item/${item.id}`)}
                                className="group hover:bg-slate-800/50 transition-colors cursor-pointer border-b border-slate-800/30 last:border-0"
                            >
                                <td className="py-2 pl-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                                            <img
                                                src={`https://static.runelite.net/cache/item/icon/${item.id}.png`}
                                                alt={item.name}
                                                className="w-full h-full object-contain p-0.5"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                    (e.target as HTMLImageElement).parentElement!.innerText = '??';
                                                    (e.target as HTMLImageElement).parentElement!.classList.add('text-[8px]', 'text-slate-500');
                                                }}
                                            />
                                        </div>
                                        <span className="text-slate-300 group-hover:text-emerald-300 font-medium truncate max-w-[120px]">
                                            {item.name}
                                        </span>
                                    </div>
                                </td>
                                <td className="text-right py-2 text-slate-400 font-mono">
                                    {formatGP(item.price)}
                                </td>
                                <td className={`text-right py-2 pr-2 font-mono font-bold ${item.isPositive === true ? 'text-emerald-400' :
                                    item.isPositive === false ? 'text-rose-400' : 'text-slate-300'
                                    }`}>
                                    {item.metricLabel}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

export default MarketCard;
