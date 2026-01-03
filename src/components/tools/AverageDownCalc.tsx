"use client";

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

  let neededQty = 0;
  let neededCost = 0;
  let impossible = false;

  if (cQty > 0 && cCost > 0 && cPrice > 0 && tAvg > 0) {
    if (cPrice >= tAvg) {
        impossible = true;
    } else {
        neededQty = (cQty * (tAvg - cCost)) / (cPrice - tAvg);
        neededQty = Math.ceil(neededQty);
        neededCost = neededQty * cPrice;
    }
  }

  return (
    <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/20 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <ArrowDown className="text-emerald-500" size={18} /> Average Down Calculator
            </h3>
        </div>
        <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="metric-label">Current Quantity</Label>
                    <Input type="number" value={currentQty} onChange={e => setCurrentQty(e.target.value)} className="bg-slate-950/50 border-slate-800 font-mono text-slate-100" placeholder="0" />
                </div>
                <div className="space-y-2">
                    <Label className="metric-label">Avg Cost / Item</Label>
                    <Input type="number" value={avgCost} onChange={e => setAvgCost(e.target.value)} className="bg-slate-950/50 border-slate-800 font-mono text-slate-100" placeholder="0" />
                </div>
                <div className="space-y-2">
                    <Label className="metric-label">Current Market Price</Label>
                    <Input type="number" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} className="bg-slate-950/50 border-slate-800 font-mono text-slate-100" placeholder="0" />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-emerald-400">Desired Avg Cost</Label>
                    <Input type="number" value={targetAvg} onChange={e => setTargetAvg(e.target.value)} className="bg-slate-950/50 border-emerald-500/20 focus:border-emerald-500/50 font-mono text-emerald-400" placeholder="0" />
                </div>
            </div>

            <div className="p-6 bg-slate-950/40 rounded-xl border border-slate-800/50 backdrop-blur-sm">
                {impossible ? (
                    <div className="text-center py-4">
                        <p className="text-rose-500 font-bold">Calculation Impossible</p>
                        <p className="text-xs text-slate-500 mt-1">Desired target cost must be higher than current market price.</p>
                    </div>
                ) : neededQty > 0 ? (
                    <div className="text-center space-y-4">
                        <div className="space-y-1">
                             <p className="text-slate-500 text-xs uppercase font-bold tracking-widest">Required Purchase</p>
                             <p className="text-4xl font-bold text-slate-100 font-mono tracking-tighter">{neededQty.toLocaleString()}</p>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <p className="text-sm text-slate-400">Total Capital Cost</p>
                            <p className="text-2xl font-mono font-bold text-emerald-400">{formatGP(neededCost)}</p>
                        </div>
                        <div className="pt-4 border-t border-slate-800/50">
                            <p className="text-[10px] text-slate-500 uppercase">New Portfolio Status</p>
                            <p className="text-xs text-slate-300 mt-1 font-mono">{(cQty + neededQty).toLocaleString()} items @ {formatGP(tAvg)} avg</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-slate-600 text-sm italic">Enter your current position and target to calculate entry requirements.</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default AverageDownCalc;