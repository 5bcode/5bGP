import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Clipboard, CheckCircle } from 'lucide-react';
import { Item } from '@/services/osrs-api';
import { Trade } from '@/components/TradeLogDialog';
import Fuse from 'fuse.js';
import { formatGP } from '@/lib/osrs-math';
import { toast } from 'sonner';

interface BulkImportDialogProps {
  items: Item[];
  onImport: (trades: Trade[]) => void;
}

const BulkImportDialog = ({ items, onImport }: BulkImportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<Partial<Trade>[]>([]);

  const handleParse = () => {
    // Prevent ReDoS by limiting input length
    if (text.length > 20000) {
      toast.error("Input text is too long. Please limit to 20,000 characters.");
      return;
    }

    const lines = text.split('\n');
    const results: Partial<Trade>[] = [];
    const fuse = new Fuse(items, { keys: ['name'], threshold: 0.3 });

    // Robust Regex for logs:
    // Matches: "Bought" or "Sold" (Group 1)
    // Matches: Quantity (Group 2)
    // Matches: Item Name (Group 3 - Lazy match until 'for')
    // Matches: Price (Group 4 - numbers with commas allowed)
    // Example: "Bought 500 Abyssal whip for 1,500,000 each"
    const logRegex = /(bought|sold)\s+([\d,]+)\s+(.+?)\s+for\s+([\d,]+)/i;

    lines.forEach(line => {
        if (!line.trim()) return;
        const cleanLine = line.trim();

        const match = cleanLine.match(logRegex);
        
        if (!match) return;

        const type = match[1].toLowerCase(); // bought | sold
        const qtyStr = match[2].replace(/,/g, '');
        const rawName = match[3].trim();
        const priceStr = match[4].replace(/,/g, '');

        const qty = parseInt(qtyStr);
        const price = parseInt(priceStr);

        if (isNaN(qty) || isNaN(price)) return;

        const isBuy = type === 'bought';
        const isSell = type === 'sold';
        
        if (rawName) {
            const search = fuse.search(rawName);
            if (search.length > 0) {
                const item = search[0].item;
                results.push({
                    itemId: item.id,
                    itemName: item.name,
                    quantity: qty,
                    buyPrice: isBuy ? price : 0, 
                    sellPrice: isSell ? price : 0,
                    timestamp: Date.now()
                });
            }
        }
    });

    setParsed(results);
    if (results.length === 0) {
        toast.info("No trades found. Ensure format is: 'Bought [Qty] [Name] for [Price]'");
    } else {
        toast.success(`Parsed ${results.length} trades`);
    }
  };

  const handleConfirm = () => {
    const validTrades: Trade[] = parsed.map(p => ({
        id: crypto.randomUUID(),
        itemId: p.itemId!,
        itemName: p.itemName!,
        buyPrice: p.buyPrice || 0,
        sellPrice: p.sellPrice || 0,
        quantity: p.quantity || 0,
        profit: (p.sellPrice || 0) - (p.buyPrice || 0) * (p.quantity || 1), // Rough calc
        timestamp: Date.now()
    }));

    onImport(validTrades);
    setOpen(false);
    setText("");
    setParsed([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-emerald-400">
                <Clipboard className="mr-2 h-4 w-4" /> Bulk Import
            </Button>
        </DialogTrigger>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-2xl">
            <DialogHeader>
                <DialogTitle>Import Trades</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="bg-slate-900 p-3 rounded text-xs text-slate-400 border border-slate-800">
                    <p className="font-bold mb-1">Supported Format:</p>
                    <p className="font-mono">Bought 1,000 Zulrah's scales for 150 each</p>
                    <p className="font-mono">Sold 1 Twisted bow for 1,400,000,000 each</p>
                </div>
                <Textarea 
                    placeholder="Paste trade logs here..."
                    value={text}
                    onChange={e => setText(e.target.value)}
                    className="min-h-[150px] bg-slate-900 border-slate-800 font-mono text-xs"
                    maxLength={20000}
                />
                <Button onClick={handleParse} className="w-full bg-slate-800 hover:bg-slate-700">Parse Text</Button>
                
                {parsed.length > 0 && (
                    <div className="border border-slate-800 rounded-lg overflow-hidden max-h-[200px] overflow-y-auto">
                        <Table>
                            <TableHeader className="bg-slate-900">
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead>Type</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {parsed.map((p, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{p.itemName}</TableCell>
                                        <TableCell className="text-right">{p.quantity}</TableCell>
                                        <TableCell className="text-right">{formatGP(Math.max(p.buyPrice!, p.sellPrice!))}</TableCell>
                                        <TableCell>
                                            {p.buyPrice! > 0 ? <span className="text-blue-400">Buy</span> : <span className="text-emerald-400">Sell</span>}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
            <Button onClick={handleConfirm} disabled={parsed.length === 0} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle className="mr-2 h-4 w-4" /> Import {parsed.length} Trades
            </Button>
        </DialogContent>
    </Dialog>
  );
};

export default BulkImportDialog;