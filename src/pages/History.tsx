import React, { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import Analytics from '@/components/Analytics';
import { Trade } from '@/components/TradeLogDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Trash2, ArrowUp, ArrowDown, ArrowUpDown, TrendingUp } from 'lucide-react';
import { formatGP } from '@/lib/osrs-math';
import { toast } from 'sonner';

const History = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ 
      key: 'timestamp', 
      direction: 'desc' 
  });

  useEffect(() => {
    const saved = localStorage.getItem('tradeHistory');
    if (saved) {
      try {
        setTrades(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse trade history", e);
      }
    }
  }, []);

  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => {
        let aValue: any = 0;
        let bValue: any = 0;

        switch(sortConfig.key) {
            case 'timestamp': 
                aValue = a.timestamp; // Fix: already number
                bValue = b.timestamp; 
                break;
            case 'item': 
                aValue = a.itemName; 
                bValue = b.itemName; 
                break;
            case 'quantity': 
                aValue = a.quantity; 
                bValue = b.quantity; 
                break;
            case 'buy': 
                aValue = a.buyPrice; 
                bValue = b.buyPrice; 
                break;
            case 'sell': 
                aValue = a.sellPrice; 
                bValue = b.sellPrice; 
                break;
            case 'profit': 
                aValue = a.profit; 
                bValue = b.profit; 
                break;
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
    if (confirm("Are you sure you want to delete this trade?")) {
        const newTrades = trades.filter(t => t.id !== id);
        setTrades(newTrades);
        localStorage.setItem('tradeHistory', JSON.stringify(newTrades));
        toast.success("Trade deleted");
    }
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to delete ALL history? This cannot be undone.")) {
        setTrades([]);
        localStorage.removeItem('tradeHistory');
        toast.success("All history cleared");
    }
  };

  const exportCSV = () => {
    if (trades.length === 0) return;
    
    const headers = ["Item ID", "Item Name", "Buy Price", "Sell Price", "Quantity", "Profit", "Timestamp"];
    const rows = trades.map(t => [
        t.itemId,
        t.itemName,
        t.buyPrice,
        t.sellPrice,
        t.quantity,
        t.profit,
        new Date(t.timestamp).toISOString()
    ]);

    const csvContent = [
        headers.join(","),
        ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `flip_history_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const SortIcon = ({ column }: { column: string }) => {
      if (sortConfig.key !== column) return <ArrowUpDown size={14} className="ml-1 opacity-20" />;
      return sortConfig.direction === 'asc' 
        ? <ArrowUp size={14} className="ml-1 text-emerald-500" /> 
        : <ArrowDown size={14} className="ml-1 text-emerald-500" />;
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
            <h1 className="text-3xl font-bold text-slate-100">Trade Portfolio</h1>
            <p className="text-slate-500">Track your performance and history.</p>
        </div>
        <div className="flex gap-2">
             <Button variant="outline" size="sm" onClick={exportCSV} disabled={trades.length === 0} className="border-slate-800 bg-slate-900 text-slate-300">
                <Download className="mr-2 h-4 w-4" /> Export CSV
             </Button>
             <Button variant="ghost" size="sm" onClick={handleClearAll} disabled={trades.length === 0} className="text-rose-500 hover:bg-rose-950/20">
                <Trash2 className="mr-2 h-4 w-4" /> Clear All
             </Button>
        </div>
      </div>

      {trades.length > 0 ? (
        <div className="space-y-8">
            <Analytics trades={trades} />
            
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-950/50">
                    <h2 className="text-lg font-semibold text-slate-200">Detailed History</h2>
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
                            
                            <TableHead 
                                className="text-right text-slate-400 cursor-pointer hover:text-slate-200 select-none"
                                onClick={() => handleSort('quantity')}
                            >
                                <div className="flex items-center justify-end gap-1">Qty <SortIcon column="quantity"/></div>
                            </TableHead>
                            
                            <TableHead 
                                className="text-right text-slate-400 cursor-pointer hover:text-slate-200 select-none"
                                onClick={() => handleSort('buy')}
                            >
                                <div className="flex items-center justify-end gap-1">Buy <SortIcon column="buy"/></div>
                            </TableHead>
                            
                            <TableHead 
                                className="text-right text-slate-400 cursor-pointer hover:text-slate-200 select-none"
                                onClick={() => handleSort('sell')}
                            >
                                <div className="flex items-center justify-end gap-1">Sell <SortIcon column="sell"/></div>
                            </TableHead>
                            
                            <TableHead 
                                className="text-right text-slate-400 cursor-pointer hover:text-slate-200 select-none"
                                onClick={() => handleSort('profit')}
                            >
                                <div className="flex items-center justify-end gap-1">Profit <SortIcon column="profit"/></div>
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
                                    {formatGP(trade.buyPrice)}
                                </TableCell>
                                <TableCell className="text-right text-slate-400 font-mono text-xs">
                                    {formatGP(trade.sellPrice)}
                                </TableCell>
                                <TableCell className={`text-right font-bold font-mono ${trade.profit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {trade.profit > 0 ? '+' : ''}{formatGP(trade.profit)}
                                </TableCell>
                                <TableCell>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-600 hover:text-rose-500" onClick={() => handleDelete(trade.id)}>
                                        <Trash2 size={12} />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
      ) : (
        <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/20 text-slate-500">
            <TrendingUp className="mx-auto h-12 w-12 text-slate-700 mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">No trades recorded yet</h3>
            <p className="text-sm max-w-sm mx-auto">
                Start logging your flips from the Item Details page to build your portfolio history and visualize your profits!
            </p>
        </div>
      )}
    </Layout>
  );
};

export default History;