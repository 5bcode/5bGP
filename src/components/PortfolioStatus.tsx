import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatGP } from '@/lib/osrs-math';
import { Wallet, PiggyBank, TrendingUp, Lock, Edit2, Check, Calendar, Cloud } from 'lucide-react';
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
}

const PortfolioStatus = ({ activeInvestment, profit, tradeCount, period, onPeriodChange }: PortfolioStatusProps) => {
  const { mode } = useTradeMode();
  const { user } = useAuth();
  
  const [totalCash, setTotalCash] = useState<number>(10000000); // Default 10M
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(false);

  // Load Bankroll
  useEffect(() => {
    if (mode === 'paper') {
        const saved = localStorage.getItem('totalBankroll');
        setTotalCash(saved ? parseInt(saved) : 10000000);
    } else {
        if (!user) return;
        const fetchProfile = async () => {
            setLoading(true);
            const { data } = await supabase
                .from('profiles')
                .select('bankroll')
                .eq('id', user.id)
                .single();
            
            if (data && data.bankroll) {
                setTotalCash(Number(data.bankroll));
            }
            setLoading(false);
        };
        fetchProfile();
    }
  }, [mode, user]);

  const handleSaveCash = async () => {
    const val = parseInt(editValue);
    if (isNaN(val) || val < 0) {
      toast.error("Invalid cash amount");
      return;
    }
    
    setTotalCash(val);
    setIsEditing(false);

    if (mode === 'paper') {
        localStorage.setItem('totalBankroll', val.toString());
        toast.success("Bankroll updated (Local)");
    } else {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ bankroll: val })
                .eq('id', user.id);
            
            if (error) throw error;
            toast.success("Bankroll synced to profile");
        } catch (err) {
            console.error("Error saving bankroll", err);
            toast.error("Failed to sync bankroll");
        }
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
      <Card className="bg-slate-900 border-slate-800 md:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Wallet size={14} className="text-blue-500" /> Total Capital
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input 
                type="number" 
                value={editValue} 
                onChange={(e) => setEditValue(e.target.value)}
                className="h-8 bg-slate-950 border-slate-700 font-mono"
                placeholder={totalCash.toString()}
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500 hover:bg-emerald-950" onClick={handleSaveCash}>
                <Check size={16} />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between group">
              <div className={`text-2xl font-bold font-mono text-slate-100 ${loading ? 'opacity-50' : ''}`}>
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
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
             <span>Start of day balance</span>
             {mode === 'live' && <Cloud size={10} className="text-slate-600" />}
          </div>
        </CardContent>
      </Card>

      {/* LIQUIDITY / UTILIZATION */}
      <Card className="bg-slate-900 border-slate-800 md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
             <PiggyBank size={14} className="text-amber-500" /> Liquidity Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
           <div className="flex justify-between items-end mb-2">
              <div>
                  <div className={`text-2xl font-bold font-mono ${liquidCash < 0 ? 'text-rose-500' : 'text-slate-100'}`}>
                      {formatGP(liquidCash)}
                  </div>
                  <div className="text-xs text-emerald-500 flex items-center gap-1">
                     Available to trade
                  </div>
              </div>
              <div className="text-right">
                  <div className="text-sm font-mono text-slate-400 flex items-center justify-end gap-1">
                    <Lock size={12} /> {formatGP(activeInvestment)}
                  </div>
                  <div className="text-xs text-slate-500">Locked in GE</div>
              </div>
           </div>
           <Progress 
             value={utilization} 
             className={`h-2 bg-slate-800 ${utilization > 90 ? "[&>div]:bg-rose-500" : "[&>div]:bg-blue-500"}`} 
           />
        </CardContent>
      </Card>

      {/* DYNAMIC P&L */}
      <Card className="bg-slate-900 border-slate-800 md:col-span-1">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
             <TrendingUp size={14} className={profit >= 0 ? "text-emerald-500" : "text-rose-500"} /> 
             <span>{periodLabels[period]} P&L</span>
          </CardTitle>
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
        </CardHeader>
        <CardContent>
           <div className={`text-2xl font-bold font-mono ${profit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
              {profit > 0 ? '+' : ''}{formatGP(profit)}
           </div>
           <div className="flex justify-between items-center mt-1">
              <span className={`text-xs font-bold ${roi > 0 ? 'text-emerald-500' : roi < 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                {roi.toFixed(2)}% ROI
              </span>
              <span className="text-xs text-slate-500">
                {tradeCount} trades
              </span>
           </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioStatus;