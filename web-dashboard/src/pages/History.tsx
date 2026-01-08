"use client";

import React, { useState, useMemo } from 'react';
import Analytics from '@/components/Analytics';
import ProfitHeatmap from '@/components/ProfitHeatmap';
import ActiveTradesWidget from '@/components/dashboard/ActiveTradesWidget';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, Trash2, ArrowUp, ArrowDown, ArrowUpDown, TrendingUp, History as HistoryIcon } from 'lucide-react';
import { formatGP } from '@/lib/osrs-math';
import { toast } from 'sonner';
import { useTradeHistory } from '@/hooks/use-trade-history';
import { useMarketData } from '@/hooks/use-osrs-query';
import BulkImportDialog from '@/components/BulkImportDialog';
import { matchTrades } from '@/lib/trade-matching';
import { Trade } from '@/components/TradeLogDialog';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';

const History = () => {
    const {
        trades,
        activePositions,
        deleteTrade,
        clearHistory,
        saveTrade,
        closePosition,
        deletePosition,
        updatePosition
    } = useTradeHistory();

    const { items, prices } = useMarketData();

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'timestamp',
        direction: 'desc'
    });

    const navigate = useNavigate();

    const matchedFlips = useMemo(() => matchTrades(trades), [trades]);

    const analyticsData: Trade[] = useMemo(() => {
        return matchedFlips.map(f => ({
            id: f.id,
            itemId: f.itemId,
            itemName: f.itemName,
            buyPrice: f.buyPrice,
            sellPrice: f.sellPrice,
            quantity: f.quantity,
            profit: f.profit,
            timestamp: f.timestamp
        }));
    }, [matchedFlips]);

    const sortedTrades = useMemo(() => {
        return [...trades].sort((a, b) => {
            let aValue: number | string = 0;
            let bValue: number | string = 0;

            switch (sortConfig.key) {
                case 'timestamp': aValue = a.timestamp; bValue = b.timestamp; break;
                case 'item': aValue = a.itemName; bValue = b.itemName; break;
                case 'quantity': aValue = a.quantity; bValue = b.quantity; break;
                case 'buy': aValue = a.buyPrice; bValue = b.buyPrice; break;
                case 'sell': aValue = a.sellPrice; bValue = b.sellPrice; break;
                case 'profit': aValue = a.profit; bValue = b.profit; break;
                default: return 0;
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [trades, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handleDelete = (id: string) => {
        if (confirm("Delete this trade record?")) {
            deleteTrade(id);
            toast.success("Trade deleted");
        }
    };

    const handleClearAll = () => {
        if (confirm("Delete ALL history? Cannot be undone.")) {
            clearHistory();
            toast.success("All history cleared");
        }
    };

    const handleBulkImport = (newTrades: Trade[]) => {
        newTrades.forEach(t => saveTrade(t));
        toast.success(`Imported ${newTrades.length} trades`);
    };

    const exportCSV = () => {
        if (trades.length === 0) return;
        const headers = ["Item ID", "Item Name", "Buy Price", "Sell Price", "Quantity", "Profit", "Timestamp"];
        const rows = trades.map(t => [
            t.itemId, t.itemName, t.buyPrice, t.sellPrice, t.quantity, t.profit, new Date(t.timestamp).toISOString()
        ]);
        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `flip_history_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig.key !== column) return <ArrowUpDown size={14} className="ml-1 opacity-20" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="ml-1 text-emerald-500" />
            : <ArrowDown size={14} className="ml-1 text-emerald-500" />;
    };

    return (
        <div className="space-y-12 animate-page-enter">
            <PageHeader
                title={
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                            <HistoryIcon size={32} className="text-indigo-500" />
                        </div>
                        <div className="flex flex-col">
                            <span>Trade Portfolio</span>
                            <span className="text-sm font-medium text-slate-500 normal-case">
                                Performance tracking and historical analysis
                            </span>
                        </div>
                    </div>
                }
                subtitle="Track active positions and analyze your historical performance."
                backLink="/"
                backLabel="Terminal"
                action={
                    <div className="flex flex-wrap items-center gap-3">
                        <BulkImportDialog items={items} onImport={handleBulkImport} />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={exportCSV}
                            disabled={trades.length === 0}
                            className="h-10 px-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all font-black uppercase tracking-widest text-[10px]"
                        >
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearAll}
                            disabled={trades.length === 0 && activePositions.length === 0}
                            className="h-10 px-4 rounded-xl text-rose-500 hover:bg-rose-500/10 font-black uppercase tracking-widest text-[10px]"
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Clear History
                        </Button>
                    </div>
                }
            />

            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-blue-500 rounded-full" />
                    <h2 className="text-2xl font-black tracking-tight uppercase">Active Exposure</h2>
                </div>
                <ActiveTradesWidget
                    positions={activePositions}
                    prices={prices}
                    onClosePosition={closePosition}
                    onDeletePosition={deletePosition}
                    onUpdatePosition={updatePosition}
                />
            </section>

            <Tabs defaultValue="flips" className="space-y-10 pt-12 border-t border-white/5">
                <TabsList className="bg-white/5 border border-white/5 p-1.5 rounded-2xl h-14">
                    <TabsTrigger value="flips" className="px-8 rounded-xl h-full data-[state=active]:bg-emerald-500 data-[state=active]:text-slate-950 font-black uppercase tracking-widest text-[10px] transition-all">
                        <TrendingUp size={16} className="mr-2" /> Analytics Engine
                    </TabsTrigger>
                    <TabsTrigger value="transactions" className="px-8 rounded-xl h-full data-[state=active]:bg-blue-500 data-[state=active]:text-slate-950 font-black uppercase tracking-widest text-[10px] transition-all">
                        <HistoryIcon size={16} className="mr-2" /> Transaction Log
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="flips" className="space-y-12 animate-page-enter">
                    {analyticsData.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 premium-card p-6 bg-white/[0.02]">
                                    <ProfitHeatmap trades={analyticsData} />
                                </div>
                                <div className="space-y-8">
                                    <Analytics trades={analyticsData} />
                                </div>
                            </div>

                            <div className="premium-card overflow-hidden bg-white/[0.02]">
                                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-950/40">
                                    <h2 className="text-lg font-black text-white uppercase tracking-wider">Completed Signals</h2>
                                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black">Matched via FIFO</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-950">
                                            <TableRow className="border-white/5 hover:bg-transparent">
                                                <TableHead className="text-slate-500 text-[10px] uppercase font-black tracking-widest py-6 px-6">Timestamp</TableHead>
                                                <TableHead className="text-slate-500 text-[10px] uppercase font-black tracking-widest">Asset</TableHead>
                                                <TableHead className="text-right text-slate-500 text-[10px] uppercase font-black tracking-widest px-6">Quantity</TableHead>
                                                <TableHead className="text-right text-slate-500 text-[10px] uppercase font-black tracking-widest px-6">Basis</TableHead>
                                                <TableHead className="text-right text-slate-500 text-[10px] uppercase font-black tracking-widest px-6">Exit</TableHead>
                                                <TableHead className="text-right text-slate-500 text-[10px] uppercase font-black tracking-widest px-8">Net P&L</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="divide-y divide-white/5">
                                            {matchedFlips.map((flip) => (
                                                <TableRow key={flip.id} className="border-none hover:bg-white/[0.03] transition-colors group">
                                                    <TableCell className="text-slate-500 font-mono text-[11px] px-6 py-4">
                                                        {new Date(flip.timestamp).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="font-black text-white px-6">
                                                        {flip.itemName}
                                                    </TableCell>
                                                    <TableCell className="text-right text-slate-300 font-mono text-xs px-6">
                                                        {flip.quantity.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-right text-slate-400 font-mono text-[11px] px-6">
                                                        {formatGP(flip.buyPrice)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-slate-400 font-mono text-[11px] px-6">
                                                        {formatGP(flip.sellPrice)}
                                                    </TableCell>
                                                    <TableCell className={cn(
                                                        "text-right font-black font-mono text-sm px-8",
                                                        flip.profit >= 0 ? 'text-emerald-400' : 'text-rose-500'
                                                    )}>
                                                        {flip.profit > 0 ? '+' : ''}{formatGP(flip.profit)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="py-32 text-center premium-card bg-white/[0.02] border-dashed border-white/10 flex flex-col items-center">
                            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-600 mb-8">
                                <TrendingUp size={40} className="opacity-10" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-4">No closed loops found</h3>
                            <p className="text-slate-500 max-w-sm font-medium">
                                Once you close an active signal position, the analytics engine will generate your performance profile here.
                            </p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="transactions" className="space-y-4 animate-page-enter">
                    <div className="premium-card overflow-hidden bg-white/[0.02]">
                        <div className="p-6 border-b border-white/5 bg-slate-950/40">
                            <h2 className="text-lg font-black text-white uppercase tracking-wider">Raw Input Journal</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-950">
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableHead
                                            className="text-slate-500 text-[10px] uppercase font-black tracking-widest py-6 px-6 cursor-pointer hover:text-white transition-colors select-none"
                                            onClick={() => handleSort('timestamp')}
                                        >
                                            <div className="flex items-center gap-2">Journal Date <SortIcon column="timestamp" /></div>
                                        </TableHead>
                                        <TableHead
                                            className="text-slate-500 text-[10px] uppercase font-black tracking-widest cursor-pointer hover:text-white transition-colors select-none"
                                            onClick={() => handleSort('item')}
                                        >
                                            <div className="flex items-center gap-2">Asset <SortIcon column="item" /></div>
                                        </TableHead>
                                        <TableHead className="text-right text-slate-500 text-[10px] uppercase font-black tracking-widest cursor-pointer px-6" onClick={() => handleSort('quantity')}>
                                            <div className="flex items-center justify-end gap-2">Qty <SortIcon column="quantity" /></div>
                                        </TableHead>
                                        <TableHead className="text-right text-slate-500 text-[10px] uppercase font-black tracking-widest cursor-pointer px-6" onClick={() => handleSort('buy')}>
                                            <div className="flex items-center justify-end gap-2">In Price <SortIcon column="buy" /></div>
                                        </TableHead>
                                        <TableHead className="text-right text-slate-500 text-[10px] uppercase font-black tracking-widest cursor-pointer px-6" onClick={() => handleSort('sell')}>
                                            <div className="flex items-center justify-end gap-2">Out Price <SortIcon column="sell" /></div>
                                        </TableHead>
                                        <TableHead className="w-[100px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-white/5">
                                    {sortedTrades.map((trade) => (
                                        <TableRow key={trade.id} className="border-none hover:bg-white/[0.03] transition-colors group">
                                            <TableCell className="text-slate-500 font-mono text-[11px] px-6 py-4">
                                                {new Date(trade.timestamp).toLocaleString(undefined, {
                                                    month: 'short', day: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </TableCell>
                                            <TableCell className="font-black text-white px-2">
                                                {trade.itemName}
                                            </TableCell>
                                            <TableCell className="text-right text-slate-300 font-mono text-xs px-6">
                                                {trade.quantity.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right text-emerald-500/80 font-mono text-[11px] px-6">
                                                {trade.buyPrice > 0 ? formatGP(trade.buyPrice) : '—'}
                                            </TableCell>
                                            <TableCell className="text-right text-blue-400/80 font-mono text-[11px] px-6">
                                                {trade.sellPrice > 0 ? formatGP(trade.sellPrice) : '—'}
                                            </TableCell>
                                            <TableCell className="text-right px-6">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(trade.id)}>
                                                    <Trash2 size={14} />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {sortedTrades.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-24 text-slate-600 font-black uppercase text-[10px] tracking-widest">
                                                No journal entries recorded
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
            <div className="h-20" />
        </div>
    );
};


export default History;