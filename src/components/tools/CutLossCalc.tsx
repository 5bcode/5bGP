"use client";

import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatGP } from '@/lib/osrs-math';
import { Scissors, AlertCircle } from 'lucide-react';

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
  const recoveryNeeded = currentValue > 0 ? ((initialInv / currentValue) - 1) * 100 : 0;

  return (
    <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/20 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Scissors className="text-rose-500" size={18} /> Cut-Loss Scenario
            </h3>
        </div>
        <div className="p-6 space-y-6">
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label className="metric-label">Entry Price</Label>
                    <Input type="number" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} className="bg-slate-950/50 border-slate-800 font-mono" placeholder="0" />
                </div>
                <div className="space-y-2">
                    <Label className="metric-label">Quantity</Label>
                    <Input type="number" value={qty} onChange={e => setQty(e.target.value)} className="bg-slate-950/50 border-slate-800 font-mono" placeholder="0" />
                </div>
                 <div className="space-y-2">
                    <Label className="metric-label">Current Price</Label>
                    <Input type="number" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} className="bg-slate-950/50 border-slate-800 font-mono" placeholder="0" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-rose-950/20 border border-rose-500/20 rounded-xl backdrop-blur-sm">
                    <p className="text-[10px] text-rose-300 uppercase font-black tracking-widest mb-2">Unrealized Loss</p>
                    <div className="flex items-baseline justify-between">
                        <p className="text-3xl font-mono font-bold text-rose-500 tracking-tighter">-{formatGP(loss)}</p>
                        <p className="text-sm font-bold text-rose-400/80">{lossPercent.toFixed(2)}%</p>
                    </div>
                </div>
                 <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-xl">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">Recovery Requirement</p>
                    <div className="flex items-baseline justify-between">
                        <p className="text-3xl font-mono font-bold text-amber-500 tracking-tighter">{recoveryNeeded.toFixed(1)}%</p>
                        <AlertCircle size={16} className="text-amber-600/50" />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">Gain required on remaining capital to break even.</p>
                </div>
            </div>
            
            <div className="text-xs text-slate-600 text-center italic mt-4 bg-slate-950/20 py-2 rounded-lg border border-slate-800/30">
                "Preserving capital is more important than chasing potential returns."
            </div>
        </div>
    </div>
  );
};

export default CutLossCalc;