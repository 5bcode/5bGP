import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";
import { calculateTax, formatGP } from "@/lib/osrs-math";

interface TaxCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  initialSellPrice?: number;
}

const TaxCalculator = ({ isOpen, onClose, initialSellPrice }: TaxCalculatorProps) => {
  const [sellPrice, setSellPrice] = useState(initialSellPrice?.toString() || "");
  const [buyPrice, setBuyPrice] = useState("");
  
  const sell = parseInt(sellPrice) || 0;
  const buy = parseInt(buyPrice) || 0;
  
  const tax = calculateTax(sell);
  const net = sell - buy - tax;

  // Break Even Calculation for 2% Tax
  // If SellPrice <= 250m, Tax = 0.02 * SellPrice. BreakEven: Sell * 0.98 = Buy => Sell = Buy / 0.98
  // If SellPrice > 250m, Tax = 5m. BreakEven: Sell - 5m = Buy => Sell = Buy + 5m
  // The transition happens when Buy / 0.98 = 250m => Buy = 245m
  
  const accurateBreakEven = buy > 245_000_000 ? buy + 5_000_000 : Math.ceil(buy / 0.98);

  useEffect(() => {
    if (initialSellPrice) setSellPrice(initialSellPrice.toString());
  }, [initialSellPrice]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-200">
            <Calculator className="h-5 w-5 text-emerald-500" /> GE Tax Calculator
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Buy Price (Cost)</Label>
            <Input 
                type="number" 
                placeholder="0"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                className="bg-slate-950 border-slate-800 font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label>Sell Price (Revenue)</Label>
            <Input 
                type="number" 
                placeholder="0"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="bg-slate-950 border-slate-800 font-mono"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-3">
             <div className="flex justify-between items-center text-sm">
                 <span className="text-slate-400">Tax (2% capped)</span>
                 <span className="font-mono text-rose-400">-{formatGP(tax)}</span>
             </div>
             
             <div className="flex justify-between items-center text-sm">
                 <span className="text-slate-400">Break Even Sell</span>
                 <span className="font-mono text-slate-300">{formatGP(accurateBreakEven)}</span>
             </div>

             <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                 <span className="font-bold text-slate-200">Net Profit</span>
                 <span className={`font-mono font-bold text-lg ${net > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {net > 0 ? '+' : ''}{formatGP(net)}
                 </span>
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaxCalculator;