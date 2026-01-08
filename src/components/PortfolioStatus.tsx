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
  const { user } = useAuth();

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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {/* TOTAL CAPITAL */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/20 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-2 metric-label">
            <Wallet size={14} className="text-blue-500" /> Total Capital
          </div>
          {mode === 'live' && <Cloud size={10} className="text-slate-600" />}
        </div>
        <div className="p-4">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="h-8 bg-slate-950 border-slate-700 font-mono text-slate-100"
                placeholder={totalCash.toString()}
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500 hover:bg-emerald-950" onClick={handleSaveCash}>
                <Check size={16} />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between group">
              <div className="text-2xl font-bold font-mono text-slate-100">
                {formatGP(totalCash)}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
                onClick={() => {
                  setEditValue(totalCash.toString());
                  setIsEditing(true);
                }}
              >
                <Edit2 size={12} />
              </Button>
            </div>
          )}
          <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">
            Starting bankroll balance
          </div>
        </div>
      </div>

      {/* LIQUIDITY / UTILIZATION */}
      <div className="glass-card md:col-span-2 overflow-hidden">
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/20 backdrop-blur-sm">
          <div className="flex items-center gap-2 metric-label">
            <PiggyBank size={14} className="text-amber-500" /> Liquidity Manager
          </div>
        </div>
        <div className="p-4">
          <div className="flex justify-between items-end mb-3">
            <div>
              <div className={`text-2xl font-bold font-mono ${liquidCash < 0 ? 'text-rose-500 shadow-rose-900/20' : 'text-slate-100'}`}>
                {formatGP(liquidCash)}
              </div>
              <div className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-widest">
                Available Liquid
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono text-slate-400 flex items-center justify-end gap-1">
                <Lock size={12} className="opacity-50" /> {formatGP(activeInvestment)}
              </div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">In GE Offers</div>
            </div>
          </div>
          <div className="relative">
            <Progress
              value={utilization}
              className={`h-1.5 bg-slate-800/50 ${utilization > 90 ? "[&>div]:bg-rose-500" : "[&>div]:bg-blue-500"}`}
            />
            {utilization > 90 && (
              <div className="absolute -top-6 right-0 text-[9px] text-rose-400 font-bold animate-pulse">OVERLEVERAGED</div>
            )}
          </div>
        </div>
      </div>

      {/* DYNAMIC P&L */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/20 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-2 metric-label">
            <TrendingUp size={14} className={profit >= 0 ? "text-emerald-500" : "text-rose-500"} />
            <span>{periodLabels[period]} P&L</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-slate-200">
                <Calendar size={12} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-950 border-slate-800 text-slate-200">
              <DropdownMenuItem onClick={() => onPeriodChange('session')}>Session</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPeriodChange('day')}>Today</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPeriodChange('week')}>This Week</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPeriodChange('month')}>This Month</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPeriodChange('all')}>All Time</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="p-4">
          <div className={`text-2xl font-bold font-mono ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {profit > 0 ? '+' : ''}{formatGP(profit)}
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className={`text-[10px] font-black tracking-tighter ${roi > 0 ? 'text-emerald-500/70' : roi < 0 ? 'text-rose-500/70' : 'text-slate-600'}`}>
              {roi.toFixed(2)}% ROI
            </span>
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
              {tradeCount} TRADES
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioStatus;