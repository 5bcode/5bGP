import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatGP } from '@/lib/osrs-math';
import { ArrowDown } from 'lucide-react';

const AverageDownCalc = () => {
  const [currentQty, setCurrentQty] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [targetAvg, setTargetAvg] = useState('');

  const cQty = parseInt(currentQty) || 0;
  const cCost = parseInt(avgCost) || 0;
  const cPrice = parseInt(currentPrice) || 0;
  const tAvg = parseInt(targetAvg) || 0;

  // Formula:
  // (TotalCost + (NewQty * CurrentPrice)) / (TotalQty + NewQty) = TargetAvg
  // (cQty*cCost + X*cPrice) / (cQty + X) = tAvg
  // cQty*cCost + X*cPrice = tAvg*cQty + tAvg*X
  // X(cPrice - tAvg) = tAvg*cQty - cQty*cCost
  // X = (cQty * (tAvg - cCost)) / (cPrice - tAvg)

  let neededQty = 0;
  let neededCost = 0;
  let impossible = false;

  if (cQty > 0 && cCost > 0 && cPrice > 0 && tAvg > 0) {
    if (cPrice >= tAvg) {
        impossible = true; // Can't average down to X if current price is higher than X
    } else {
        neededQty = (cQty * (tAvg - cCost)) / (cPrice - tAvg);
        // Since we want to lower the average, tAvg < cCost. So (tAvg - cCost) is negative.
        // And cPrice < tAvg. So (cPrice - tAvg) is negative.
        // Result is positive.
        neededQty = Math.ceil(neededQty);
        neededCost = neededQty * cPrice;
    }
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-200">
                <ArrowDown className="text-emerald-500" /> Average Down Calculator
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Current Quantity</Label>
                    <Input type="number" value={currentQty} onChange={e => setCurrentQty(e.target.value)} className="bg-slate-950 border-slate-800" />
                </div>
                <div className="space-y-2">
                    <Label>Avg Cost / Item</Label>
                    <Input type="number" value={avgCost} onChange={e => setAvgCost(e.target.value)} className="bg-slate-950 border-slate-800" />
                </div>
                <div className="space-y-2">
                    <Label>Current Market Price</Label>
                    <Input type="number" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} className="bg-slate-950 border-slate-800" />
                </div>
                <div className="space-y-2">
                    <Label className="text-emerald-400">Desired Avg Cost</Label>
                    <Input type="number" value={targetAvg} onChange={e => setTargetAvg(e.target.value)} className="bg-slate-950 border-slate-800 border-emerald-500/30" />
                </div>
            </div>

            <div className="mt-4 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                {impossible ? (
                    <p className="text-rose-500 font-bold text-center">Impossible: Target is below current price</p>
                ) : neededQty > 0 ? (
                    <div className="text-center space-y-2">
                        <p className="text-slate-400 text-sm">You need to buy</p>
                        <p className="text-3xl font-bold text-slate-100 font-mono">{neededQty.toLocaleString()}</p>
                        <p className="text-slate-400 text-sm">Costing: <span className="text-emerald-400">{formatGP(neededCost)}</span></p>
                        <p className="text-xs text-slate-500 mt-2">New Total Position: {(cQty + neededQty).toLocaleString()} items</p>
                    </div>
                ) : (
                    <p className="text-slate-500 text-center text-sm">Enter values to calculate</p>
                )}
            </div>
        </CardContent>
    </Card>
  );
};

export default AverageDownCalc;