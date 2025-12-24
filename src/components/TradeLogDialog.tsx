import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Item, PriceData } from "@/services/osrs-api";
import { calculateTax, formatGP } from "@/lib/osrs-math";
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TradeLogDialogProps {
  item: Item;
  priceData?: PriceData;
  onSave: (trade: Trade) => void;
}

export interface Trade {
  id: string;
  itemId: number;
  itemName: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  timestamp: number;
  profit: number;
}

const TradeLogDialog = ({ item, priceData, onSave }: TradeLogDialogProps) => {
  const [open, setOpen] = useState(false);
  const [buyPrice, setBuyPrice] = useState(priceData?.low?.toString() || "");
  const [sellPrice, setSellPrice] = useState(priceData?.high?.toString() || "");
  const [quantity, setQuantity] = useState(item.limit?.toString() || "1");

  const handleSave = () => {
    const buy = parseInt(buyPrice);
    const sell = parseInt(sellPrice);
    const qty = parseInt(quantity);

    if (isNaN(buy) || isNaN(sell) || isNaN(qty)) {
        toast.error("Please enter valid numbers");
        return;
    }

    const totalRevenue = sell * qty;
    const totalCost = buy * qty;
    const tax = calculateTax(totalRevenue); // Tax is on total sale? No, tax is per item usually in calculations but OSRS tax is on the offer. 
    // Actually OSRS GE Tax: 1% capped at 5m per item slot.
    // If I sell 1000 items at once, the tax is calculated on the total value of that specific trade slot? No, it's per item sold.
    // "The tax is applied to the total value of the offer." -> Wait.
    // Spec says: "2% tax on total sell price, capped at 5,000,000 GP".
    // I will assume the tax is on the total revenue of the trade.
    
    // Recalculating based on spec:
    // "2% tax on total sell price"
    let totalTax = Math.floor(totalRevenue * 0.02); // Following spec 2%
    if (totalTax > 5000000) totalTax = 5000000;

    const profit = totalRevenue - totalCost - totalTax;

    const trade: Trade = {
        id: crypto.randomUUID(),
        itemId: item.id,
        itemName: item.name,
        buyPrice: buy,
        sellPrice: sell,
        quantity: qty,
        timestamp: Date.now(),
        profit: profit
    };

    onSave(trade);
    setOpen(false);
    toast.success(`Trade logged! Profit: ${formatGP(profit)}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full mt-4 border-slate-700 bg-slate-800/50 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/50">
          <PlusCircle className="mr-2 h-4 w-4" /> Log Trade
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle>Log Flip: {item.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Buy Price</Label>
              <Input 
                value={buyPrice} 
                onChange={(e) => setBuyPrice(e.target.value)} 
                className="bg-slate-950 border-slate-800"
              />
            </div>
            <div className="space-y-2">
              <Label>Sell Price</Label>
              <Input 
                value={sellPrice} 
                onChange={(e) => setSellPrice(e.target.value)} 
                className="bg-slate-950 border-slate-800"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input 
                value={quantity} 
                onChange={(e) => setQuantity(e.target.value)} 
                className="bg-slate-950 border-slate-800"
            />
          </div>
        </div>
        <DialogFooter>
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Save Trade
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TradeLogDialog;