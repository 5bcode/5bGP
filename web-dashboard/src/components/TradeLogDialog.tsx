import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Item, PriceData } from '@/services/osrs-api';
import { Calculator, Save, AlertCircle, PlayCircle, CheckCircle2 } from 'lucide-react';
import { formatGP, calculateTax } from '@/lib/osrs-math';
import { toast } from 'sonner';
import { ActivePosition } from '@/hooks/use-trade-history';

export interface Trade {
  id: string;
  itemId: number;
  itemName: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  profit: number;
  timestamp: number;
}

export interface InitialTradeValues {
  buyPrice?: number;
  sellPrice?: number;
  quantity?: number;
}

interface TradeLogDialogProps {
  item: Item;
  priceData?: PriceData;
  initialValues?: InitialTradeValues;
  onSave: (trade: Trade) => void;
  onSavePosition?: (position: ActivePosition) => void;
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const TradeLogDialog = ({ item, priceData, initialValues, onSave, onSavePosition, trigger, isOpen, onOpenChange }: TradeLogDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [mode, setMode] = useState<'completed' | 'active'>('completed'); // Toggle mode

  // Controlled vs Uncontrolled logic
  const isControlled = isOpen !== undefined;
  const open = isControlled ? isOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;

  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState(''); // Used as Target Price in Active Mode
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');

  // Computed values
  const [projectedProfit, setProjectedProfit] = useState(0);
  const [taxPaid, setTaxPaid] = useState(0);

  // Initialize fields when dialog opens
  useEffect(() => {
    if (open) {
      if (initialValues) {
        if (initialValues.buyPrice) setBuyPrice(initialValues.buyPrice.toString());
        if (initialValues.sellPrice) setSellPrice(initialValues.sellPrice.toString());
        if (initialValues.quantity) setQuantity(initialValues.quantity.toString());
      } else if (priceData) {
        // Fallback to current market data if no specific values passed
        if (!buyPrice) setBuyPrice(priceData.low.toString());
        // Default sell price to High
        if (!sellPrice && mode === 'completed') setSellPrice(priceData.high.toString());
      }
    }
  }, [open, priceData, initialValues, mode]);

  useEffect(() => {
    const buy = parseInt(buyPrice) || 0;
    const sell = parseInt(sellPrice) || 0;
    const qty = parseInt(quantity) || 0;

    const totalRevenue = sell * qty;
    const totalCost = buy * qty;

    // Calculate tax per item, then multiply by qty to respect the 5m cap per item
    const taxPerItem = calculateTax(sell);
    const totalTax = taxPerItem * qty;

    setTaxPaid(totalTax);
    setProjectedProfit(totalRevenue - totalCost - totalTax);
  }, [buyPrice, sellPrice, quantity]);

  const handleSave = () => {
    const buy = parseInt(buyPrice);
    const qty = parseInt(quantity);

    if (!buy || !qty) {
      toast.error("Please fill in price and quantity");
      return;
    }

    if (mode === 'completed') {
      const sell = parseInt(sellPrice);
      if (!sell) {
        toast.error("Please fill in sell price for completed trades");
        return;
      }

      const trade: Trade = {
        id: crypto.randomUUID(),
        itemId: item.id,
        itemName: item.name,
        buyPrice: buy,
        sellPrice: sell,
        quantity: qty,
        profit: projectedProfit,
        timestamp: Date.now()
      };
      onSave(trade);
      toast.success("Trade recorded!");
    } else {
      // Active Position
      if (!onSavePosition) {
        toast.error("Active positions not supported in this context");
        return;
      }

      const position: ActivePosition = {
        id: crypto.randomUUID(),
        itemId: item.id,
        itemName: item.name,
        buyPrice: buy,
        quantity: qty,
        timestamp: Date.now(),
        targetPrice: parseInt(sellPrice) || undefined,
        notes: notes
      };
      onSavePosition(position);
    }

    if (setOpen) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        !isControlled && (
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-emerald-500 transition-colors">
              <Calculator className="mr-2 h-4 w-4 text-emerald-500" /> Log Trade
            </Button>
          </DialogTrigger>
        )
      )}
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="text-emerald-500" size={20} />
            {mode === 'active' ? 'Open Position:' : 'Log Trade:'} <span className="text-slate-400">{item.name}</span>
          </DialogTitle>
        </DialogHeader>

        {/* MODE TOGGLE */}
        {onSavePosition && (
          <div className="flex p-1 bg-slate-900 rounded-lg border border-slate-800 mb-2">
            <button
              onClick={() => setMode('completed')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded ${mode === 'completed' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <CheckCircle2 size={14} /> Completed Flip
            </button>
            <button
              onClick={() => setMode('active')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded ${mode === 'active' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <PlayCircle size={14} /> Active Position
            </button>
          </div>
        )}

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buy" className="text-xs text-slate-400">Buy Price</Label>
              <div className="relative">
                <Input
                  id="buy"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  className="bg-slate-900 border-slate-800 focus:border-blue-500 text-right pr-8 font-mono"
                  placeholder="0"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-600">gp</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sell" className="text-xs text-slate-400">
                {mode === 'active' ? 'Target Price (Optional)' : 'Sell Price'}
              </Label>
              <div className="relative">
                <Input
                  id="sell"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  className={`bg-slate-900 border-slate-800 text-right pr-8 font-mono ${mode === 'active' ? 'focus:border-blue-500' : 'focus:border-emerald-500'}`}
                  placeholder={mode === 'active' ? 'Optional' : '0'}
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-600">gp</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qty" className="text-xs text-slate-400">Quantity</Label>
            <Input
              id="qty"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="bg-slate-900 border-slate-800 text-right font-mono"
              placeholder="1"
            />
          </div>

          {/* Real-time Calc (Only relevant if prices entered) */}
          {(mode === 'completed' || (mode === 'active' && sellPrice)) && (
            <div className="mt-2 p-3 bg-slate-900/50 rounded-lg border border-slate-800 space-y-2">
              {mode === 'active' && <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Projected Outcome</p>}
              <div className="flex justify-between text-xs text-slate-500">
                <span>Est. Tax</span>
                <span>-{formatGP(taxPaid)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="text-sm font-medium text-slate-300">
                  {mode === 'active' ? 'Potential Profit' : 'Net Profit'}
                </span>
                <span className={`text-lg font-bold font-mono ${projectedProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {projectedProfit > 0 ? '+' : ''}{formatGP(projectedProfit)}
                </span>
              </div>
            </div>
          )}

          {item.limit && parseInt(quantity) > item.limit && (
            <div className="flex items-center gap-2 text-[10px] text-amber-500 pt-1">
              <AlertCircle size={10} />
              <span>Quantity exceeds GE limit ({item.limit})</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSave} className={`w-full text-white ${mode === 'active' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
            <Save className="mr-2 h-4 w-4" /> {mode === 'active' ? 'Open Position' : 'Save Record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TradeLogDialog;