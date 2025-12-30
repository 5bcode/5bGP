import React from 'react';
import { Item, PriceData } from '@/services/osrs-api';
import { formatGP } from '@/lib/osrs-math';
import { TrendingUp, TrendingDown, Crown, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ItemHeaderProps {
    item: Item;
    price: PriceData;
    netProfit: number;
    volatility: number;
}

const ItemHeader = ({ item, price, netProfit, volatility }: ItemHeaderProps) => {
    const isProfitPositive = netProfit > 0;

    return (
        <Card className="p-6 bg-slate-900 border-slate-800 h-full flex flex-col justify-between">
            {/* Header Section */}
            <div className="flex justify-between items-start">
                <div className="flex gap-4">
                    <div className="w-16 h-16 bg-slate-800/50 rounded-xl flex items-center justify-center border border-slate-700">
                        <img src={`https://secure.runescape.com/m=itemdb_oldschool/1/obj_sprite.gif?id=${item.id}`} alt={item.name} className="w-10 h-10 object-contain" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                            {item.name}
                            {item.members && (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1 px-2 py-0.5 h-6">
                                    <Crown size={12} /> Members
                                </Badge>
                            )}
                        </h2>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-mono font-medium text-slate-200">{formatGP(price.low)}</span>
                            <span className={`flex items-center text-sm font-bold ${isProfitPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isProfitPositive ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
                                {formatGP(Math.abs(netProfit))}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-4 gap-4 mt-6 mb-6">
                <div className="space-y-1">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Buy Price</p>
                    <p className="text-lg font-mono text-slate-300">{formatGP(price.low)}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Sell Price</p>
                    <p className="text-lg font-mono text-slate-300">{formatGP(price.high)}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Net Profit</p>
                    <p className={`text-lg font-mono font-bold ${isProfitPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfitPositive ? '+' : ''}{formatGP(netProfit)}
                    </p>
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-1">
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Volatility</p>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <HelpCircle size={12} className="text-slate-600" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Risk Score (0-100) based on spread vs price.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <p className="text-lg font-mono text-slate-300">{volatility.toFixed(1)}</p>
                </div>
            </div>

            {/* Action Button */}
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold shadow-lg shadow-blue-500/20">
                Start Trade
            </Button>
        </Card>
    );
};

export default ItemHeader;
