import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ActivePosition } from '@/hooks/use-trade-history';
import { PriceData } from '@/services/osrs-api';
import { formatGP, calculateTax } from '@/lib/osrs-math';
import { PlayCircle, Trash2, CheckCircle2, Calculator, MoreHorizontal, Target } from 'lucide-react';

interface ActiveTradesWidgetProps {
    positions: ActivePosition[];
    prices: Record<string, PriceData>;
    onClosePosition: (id: string, sellPrice: number) => void;
    onDeletePosition: (id: string) => void;
    onUpdatePosition: (id: string, updates: Partial<ActivePosition>) => void;
}

const ActiveTradesWidget = ({ positions, prices, onClosePosition, onDeletePosition, onUpdatePosition }: ActiveTradesWidgetProps) => {
    // State for the "Close Position" popover
    const [closingId, setClosingId] = useState<string | null>(null);
    const [closePrice, setClosePrice] = useState<string>('');

    const handleInitiateClose = (position: ActivePosition, currentPrice: number) => {
        setClosingId(position.id);
        setClosePrice(currentPrice.toString());
    };

    const confirmClose = (id: string) => {
        const price = parseInt(closePrice);
        if (price > 0) {
            onClosePosition(id, price);
            setClosingId(null);
        }
    };

    if (positions.length === 0) {
        return (
            <Card className="p-8 border-dashed border-2 border-slate-800 bg-slate-900/30 flex flex-col items-center justify-center text-center space-y-3 mb-8">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                    <PlayCircle size={24} />
                </div>
                <h3 className="text-lg font-medium text-slate-300">No Active Positions</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                    Log new trades as "Active Active" to track your unrealized profits here in real-time.
                </p>
            </Card>
        );
    }

    // Calculate Portfolio Summary
    const summary = positions.reduce((acc, pos) => {
        const currentPrice = prices[pos.itemId]?.high || pos.buyPrice;
        const marketValue = currentPrice * pos.quantity;
        const costBasis = pos.buyPrice * pos.quantity;
        const tax = calculateTax(currentPrice) * pos.quantity; // Est tax if sold now
        const profit = marketValue - costBasis - tax;

        return {
            invested: acc.invested + costBasis,
            currentValue: acc.currentValue + marketValue,
            unrealizedProfit: acc.unrealizedProfit + profit
        };
    }, { invested: 0, currentValue: 0, unrealizedProfit: 0 });

    return (
        <div className="space-y-4 mb-8">
            {/* Portfolio Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-slate-900 border-slate-800">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Total Invested</p>
                    <p className="text-2xl font-mono font-bold text-slate-200">{formatGP(summary.invested)}</p>
                </Card>
                <Card className="p-4 bg-slate-900 border-slate-800">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Current Value</p>
                    <p className="text-2xl font-mono font-bold text-blue-400">{formatGP(summary.currentValue)}</p>
                </Card>
                <Card className="p-4 bg-slate-900 border-slate-800">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Unrealized Profit</p>
                    <p className={`text-2xl font-mono font-bold ${summary.unrealizedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {summary.unrealizedProfit > 0 ? '+' : ''}{formatGP(summary.unrealizedProfit)}
                    </p>
                </Card>
            </div>

            {/* Active Positions Table */}
            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                        <PlayCircle className="text-blue-500" size={18} /> Active Positions
                    </h2>
                    <span className="text-xs text-slate-500">{positions.length} Open</span>
                </div>
                <Table>
                    <TableHeader className="bg-slate-950">
                        <TableRow className="border-slate-800 hover:bg-slate-950">
                            <TableHead className="text-slate-400">Item</TableHead>
                            <TableHead className="text-right text-slate-400">Qty</TableHead>
                            <TableHead className="text-right text-slate-400">Avg Buy</TableHead>
                            <TableHead className="text-right text-slate-400">Current Price</TableHead>
                            <TableHead className="text-right text-slate-400">Target</TableHead>
                            <TableHead className="text-right text-slate-400">Return</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {positions.map((pos) => {
                            const currentData = prices[pos.itemId];
                            // Use High price for selling estimate (Optimistic/Realistic for active sell offer)
                            // Or use Low price for instant sell? Usually flippers sell at high.
                            const currentPrice = currentData?.high || pos.buyPrice;

                            const marketValue = currentPrice * pos.quantity;
                            const costBasis = pos.buyPrice * pos.quantity;
                            const tax = calculateTax(currentPrice) * pos.quantity;
                            const profit = marketValue - costBasis - tax;
                            const roi = (profit / costBasis) * 100;

                            const isProfitable = profit > 0;

                            return (
                                <TableRow key={pos.id} className="border-slate-800 hover:bg-slate-800/50">
                                    <TableCell className="font-medium text-slate-200">
                                        {pos.itemName}
                                        <div className="text-[10px] text-slate-500">{new Date(pos.timestamp).toLocaleDateString()}</div>
                                    </TableCell>
                                    <TableCell className="text-right text-slate-300 font-mono">
                                        {pos.quantity.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right text-slate-400 font-mono text-xs">
                                        {formatGP(pos.buyPrice)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs">
                                        <span className="text-slate-200">{formatGP(currentPrice)}</span>
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs">
                                        {pos.targetPrice ? (
                                            <span className="text-blue-300">{formatGP(pos.targetPrice)}</span>
                                        ) : (
                                            <span className="text-slate-600">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col items-end">
                                            <span className={`font-bold font-mono text-xs ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {isProfitable ? '+' : ''}{formatGP(profit)}
                                            </span>
                                            <span className={`text-[10px] ${isProfitable ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
                                                {roi.toFixed(2)}%
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-1">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-emerald-500 hover:text-white hover:bg-emerald-600"
                                                        onClick={() => handleInitiateClose(pos, currentPrice)}
                                                        title="Close Position (Sell)"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-60 bg-slate-900 border-slate-700 p-3">
                                                    <div className="space-y-3">
                                                        <h4 className="font-medium text-slate-200 text-sm">Close Position</h4>
                                                        <div className="space-y-1">
                                                            <label className="text-xs text-slate-400">Sell Price</label>
                                                            <Input
                                                                className="h-8 bg-slate-950 border-slate-800 font-mono text-xs"
                                                                value={closePrice}
                                                                onChange={(e) => setClosePrice(e.target.value)}
                                                                placeholder={currentPrice.toString()}
                                                            />
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                                                            onClick={() => confirmClose(pos.id)}
                                                        >
                                                            Confirm Sale
                                                        </Button>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 text-slate-600 hover:text-rose-500"
                                                onClick={() => onDeletePosition(pos.id)}
                                                title="Delete Record"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default ActiveTradesWidget;
