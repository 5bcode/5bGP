import React, { useState } from 'react';
import { Item, PriceData } from '@/services/osrs-api';
import { MarketOpportunity } from '@/hooks/use-market-analysis';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatGP } from '@/lib/osrs-math';
import { ShoppingCart, Check, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface CapitalAllocatorProps {
  opportunities: MarketOpportunity[];
  onTrackBatch: (items: Item[]) => void;
}

const CapitalAllocator = ({ opportunities, onTrackBatch }: CapitalAllocatorProps) => {
  const [budget, setBudget] = useState("10000000"); // 10m default
  const [basket, setBasket] = useState<Array<{ item: Item, qty: number, cost: number, expectedProfit: number }>>([]);

  const generateBasket = () => {
    const cash = parseInt(budget);
    if (isNaN(cash) || cash < 100000) {
        toast.error("Invalid budget (min 100k)");
        return;
    }

    let remainingCash = cash;
    const newBasket = [];
    
    // Sort ops by score to pick best first
    const sortedOps = [...opportunities].sort((a, b) => b.score - a.score);
    
    // Simple greedy allocation with diversification
    // Max 25% of budget per item to enforce diversification
    const maxPerItem = cash * 0.25;

    for (const op of sortedOps) {
        if (remainingCash < 10000) break; // Dust

        const price = op.price.low;
        const limit = op.item.limit || 10000;
        
        // Calculate max quantity we can buy with remaining cash, 
        // constrained by limit and our diversification rule
        const budgetCapQty = Math.floor(Math.min(remainingCash, maxPerItem) / price);
        const qty = Math.min(limit, budgetCapQty);

        if (qty > 0) {
            const cost = qty * price;
            const profitPer = op.metric; // metric is profit for flips
            
            newBasket.push({
                item: op.item,
                qty,
                cost,
                expectedProfit: profitPer * qty
            });

            remainingCash -= cost;
        }
    }

    setBasket(newBasket);
    if (newBasket.length === 0) toast.warning("Budget too low for available opportunities");
    else toast.success(`Generated basket with ${newBasket.length} items`);
  };

  const handleTrackAll = () => {
      onTrackBatch(basket.map(b => b.item));
      toast.success(`Added ${basket.length} items to watchlist`);
  };

  const totalCost = basket.reduce((acc, curr) => acc + curr.cost, 0);
  const totalProfit = basket.reduce((acc, curr) => acc + curr.expectedProfit, 0);

  return (
    <Card className="bg-slate-900 border-slate-800 h-full">
        <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <ShoppingCart size={16} className="text-emerald-500" /> Smart Capital Allocator
            </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500">GP</span>
                    <Input 
                        value={budget} 
                        onChange={(e) => setBudget(e.target.value)} 
                        className="pl-8 bg-slate-950 border-slate-800"
                        placeholder="Enter Budget"
                    />
                </div>
                <Button onClick={generateBasket} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Generate
                </Button>
            </div>

            {basket.length > 0 ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between text-xs text-slate-400 bg-slate-950 p-2 rounded">
                        <span>Est. Cost: <span className="text-slate-200">{formatGP(totalCost)}</span></span>
                        <span>Est. Profit: <span className="text-emerald-400">+{formatGP(totalProfit)}</span></span>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {basket.map((b, i) => (
                            <div key={i} className="flex justify-between items-center text-xs p-2 hover:bg-slate-800 rounded border border-transparent hover:border-slate-700">
                                <div>
                                    <div className="font-bold text-slate-200">{b.item.name}</div>
                                    <div className="text-slate-500">Qty: {b.qty.toLocaleString()}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono text-slate-300">{formatGP(b.cost)}</div>
                                    <div className="text-emerald-500 text-[10px]">+{formatGP(b.expectedProfit)}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button onClick={handleTrackAll} variant="outline" className="w-full border-dashed border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10">
                        <Plus className="mr-2 h-4 w-4" /> Track All Items
                    </Button>
                </div>
            ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                    Enter your available cash stack to generate an optimized shopping list.
                </div>
            )}
        </CardContent>
    </Card>
  );
};

export default CapitalAllocator;