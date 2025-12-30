import React from 'react';
import { Card } from '@/components/ui/card';
import { Item, PriceData } from '@/services/osrs-api';
import { formatGP } from '@/lib/osrs-math';
import { TrendingUp, TrendingDown, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DiscoverCardProps {
    item: Item;
    price: PriceData;
    change: number; // 24h change %
}

const DiscoverCard = ({ item, price, change }: DiscoverCardProps) => {
    const navigate = useNavigate();
    const isUp = change >= 0;

    return (
        <Card
            onClick={() => navigate(`/item/${item.id}`)}
            className="bg-slate-900 border-slate-800 p-4 hover:bg-slate-800 transition-all cursor-pointer group"
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 shrink-0 overflow-hidden">
                        <img
                            src={`https://secure.runescape.com/m=itemdb_oldschool/1/obj_sprite.gif?id=${item.id}`}
                            alt={item.name}
                            className="w-full h-full object-contain p-0.5"
                        />
                    </div>
                    <span className="text-sm font-bold text-slate-200 truncate group-hover:text-emerald-400 max-w-[140px]">
                        {item.name}
                    </span>
                </div>
                {isUp ? <TrendingUp size={16} className="text-emerald-500" /> : <TrendingDown size={16} className="text-rose-500" />}
            </div>

            <div className="mt-4">
                <p className="text-xl font-bold text-white font-mono">{formatGP(price.high)}</p>
                <div className="flex items-center justify-between mt-1">
                    <p className={`text-xs font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isUp ? '+' : ''}{change.toFixed(2)}%
                    </p>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight size={14} className="text-slate-400" />
                    </div>
                </div>
            </div>
        </Card>
    );
}

interface DiscoverRowProps {
    items: Item[]; // Pre-selected random/trending items
    prices: Record<string, PriceData>;
}

const DiscoverRow = ({ items, prices }: DiscoverRowProps) => {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                Discover <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">New</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {items.slice(0, 5).map(item => {
                    const p = prices[item.id];
                    if (!p) return null;
                    const change = (Math.random() * 10) - 4; // MOCK change for discover items if we don't calculate it fully
                    return <DiscoverCard key={item.id} item={item} price={p} change={change} />;
                })}
            </div>
        </div>
    )
}

export default DiscoverRow;
