import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatGP } from '@/lib/osrs-math';
import { Wallet, PiggyBank, TrendingUp, Lock, Edit2, Check, Calendar, Cloud, Coins } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { useTradeMode } from '@/context/TradeModeContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type Period = 'session' | 'day' | 'week' | 'month' | 'all';

interface PortfolioStatusProps {
  activeInvestment: number;
  profit: number;
  tradeCount: number;
  period: Period;
  onPeriodChange: (p: Period) => void;
  totalCash: number;
  onUpdateCash: (val: number) => void;
}

const PortfolioStatus = ({ activeInvestment, profit, tradeCount, period, onPeriodChange, totalCash, onUpdateCash }: PortfolioStatusProps) => {
  const { mode } = useTradeMode();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const handleSaveCash = async () => {
    const val = parseInt(editValue);
    if (!isNaN(val) && val >= 0) {
      onUpdateCash(val);
      setIsEditing(false);
    }
  };

  const liquidCash = totalCash - activeInvestment;
  const utilization = Math.min(100, (activeInvestment / totalCash) * 100);
  const roi = totalCash > 0 ? (profit / totalCash) * 100 : 0;

  const periodLabels: Record<Period, string> = {
    session: 'Session',
    day: 'Today',
    week: 'Week',
    month: 'Month',
    all: 'All Time'
  };

  return (
    <div className="premium-card p-1 bg-white/5 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/5">
        {/* TOTAL CAPITAL */}
        <div className="p-8 hover:bg-white/[0.02] transition-colors relative group">
          <div className="flex items-center justify-between mb-4">
            <span className="metric-label flex items-center gap-2">
              <Wallet size={12} className="text-blue-400" /> Capital
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => {
                setEditValue(totalCash.toString());
                setIsEditing(true);
              }}
            >
              <Edit2 size={10} />
            </Button>
          </div>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="h-10 bg-slate-950 border-white/10 font-mono text-white"
                autoFocus
              />
              <Button size="icon" className="bg-emerald-500 hover:bg-emerald-600 h-10 w-10 shrink-0" onClick={handleSaveCash}>
                <Check size={18} />
              </Button>
            </div>
          ) : (
            <div className="text-3xl font-black text-white tracking-tighter font-mono">
              {formatGP(totalCash)}
            </div>
          )}
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Base Bankroll</p>
        </div>

        {/* LIQUIDITY */}
        <div className="p-8 md:col-span-2 hover:bg-white/[0.02] transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="metric-label flex items-center gap-2">
              <PiggyBank size={12} className="text-amber-400" /> Liquidity Manager
            </span>
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span className="flex items-center gap-1"><Lock size={10} /> {formatGP(activeInvestment)} locked</span>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4 mb-4">
            <div className="text-4xl font-black text-white tracking-tighter font-mono">
              {formatGP(liquidCash)}
            </div>
            <div className="text-right">
              <span className={cn(
                "text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded",
                utilization > 90 ? "bg-rose-500/20 text-rose-400 animate-pulse" : "bg-emerald-500/10 text-emerald-400"
              )}>
                {utilization.toFixed(0)}% Utilized
              </span>
            </div>
          </div>

          <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-1000 ease-out",
                utilization > 90 ? "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]" : "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
              )}
              style={{ width: `${utilization}%` }}
            />
          </div>
        </div>

        {/* P&L */}
        <div className="p-8 hover:bg-white/[0.02] transition-colors relative group">
          <div className="flex items-center justify-between mb-4">
            <span className="metric-label flex items-center gap-2">
              <TrendingUp size={12} className={profit >= 0 ? "text-emerald-400" : "text-rose-400"} />
              {periodLabels[period]} Return
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Calendar size={12} className="text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-900 border-white/5">
                {(['session', 'day', 'week', 'month', 'all'] as Period[]).map((p) => (
                  <DropdownMenuItem key={p} onClick={() => onPeriodChange(p)} className="text-xs uppercase font-bold tracking-widest">
                    {periodLabels[p]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className={cn(
            "text-3xl font-black tracking-tighter font-mono",
            profit >= 0 ? "text-emerald-400" : "text-rose-400"
          )}>
            {profit > 0 ? '+' : ''}{formatGP(profit)}
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className={cn(
              "text-[10px] font-black tracking-widest uppercase",
              roi >= 0 ? "text-emerald-500/60" : "text-rose-500/60"
            )}>
              {roi.toFixed(2)}% ROI
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {tradeCount} Signals
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default PortfolioStatus;