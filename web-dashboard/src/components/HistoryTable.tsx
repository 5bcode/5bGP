import React from 'react';
import { Trade } from '@/components/TradeLogDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { History, Trash2 } from 'lucide-react';
import { formatGP } from '@/lib/osrs-math';

interface HistoryTableProps {
  history: Trade[];
  onDelete: (id: string) => void;
}

export const HistoryTable = ({ history, onDelete }: HistoryTableProps) => {
  if (history.length === 0) return null;

  return (
    <div className="mb-12 animate-in slide-in-from-bottom-5 duration-500">
      <h3 className="text-xl font-bold text-slate-200 mb-4 flex items-center gap-2">
        <History className="text-slate-500" size={24} />
        Your History
      </h3>
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-950/50">
            <TableRow className="border-slate-800">
              <TableHead className="text-slate-400">Date</TableHead>
              <TableHead className="text-right text-slate-400">Qty</TableHead>
              <TableHead className="text-right text-slate-400">Buy</TableHead>
              <TableHead className="text-right text-slate-400">Sell</TableHead>
              <TableHead className="text-right text-slate-400">Profit</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((trade) => (
              <TableRow key={trade.id} className="border-slate-800 hover:bg-slate-800/50">
                <TableCell className="font-mono text-xs text-slate-400">
                  {new Date(trade.timestamp).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right font-mono text-slate-300">
                  {trade.quantity.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono text-slate-400 text-xs">
                  {formatGP(trade.buyPrice)}
                </TableCell>
                <TableCell className="text-right font-mono text-slate-400 text-xs">
                  {formatGP(trade.sellPrice)}
                </TableCell>
                <TableCell className={`text-right font-bold font-mono ${trade.profit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {trade.profit > 0 ? '+' : ''}{formatGP(trade.profit)}
                </TableCell>
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-slate-600 hover:text-rose-500"
                    onClick={() => onDelete(trade.id)}
                  >
                    <Trash2 size={12} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};