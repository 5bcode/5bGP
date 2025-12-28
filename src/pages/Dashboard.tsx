import React, { useState, useCallback, useMemo } from 'react';
import ItemSearch from '@/components/ItemSearch';
import MarginCard from '@/components/MarginCard';
import SettingsDialog from '@/components/SettingsDialog';
import LiveFeed, { MarketAlert } from '@/components/LiveFeed';
import OpportunityBoard from '@/components/OpportunityBoard';
import MarketOverview from '@/components/MarketOverview';
import ActiveOffers from '@/components/ActiveOffers';
import PortfolioStatus from '@/components/PortfolioStatus';
import { Item } from '@/services/osrs-api';
import { usePriceMonitor } from '@/hooks/use-price-monitor';
import { useMarketAnalysis, DEFAULT_STRATEGY } from '@/hooks/use-market-analysis';
import { useMarketData } from '@/hooks/use-osrs-query';
import { useTradeHistory } from '@/hooks/use-trade-history';
import { useActiveOffers } from '@/hooks/use-active-offers';
import { useTradeMode } from '@/context/TradeModeContext';
import { useSettings } from '@/context/SettingsContext';
import { useWatchlist } from '@/hooks/use-watchlist';
import { Loader2, RefreshCw, Trash2, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trade } from '@/components/TradeLogDialog';
import CapitalAllocator from '@/components/CapitalAllocator';

const Dashboard = () => {
  const { isPaper } = useTradeMode();
  const { settings } = useSettings();

  // Data Hooks
  const { items, prices, stats, isLoading, refetch } = useMarketData(settings.refreshInterval * 1000);
  const { trades: tradeHistory, saveTrade } = useTradeHistory();
  const { offers: activeOffers, addOffer, updateOffer, removeOffer } = useActiveOffers();
  
  // New Watchlist Hook
  const { watchlist, addToWatchlist, removeFromWatchlist, clearWatchlist, loading: watchlistLoading } = useWatchlist(items);

  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  
  // Calculate Portfolio Stats
  const portfolioStats = useMemo(() => {
      const activeInvest = activeOffers.reduce((sum, offer) => sum + (offer.price * offer.quantity), 0);
      const startOfDay = new Date();
      startOfDay.setHours(0,0,0,0);
      const todaysTrades = tradeHistory.filter(t => t.timestamp >= startOfDay.getTime());
      const dailyProfit = todaysTrades.reduce((sum, t) => sum + t.profit, 0);

      return {
          activeInvest,
          dailyProfit,
          dailyCount: todaysTrades.length
      };
  }, [activeOffers, tradeHistory]);

  const handleAlert = useCallback((alert: MarketAlert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 50)); 
  }, []);

  // Monitor prices for items in watchlist
  usePriceMonitor(prices, stats, watchlist, settings.alertThreshold, settings.soundEnabled, settings.discordWebhookUrl, handleAlert);
  
  const { dumps, bestFlips } = useMarketAnalysis(items, prices, stats, DEFAULT_STRATEGY);

  const handleRefresh = async () => {
    await refetch();
    toast.success("Market data refreshed");
  };

  const handleAddItem = (item: Item) => {
    addToWatchlist(item);
  };

  const handleAddBatch = (batch: Item[]) => {
      // Add one by one for now (hook could be optimized for batch later)
      batch.forEach(item => addToWatchlist(item));
  };

  const handleRemoveItem = (id: number) => {
      removeFromWatchlist(id);
  }

  const handleClearAll = () => {
      if (confirm("Clear watchlist?")) {
          clearWatchlist();
      }
  }

  const handleLogTrade = (trade: Trade) => {
      saveTrade(trade);
      toast.success("Trade logged");
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center mb-8 relative">
        {isPaper && (
            <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-xs font-bold px-2 py-1 rounded shadow-lg shadow-amber-500/20 animate-pulse">
                SIMULATION MODE
            </div>
        )}
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
          {isPaper ? "Paper Trading Terminal" : "Market Terminal"}
        </h1>
        <ItemSearch items={items} onSelect={handleAddItem} isLoading={isLoading} />
      </div>
      
      {!isLoading && (
        <>
            <PortfolioStatus 
                activeInvestment={portfolioStats.activeInvest} 
                todaysProfit={portfolioStats.dailyProfit}
                todaysTradeCount={portfolioStats.dailyCount}
            />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                <div className="xl:col-span-2">
                    <ActiveOffers 
                        items={items} 
                        prices={prices} 
                        onLogTrade={handleLogTrade} 
                        offers={activeOffers}
                        onAdd={addOffer}
                        onUpdate={updateOffer}
                        onRemove={removeOffer}
                    />
                </div>
                <div>
                     <CapitalAllocator opportunities={bestFlips} onTrackBatch={handleAddBatch} />
                </div>
            </div>

            <MarketOverview items={items} prices={prices} stats={stats} />
            
            <OpportunityBoard 
                dumps={dumps.slice(0, 8)} 
                bestFlips={bestFlips.slice(0, 8)} 
                onTrackItem={handleAddItem}
                filter='all'
            />
        </>
      )}

      {/* WATCHLIST */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
             <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-emerald-500" />
                Active Watchlist 
                <span className="ml-2 text-sm text-slate-500 font-normal">
                    ({watchlist.length} items) {watchlistLoading && <Loader2 className="inline h-3 w-3 animate-spin"/>}
                </span>
            </h2>
            <SettingsDialog />
        </div>
        
        <div className="flex gap-2">
            {watchlist.length > 0 && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="text-slate-500 hover:text-rose-500 hover:bg-rose-500/10"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            )}
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh
            </Button>
        </div>
      </div>

      {isLoading && items.length === 0 ? (
        <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
          {watchlist.map(item => (
            <div key={item.id} className="relative group h-full">
                <MarginCard 
                    item={item} 
                    priceData={prices[item.id]} 
                    stats={stats[item.id]}
                    onLogTrade={handleLogTrade}
                />
                <button 
                    onClick={() => handleRemoveItem(item.id)}
                    className="absolute -top-2 -right-2 bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-slate-700 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Remove item"
                >
                    <Trash2 size={14} />
                </button>
            </div>
          ))}
          
          {!watchlistLoading && watchlist.length === 0 && (
             <div className="col-span-full text-center py-20 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                 <p className="text-slate-500">Your watchlist is empty.</p>
                 <p className="text-sm text-slate-600 mt-2">Search for items above to start tracking prices and margins.</p>
             </div>
          )}
        </div>
      )}

      <LiveFeed 
        alerts={alerts} 
        onClear={() => setAlerts([])} 
        onRemove={(id) => setAlerts(prev => prev.filter(a => a.id !== id))} 
      />
    </>
  );
};

export default Dashboard;