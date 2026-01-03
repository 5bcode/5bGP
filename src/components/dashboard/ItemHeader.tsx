import React, { useState } from 'react';
import { Item, PriceData } from '@/services/osrs-api';
import { formatGP } from '@/lib/osrs-math';
import { TrendingUp, TrendingDown, Crown, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import TradeLogDialog from '@/components/TradeLogDialog';
import { useTradeHistory } from '@/hooks/use-trade-history';

interface ItemHeaderProps {
    item: Item;
    price: PriceData;
    netProfit: number;
    volatility: number;
}

const ItemHeader = ({ item, price, netProfit, volatility }: ItemHeaderProps) => {
    const isProfitPositive = netProfit > 0;
    const { saveTrade, openPosition } = useTradeHistory();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    return (
        <div className="glass-card p-6 h-full flex flex-col justify-between relative overflow-hidden group">
            {/* Background Glow Effect */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

            {/* Header Section */}
            <div className="flex justify-between items-start relative z-10">
                <div className="flex gap-5">
                    <div className="w-16 h-16 bg-slate-900/80 rounded-xl flex items-center justify-center border border-slate-800 shadow-xl overflow-hidden shrink-0">
                        <img src={`https://static.runelite.net/cache/item/icon/${item.id}.png`} alt={item.name} className="w-10 h-10 object-contain" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-2xl font-bold text-slate-100 tracking-tight leading-none">
                                {item.name}
                            </h2>
                            {item.members && (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1 px-1.5 py-0 h-5 text-[10px] font-bold">
                                    <Crown size={8} strokeWidth={3} /> MEMBER
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-mono font-bold text-white tracking-tighter">{formatGP(price.low)}</span>
                            <span className={`flex items-center text-xs font-bold px-1.5 py-0.5 rounded-full ${isProfitPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                }`}>
                                {isProfitPositive ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                                {formatGP(Math.abs(netProfit))}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 my-6 relative z-10">
                <div className="space-y-1 p-2 rounded-lg hover:bg-slate-800/30 transition-colors border border-transparent hover:border-slate-800/50">
                    <p className="metric-label">Buy Price</p>
                    <p className="data-text text-base font-medium text-white">{formatGP(price.low)}</p>
                </div>
                <div className="space-y-1 p-2 rounded-lg hover:bg-slate-800/30 transition-colors border border-transparent hover:border-slate-800/50">
                    <p className="metric-label">Sell Price</p>
                    <p className="data-text text-base font-medium text-white">{formatGP(price.high)}</p>
                </div>
                <div className="space-y-1 p-2 rounded-lg hover:bg-slate-800/30 transition-colors border border-transparent hover:border-slate-800/50">
                    <p className="metric-label">Net Profit</p>
                    <p className={`data-text text-base font-bold ${isProfitPositive ? 'text-emerald-400 drop-shadow-sm' : 'text-rose-400'}`}>
                        {isProfitPositive ? '+' : ''}{formatGP(netProfit)}
                    </p>
                </div>
                <div className="space-y-1 p-2 rounded-lg hover:bg-slate-800/30 transition-colors border border-transparent hover:border-slate-800/50">
                    <div className="flex items-center gap-1.5">
                        <p className="metric-label">Volatility</p>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <HelpCircle size={12} className="text-slate-600 hover:text-slate-400 transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent className="bg-slate-900 border-slate-800 text-slate-300">
                                    <p>Risk Score (0-100) based on spread vs price.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <p className="data-text text-base font-medium text-slate-300">{volatility.toFixed(1)}</p>
                </div>
            </div>

            {/* Action Button */}
            <TradeLogDialog
                item={item}
                priceData={price}
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={saveTrade}
                onSavePosition={openPosition}
                trigger={
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-14 text-lg font-bold shadow-lg shadow-emerald-500/20 tracking-wide uppercase transition-all hover:scale-[1.02] active:scale-[0.98] relative z-10">
                        Start Trade
                    </Button>
                }
            />
        </div>
    );
};

export default ItemHeader;
