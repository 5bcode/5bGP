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
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Trade Portfolio</h1>
                    <p className="text-slate-500 mt-1">Track active positions and analyze your historical performance.</p>
                </div>
                <div className="flex gap-2">
                    <BulkImportDialog items={items} onImport={handleBulkImport} />
                    <Button variant="outline" size="sm" onClick={exportCSV} disabled={trades.length === 0} className="border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-300">
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleClearAll} disabled={trades.length === 0 && activePositions.length === 0} className="text-rose-500 hover:bg-rose-500/10">
                        <Trash2 className="mr-2 h-4 w-4" /> Clear All
                    </Button>
                </div>
            </div>

            <ActiveTradesWidget
                positions={activePositions}
                prices={prices}
                onClosePosition={closePosition}
                onDeletePosition={deletePosition}
                onUpdatePosition={updatePosition}
            />

            <Tabs defaultValue="flips" className="space-y-6">
                <TabsList className="bg-slate-900/50 border border-slate-800 p-1">
                    <TabsTrigger value="flips" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all">
                        <TrendingUp size={14} className="mr-2" /> Completed Flips
                    </TabsTrigger>
                    <TabsTrigger value="transactions" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                        <HistoryIcon size={14} className="mr-2" /> Transaction Log
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="flips" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {analyticsData.length > 0 ? (
                        <>
                            <div className="glass-card overflow-hidden">
                                <ProfitHeatmap trades={analyticsData} />
                            </div>
                            <Analytics trades={analyticsData} />

                            <div className="glass-card overflow-hidden">
                                <div className="p-4 border-b border-slate-800/60 bg-slate-950/20 backdrop-blur-sm flex justify-between items-center">
                                    <h2 className="text-lg font-bold text-slate-100">Completed Flips</h2>
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Matched via FIFO</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-950/20">
                                            <TableRow className="border-slate-800/40 hover:bg-transparent">
                                                <TableHead className="text-slate-500 text-xs uppercase font-bold py-4">Date Sold</TableHead>
                                                <TableHead className="text-slate-500 text-xs uppercase font-bold">Item</TableHead>
                                                <TableHead className="text-right text-slate-500 text-xs uppercase font-bold">Qty</TableHead>
                                                <TableHead className="text-right text-slate-500 text-xs uppercase font-bold">Avg Buy</TableHead>
                                                <TableHead className="text-right text-slate-500 text-xs uppercase font-bold">Avg Sell</TableHead>
                                                <TableHead className="text-right text-slate-500 text-xs uppercase font-bold">Realized Profit</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="divide-y divide-slate-800/30">
                                            {matchedFlips.map((flip) => (
                                                <TableRow key={flip.id} className="border-none hover:bg-slate-800/40 transition-colors">
                                                    <TableCell className="text-slate-400 font-mono text-xs">
                                                        {new Date(flip.timestamp).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="font-bold text-slate-200">
                                                        {flip.itemName}
                                                    </TableCell>
                                                    <TableCell className="text-right text-slate-300 font-mono text-sm">
                                                        {flip.quantity.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-right text-slate-400 font-mono text-xs">
                                                        {formatGP(flip.buyPrice)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-slate-400 font-mono text-xs">
                                                        {formatGP(flip.sellPrice)}
                                                    </TableCell>
                                                    <TableCell className={`text-right font-bold font-mono text-sm ${flip.profit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
                        <div className="py-24 text-center glass-card bg-slate-900/20 flex flex-col items-center border-dashed">
                            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-600 mb-4 border border-slate-700/50">
                                <TrendingUp size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-300 mb-2">No completed flips found</h3>
                            <p className="text-slate-500 max-w-sm">
                                Once you close an active position or log a completed trade, the analytics engine will show your performance metrics here.
                            </p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="transactions" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="glass-card overflow-hidden">
                        <div className="p-4 border-b border-slate-800/60 bg-slate-950/20 backdrop-blur-sm">
                            <h2 className="text-lg font-bold text-slate-100">Transaction Log</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-950/20">
                                    <TableRow className="border-slate-800/40 hover:bg-transparent">
                                        <TableHead
                                            className="text-slate-500 text-xs uppercase font-bold py-4 cursor-pointer hover:text-slate-300 transition-colors select-none"
                                            onClick={() => handleSort('timestamp')}
                                        >
                                            <div className="flex items-center gap-1">Date <SortIcon column="timestamp" /></div>
                                        </TableHead>
                                        <TableHead
                                            className="text-slate-500 text-xs uppercase font-bold cursor-pointer hover:text-slate-300 transition-colors select-none"
                                            onClick={() => handleSort('item')}
                                        >
                                            <div className="flex items-center gap-1">Item <SortIcon column="item" /></div>
                                        </TableHead>
                                        <TableHead className="text-right text-slate-500 text-xs uppercase font-bold cursor-pointer" onClick={() => handleSort('quantity')}>
                                            <div className="flex items-center justify-end gap-1">Qty <SortIcon column="quantity" /></div>
                                        </TableHead>
                                        <TableHead className="text-right text-slate-500 text-xs uppercase font-bold cursor-pointer" onClick={() => handleSort('buy')}>
                                            <div className="flex items-center justify-end gap-1">Buy <SortIcon column="buy" /></div>
                                        </TableHead>
                                        <TableHead className="text-right text-slate-500 text-xs uppercase font-bold cursor-pointer" onClick={() => handleSort('sell')}>
                                            <div className="flex items-center justify-end gap-1">Sell <SortIcon column="sell" /></div>
                                        </TableHead>
                                        <TableHead className="w-[80px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-800/30">
                                    {sortedTrades.map((trade) => (
                                        <TableRow key={trade.id} className="border-none hover:bg-slate-800/40 transition-colors group">
                                            <TableCell className="text-slate-400 font-mono text-xs">
                                                {new Date(trade.timestamp).toLocaleString(undefined, {
                                                    month: 'short', day: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </TableCell>
                                            <TableCell className="font-bold text-slate-200">
                                                {trade.itemName}
                                            </TableCell>
                                            <TableCell className="text-right text-slate-300 font-mono text-sm">
                                                {trade.quantity.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right text-emerald-400/80 font-mono text-xs">
                                                {trade.buyPrice > 0 ? formatGP(trade.buyPrice) : '—'}
                                            </TableCell>
                                            <TableCell className="text-right text-blue-400/80 font-mono text-xs">
                                                {trade.sellPrice > 0 ? formatGP(trade.sellPrice) : '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(trade.id)}>
                                                    <Trash2 size={14} />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {sortedTrades.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                                                No transactions recorded in the log.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default History;