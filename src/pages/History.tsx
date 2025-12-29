import React, { useState, useMemo } from 'react';
import Analytics from '@/components/Analytics';
import ProfitHeatmap from '@/components/ProfitHeatmap';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, Trash2, ArrowUp, ArrowDown, ArrowUpDown, TrendingUp, RefreshCw } from 'lucide-react';
import { formatGP } from '@/lib/osrs-math';
import { toast } from 'sonner';
import { useTradeHistory } from '@/hooks/use-trade-history';
import { useMarketData } from '@/hooks/use-osrs-query';
import BulkImportDialog from '@/components/BulkImportDialog';
import { matchTrades, MatchedFlip } from '@/lib/trade-matching';
import { Trade } from '@/components/TradeLogDialog';

const History = () => {
  const { trades, deleteTrade, clearHistory, saveTrade } = useTradeHistory();
  const { items } = useMarketData(); // For import matching
  
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ 
      key: 'timestamp', 
      direction: 'desc' 
  });

  // Calculate matched flips from raw trades
  const matchedFlips = useMemo(() => matchTrades(trades), [trades]);
  
  // Adapt MatchedFlip to Trade interface for Analytics component
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
        let aValue: any = 0;
        let bValue: any = 0;

        switch(sortConfig.key) {
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
  
  const handleBulkImport = (newTrades: any[]) => {
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
    link.download = `flip_history_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const SortIcon = ({ column }: { column: string }) => {
      if (sortConfig.key !== column) return <ArrowUpDown size={14} className="ml-1 opacity-20" />;
      return sortConfig.direction === 'asc' 
        ? <ArrowUp size={14} className="ml-1 text-emerald-500" /> 
        : <ArrowDown size={14} className="ml-1 text-emerald-500" />;
  };

  return (
    <>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
            <h1 className="text-3xl font-bold text-slate-100">Trade Portfolio</h1>
            <p className="text-slate-500">Track your performance and history.</p>
        </div>
        <div className="flex gap-2">
             <BulkImportDialog items={items} onImport={handleBulkImport} />
             <Button variant="outline" size="sm" onClick={exportCSV} disabled={trades.length === 0} className="border-slate-800 bg-slate-900 text-slate-300">
                <Download className="mr-2 h-4 w-4" /> Export CSV
             </Button>
             <Button variant="ghost" size="sm" onClick={handleClearAll} disabled={trades.length === 0} className="text-rose-500 hover:bg-rose-950/20">
                <Trash2 className="mr-2 h-4 w-4" /> Clear All
             </Button>
        </div>
      </div>

      <Tabs defaultValue="flips" className="space-y-8">
        <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="flips" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                Completed Flips
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Transaction Log
            </TabsTrigger>
        </TabsList>

        <TabsContent value="flips" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
             {/* Use Matched Data for Analytics */}
             {analyticsData.length > 0 ? (
                 <>
                    <ProfitHeatmap trades={analyticsData} />
                    <Analytics trades={analyticsData} />

                    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-slate-200">Completed Flips</h2>
                            <span className="text-xs text-slate-500">Auto-matched (FIFO)</span>
                        </div>
                        <Table>
                            <TableHeader className="bg-slate-950">
                                <TableRow className="border-slate-800 hover:bg-slate-950">
                                    <TableHead className="text-slate-400">Date Sold</TableHead>
                                    <TableHead className="text-slate-400">Item</TableHead>
                                    <TableHead className="text-right text-slate-400">Qty</TableHead>
                                    <TableHead className="text-right text-slate-400">Avg Buy</TableHead>
                                    <TableHead className="text-right text-slate-400">Avg Sell</TableHead>
                                    <TableHead className="text-right text-slate-400">Realized Profit</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {matchedFlips.map((flip) => (
                                    <TableRow key={flip.id} className="border-slate-800 hover:bg-slate-800/50">
                                        <TableCell className="text-slate-400 font-mono text-xs">
                                            {new Date(flip.timestamp).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-200">
                                            {flip.itemName}
                                        </TableCell>
                                        <TableCell className="text-right text-slate-300 font-mono">
                                            {flip.quantity.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right text-slate-400 font-mono text-xs">
                                            {formatGP(flip.buyPrice)}
                                        </TableCell>
                                        <TableCell className="text-right text-slate-400 font-mono text-xs">
                                            {formatGP(flip.sellPrice)}
                                        </TableCell>
                                        <TableCell className={`text-right font-bold font-mono ${flip.profit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {flip.profit > 0 ? '+' : ''}{formatGP(flip.profit)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                 </>
             ) : (
                <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/20 text-slate-500">
                    <TrendingUp className="mx-auto h-12 w-12 text-slate-700 mb-4" />
                    <h3 className="text-lg font-medium text-slate-300 mb-2">No completed flips yet</h3>
                    <p className="text-sm max-w-sm mx-auto">
                        Once you buy and sell the same item, they will automatically pair up here to calculate your profit.
                    </p>
                </div>
             )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-950/50">
                    <h2 className="text-lg font-semibold text-slate-200">Raw Transaction Log</h2>
                </div>
                <Table>
                    <TableHeader className="bg-slate-950">
                        <TableRow className="border-slate-800 hover:bg-slate-950">
                            <TableHead 
                                className="text-slate-400 cursor-pointer hover:text-slate-200 select-none w-[180px]"
                                onClick={() => handleSort('timestamp')}
                            >
                                <div className="flex items-center gap-1">Date <SortIcon column="timestamp"/></div>
                            </TableHead>
                            <TableHead 
                                className="text-slate-400 cursor-pointer hover:text-slate-200 select-none"
                                onClick={() => handleSort('item')}
                            >
                                <div className="flex items-center gap-1">Item <SortIcon column="item"/></div>
                            </TableHead>
                            <TableHead className="text-right text-slate-400 cursor-pointer" onClick={() => handleSort('quantity')}>
                                <div className="flex items-center justify-end gap-1">Qty <SortIcon column="quantity"/></div>
                            </TableHead>
                            <TableHead className="text-right text-slate-400 cursor-pointer" onClick={() => handleSort('buy')}>
                                <div className="flex items-center justify-end gap-1">Buy <SortIcon column="buy"/></div>
                            </TableHead>
                            <TableHead className="text-right text-slate-400 cursor-pointer" onClick={() => handleSort('sell')}>
                                <div className="flex items-center justify-end gap-1">Sell <SortIcon column="sell"/></div>
                            </TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedTrades.map((trade) => (
                            <TableRow key={trade.id} className="border-slate-800 hover:bg-slate-800/50">
                                <TableCell className="text-slate-400 font-mono text-xs">
                                    {new Date(trade.timestamp).toLocaleString(undefined, {
                                        year: 'numeric', month: 'numeric', day: 'numeric', 
                                        hour: '2-digit', minute: '2-digit'
                                    })}
                                </TableCell>
                                <TableCell className="font-medium text-slate-200">
                                    {trade.itemName}
                                </TableCell>
                                <TableCell className="text-right text-slate-300 font-mono">
                                    {trade.quantity.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right text-slate-400 font-mono text-xs">
                                    {trade.buyPrice > 0 ? formatGP(trade.buyPrice) : '-'}
                                </TableCell>
                                <TableCell className="text-right text-slate-400 font-mono text-xs">
                                    {trade.sellPrice > 0 ? formatGP(trade.sellPrice) : '-'}
                                </TableCell>
                                <TableCell>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-600 hover:text-rose-500" onClick={() => handleDelete(trade.id)}>
                                        <Trash2 size={12} />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {sortedTrades.length === 0 && (
                             <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                    No transactions recorded.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default History;