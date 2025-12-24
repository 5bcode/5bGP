import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import Analytics from '@/components/Analytics';
import { Trade } from '@/components/TradeLogDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Upload } from 'lucide-react';
import { formatGP } from '@/lib/osrs-math';
import { toast } from 'sonner';

const History = () => {
  const [trades, setTrades] = useState<Trade[]>([]);

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

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-100">Trade History</h1>
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
        <>
            <Analytics trades={trades} />
            
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden mt-8">
                <Table>
                    <TableHeader className="bg-slate-950">
                        <TableRow className="border-slate-800 hover:bg-slate-950">
                            <TableHead className="text-slate-400">Date</TableHead>
                            <TableHead className="text-slate-400">Item</TableHead>
                            <TableHead className="text-right text-slate-400">Qty</TableHead>
                            <TableHead className="text-right text-slate-400">Buy</TableHead>
                            <TableHead className="text-right text-slate-400">Sell</TableHead>
                            <TableHead className="text-right text-slate-400">Profit</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {trades.map((trade) => (
                            <TableRow key={trade.id} className="border-slate-800 hover:bg-slate-800/50">
                                <TableCell className="text-slate-400 font-mono text-xs">
                                    {new Date(trade.timestamp).toLocaleString()}
                                </TableCell>
                                <TableCell className="font-medium text-slate-200">
                                    {trade.itemName}
                                </TableCell>
                                <TableCell className="text-right text-slate-300 font-mono">
                                    {trade.quantity}
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
        </>
      ) : (
        <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/20 text-slate-500">
            <p className="text-lg mb-2">No trades recorded yet.</p>
            <p className="text-sm">Log your flips from the Dashboard or Item Details page to see analytics here.</p>
        </div>
      )}
    </Layout>
  );
};

export default History;