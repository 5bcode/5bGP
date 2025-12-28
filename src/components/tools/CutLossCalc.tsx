import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatGP } from '@/lib/osrs-math';
import { Scissors } from 'lucide-react';

const CutLossCalc = () => {
  const [entryPrice, setEntryPrice] = useState('');
  const [qty, setQty] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  
  const entry = parseInt(entryPrice) || 0;
  const quantity = parseInt(qty) || 0;
  const current = parseInt(currentPrice) || 0;

  const initialInv = entry * quantity;
  const currentValue = current * quantity;
  const loss = initialInv - currentValue;
  const lossPercent = initialInv > 0 ? (loss / initialInv) * 100 : 0;
  
  // Calculate recovery needed
  // If you lose 50%, you need 100% gain to break even.
  // Remaining Capital * (1 + x) = Initial Capital
  // x = (Initial / Remaining) - 1
  const recoveryNeeded = currentValue > 0 ? ((initialInv / currentValue) - 1) * 100 : 0;

  return (
    <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-200">
                <Scissors className="text-rose-500" /> Cut-Loss Scenario
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
             <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>Entry Price</Label>
                    <Input type="number" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} className="bg-slate-950 border-slate-800" />
                </div>
                <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input type="number" value={qty} onChange={e => setQty(e.target.value)} className="bg-slate-950 border-slate-800" />
                </div>
                 <div className="space-y-2">
                    <Label>Current Price</Label>
                    <Input type="number" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} className="bg-slate-950 border-slate-800" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="p-4 bg-rose-950/20 border border-rose-900/30 rounded-lg">
                    <p className="text-xs text-rose-300 uppercase font-bold mb-1">Unrealized Loss</p>
                    <p className="text-2xl font-mono font-bold text-rose-500">-{formatGP(loss)}</p>
                    <p className="text-sm text-rose-400/70">{lossPercent.toFixed(2)}% of capital</p>
                </div>
                 <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-1">Recovery Required</p>
                    <p className="text-2xl font-mono font-bold text-amber-500">{recoveryNeeded.toFixed(2)}%</p>
                    <p className="text-xs text-slate-500 mt-1">Gain needed on remaining funds to break even</p>
                </div>
            </div>
            
            <div className="text-xs text-slate-500 text-center italic">
                "It's better to lose a finger than a hand."
            </div>
        </CardContent>
    </Card>
  );
};

export default CutLossCalc;