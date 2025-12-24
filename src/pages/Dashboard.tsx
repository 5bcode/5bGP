import React, { useEffect, useState, useCallback } from 'react';
import Layout from '@/components/Layout';
import ItemSearch from '@/components/ItemSearch';
import MarginCard from '@/components/MarginCard';
import SettingsDialog from '@/components/SettingsDialog';
import LiveFeed, { MarketAlert } from '@/components/LiveFeed';
import OpportunityBoard from '@/components/OpportunityBoard';
import { Item } from '@/services/osrs-api';
import { usePriceMonitor } from '@/hooks/use-price-monitor';
import { useMarketAnalysis, AnalysisFilter } from '@/hooks/use-market-analysis';
import { useMarketData } from '@/hooks/use-osrs-query';
import { Loader2, RefreshCw, Trash2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trade } from '@/components/TradeLogDialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const Dashboard = () => {
  // Settings State
  const [settings, setSettings] = useState(() => {
      const saved = localStorage.getItem('appSettings');
      return saved ? JSON.parse(saved) : { alertThreshold: 10, refreshInterval: 60 };
  });

  // React Query Hook
  const { items, prices, stats, isLoading, refetch } = useMarketData();
  
  // Market Scanner Filter
  const [scannerFilter, setScannerFilter] = useState<AnalysisFilter>('all');
  
  // Load tracked items
  const [trackedItems, setTrackedItems] = useState<Item[]>(() => {
    const saved = localStorage.getItem('trackedItems');
    return saved ? JSON.parse(saved) : [];
  });

  // Live Alerts
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);

  // Persistence
  useEffect(() => { localStorage.setItem('trackedItems', JSON.stringify(trackedItems)); }, [trackedItems]);
  useEffect(() => { localStorage.setItem('appSettings', JSON.stringify(settings)); }, [settings]);
  
  // Initialize Default Items if empty and data loaded
  useEffect(() => {
    if (!isLoading && items.length > 0 && trackedItems.length === 0 && !localStorage.getItem('trackedItems')) {
        const defaults = items.filter(i => 
            [12934, 13190, 554, 560, 4151].includes(i.id)
        );
        setTrackedItems(defaults);
    }
  }, [isLoading, items, trackedItems.length]);

  // Alert Handler
  const handleAlert = useCallback((alert: MarketAlert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 50)); 
  }, []);

  // Monitor Hooks
  usePriceMonitor(prices, stats, trackedItems, settings.alertThreshold, handleAlert);
  
  // Apply filter to analysis
  const { dumps, bestFlips } = useMarketAnalysis(items, prices, stats, scannerFilter);

  const handleRefresh = async () => {
    await refetch();
    toast.success("Market data refreshed");
  };

  const handleAddItem = (item: Item) => {
    if (trackedItems.find(i => i.id === item.id)) {
      toast.info("Item already tracked");
      return;
    }
    setTrackedItems(prev => [item, ...prev]);
    toast.success(`Added ${item.name}`);
  };

  const handleRemoveItem = (id: number) => {
      setTrackedItems(prev => prev.filter(i => i.id !== id));
      toast.info("Item removed");
  }

  const handleClearAll = () => {
      if (confirm("Clear watchlist?")) {
          setTrackedItems([]);
          toast.success("Watchlist cleared");
      }
  }

  const handleLogTrade = (trade: Trade) => {
      const saved = localStorage.getItem('tradeHistory');
      const history = saved ? JSON.parse(saved) : [];
      localStorage.setItem('tradeHistory', JSON.stringify([trade, ...history]));
      toast.success("Trade logged to History");
  }

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
          Market Terminal
        </h1>
        <ItemSearch items={items} onSelect={handleAddItem} isLoading={isLoading} />
      </div>
      
      {/* GLOBAL ANALYSIS */}
      {!isLoading && (
        <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-400">Scanner Strategy:</span>
                    <ToggleGroup 
                        type="single" 
                        value={scannerFilter} 
                        onValueChange={(v) => v && setScannerFilter(v as AnalysisFilter)}
                        className="bg-slate-900 border border-slate-800 rounded-lg p-1"
                    >
                        <ToggleGroupItem value="all" size="sm" className="text-xs data-[state=on]:bg-emerald-600/20 data-[state=on]:text-emerald-400">
                            Balanced
                        </ToggleGroupItem>
                        <ToggleGroupItem value="high_volume" size="sm" className="text-xs data-[state=on]:bg-blue-600/20 data-[state=on]:text-blue-400">
                            High Volume
                        </ToggleGroupItem>
                        <ToggleGroupItem value="high_ticket" size="sm" className="text-xs data-[state=on]:bg-amber-600/20 data-[state=on]:text-amber-400">
                            Big Ticket
                        </ToggleGroupItem>
                        <ToggleGroupItem value="f2p" size="sm" className="text-xs data-[state=on]:bg-slate-700 data-[state=on]:text-white">
                            F2P Only
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
            </div>
            
            <OpportunityBoard 
                dumps={dumps.slice(0, 8)} 
                bestFlips={bestFlips.slice(0, 8)} 
                onTrackItem={handleAddItem}
                filter={scannerFilter}
            />
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
             <h2 className="text-xl font-semibold text-slate-200">
                Active Watchlist 
                <span className="ml-2 text-sm text-slate-500 font-normal">({trackedItems.length} items)</span>
            </h2>
            <SettingsDialog settings={settings} onSave={setSettings} />
        </div>
        
        <div className="flex gap-2">
            {trackedItems.length > 0 && (
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
          {trackedItems.map(item => (
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
          
          {trackedItems.length === 0 && (
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
    </Layout>
  );
};

export default Dashboard;