import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import PriceChart from '@/components/PriceChart';
import { calculateMargin, calculateVolatility } from '@/lib/osrs-math';
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { useMarketData } from '@/hooks/use-osrs-query';
import { useTradeHistory } from '@/hooks/use-trade-history';
import { Trade } from '@/components/TradeLogDialog';

// Modular Components
import { ItemHeader } from '@/components/ItemHeader';
import { MetricCards } from '@/components/MetricCards';
import { DeepAnalysis } from '@/components/DeepAnalysis';
import { VolumeAnalysis } from '@/components/VolumeAnalysis';
import { HistoryTable } from '@/components/HistoryTable';
import { SmartAnalysis } from '@/components/SmartAnalysis';
import ItemNotes from '@/components/ItemNotes';
import PricePredictor from '@/components/PricePredictor';
import PersonalItemStats from '@/components/PersonalItemStats';

const ItemDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { items, prices, stats, isLoading } = useMarketData();
  const { trades, saveTrade, deleteTrade } = useTradeHistory();

  const itemData = useMemo(() => {
    if (!id || isLoading || items.length === 0) return null;
    const foundItem = items.find(i => i.id.toString() === id);
    if (!foundItem) return null;
    
    return {
        item: foundItem,
        price: prices[foundItem.id],
        stat: stats[foundItem.id]
    };
  }, [id, items, prices, stats, isLoading]);

  const itemHistory = useMemo(() => {
      if (!id) return [];
      return trades
        .filter(t => t.itemId.toString() === id)
        .sort((a, b) => b.timestamp - a.timestamp);
  }, [trades, id]);

  const handleLogTrade = (trade: Trade) => {
    saveTrade(trade);
    toast.success("Trade logged to history");
  };

  const handleDeleteTrade = (tradeId: string) => {
      if (confirm("Delete this trade record?")) {
          deleteTrade(tradeId);
          toast.success("Trade deleted");
      }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 w-1/3 bg-slate-800 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-800 rounded" />)}
        </div>
        <div className="h-[400px] bg-slate-800 rounded" />
      </div>
    );
  }

  if (!itemData || !itemData.price) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
        <h2 className="text-2xl font-bold mb-2">Item Not Found</h2>
        <Link to="/" className="text-emerald-500 hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  const { item, price, stat } = itemData;

  // --- CALCULATIONS ---
  const { net, roi, tax } = calculateMargin(price.low, price.high);
  const volatility = calculateVolatility(price.high, price.low);
  const volume = stat ? stat.highPriceVolume + stat.lowPriceVolume : 0;
  
  const spread = price.high - price.low;
  const avgSpread = stat ? (stat.avgHighPrice - stat.avgLowPrice) : 0;
  const spreadDifference = avgSpread > 0 ? ((spread - avgSpread) / avgSpread) * 100 : 0;
  
  const natureRunePrice = 100;
  const highAlchProfit = (item.highalch || 0) - price.low - natureRunePrice;
  const isAlchable = highAlchProfit > 0;
  const buyPressure = stat ? (stat.highPriceVolume / (volume || 1)) * 100 : 50;

  let recommendation = "Neutral";
  if (net > 0 && roi > 2 && volatility < 20) {
      recommendation = "Strong Buy";
  } else if (volatility > 80) {
      recommendation = "Extreme Volatility";
  } else if (item.highalch && price.low < item.highalch) {
      recommendation = "Safe Floor (Alch)";
  } else if (spreadDifference > 50) {
      recommendation = "Gap Widening";
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" className="flex items-center text-slate-400 hover:text-emerald-400 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
        <div className="flex gap-2">
            <a href={`https://prices.runescape.wiki/osrs/item/${item.id}`} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="bg-slate-900 border-slate-700 text-slate-300">
                    <ExternalLink className="mr-2 h-4 w-4" /> Wiki
                </Button>
            </a>
        </div>
      </div>

      <ItemHeader 
        item={item} 
        price={price} 
        recommendation={recommendation} 
        onLogTrade={handleLogTrade} 
      />

      <MetricCards 
        price={price} 
        net={net} 
        roi={roi} 
        tax={tax} 
        volatility={volatility} 
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                  <Activity className="text-emerald-500" size={20} /> Price Action
              </h3>
              <PriceChart itemId={item.id} />
           </div>
        </div>

        <VolumeAnalysis 
            item={item}
            price={price}
            stat={stat}
            volume={volume}
            buyPressure={buyPressure}
            net={net}
        />
      </div>
      
      <div className="space-y-6 mb-8">
        <SmartAnalysis 
          item={item}
          price={price}
          stats={stat}
          roi={roi}
          volatility={volatility}
        />

        <PricePredictor itemId={item.id} />
      </div>

      <DeepAnalysis 
        item={item} 
        price={price} 
        stats={stat} 
        net={net} 
        spreadDifference={spreadDifference} 
        isAlchable={isAlchable} 
        highAlchProfit={highAlchProfit} 
      />

      <div className="my-8 border-t border-slate-800 pt-8">
        <h2 className="text-xl font-bold text-slate-200 mb-6">Your Performance</h2>
        
        <PersonalItemStats trades={itemHistory} />
        
        <div className="mt-8">
            <ItemNotes itemId={item.id} />
        </div>

        <div className="mt-8">
            <HistoryTable history={itemHistory} onDelete={handleDeleteTrade} />
        </div>
      </div>
    </>
  );
};

export default ItemDetails;