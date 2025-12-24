import React, { useEffect, useState, useCallback } from 'react';
import Layout from '@/components/Layout';
import ItemSearch from '@/components/ItemSearch';
import MarginCard from '@/components/MarginCard';
import SettingsDialog from '@/components/SettingsDialog';
import LiveFeed, { MarketAlert } from '@/components/LiveFeed';
import Analytics from '@/components/Analytics';
import { osrsApi, Item, PriceData, Stats24h } from '@/services/osrs-api';
import { usePriceMonitor } from '@/hooks/use-price-monitor';
import { Loader2, RefreshCw, Trash2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trade } from '@/components/TradeLogDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatGP } from '@/lib/osrs-math';

const Dashboard = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [stats, setStats] = useState<Record<string, Stats24h>>({});
  const [loading, setLoading] = useState(true);
  
  // Settings State
  const [settings, setSettings] = useState(() => {
      const saved = localStorage.getItem('appSettings');
      return saved ? JSON.parse(saved) : { alertThreshold: 10, refreshInterval: 60 };
  });

  // Load tracked items
  const [trackedItems, setTrackedItems] = useState<Item[]>(() => {
    const saved = localStorage.getItem('trackedItems');
    return saved ? JSON.parse(saved) : [];
  });

  // Trade History
  const [trades, setTrades] = useState<Trade[]>(() => {
      const saved = localStorage.getItem('tradeHistory');
      return saved ? JSON.parse(saved) : [];
  });

  // Live Alerts
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);

  // Persistence
  useEffect(() => { localStorage.setItem('trackedItems', JSON.stringify(trackedItems)); }, [trackedItems]);
  useEffect(() => { localStorage.setItem('tradeHistory', JSON.stringify(trades)); }, [trades]);
  useEffect(() => { localStorage.setItem('appSettings', JSON.stringify(settings)); }, [settings]);
  
  // Initial Data Load
  useEffect(() => {
    const init = async () => {
      try {
        const [mappingData, priceData, statsData] = await Promise.all([
          osrsApi.getMapping(),
          osrsApi.getLatestPrices(),
          osrsApi.get24hStats()
        ]);
        
        setItems(mappingData);
        setPrices(priceData);
        setStats(statsData);
        
        if (mappingData.length > 0 && trackedItems.length === 0 && !localStorage.getItem('trackedItems')) {
            const defaults = mappingData.filter(i => 
                [12934, 13190, 554, 560, 4151].includes(i.id)
            );
            setTrackedItems(defaults);
        }
      } catch (e) {
        toast.error("Failed to load OSRS data");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Polling Interval
  useEffect(() => {
    const interval = setInterval(async () => {
        const newPrices = await osrsApi.getLatestPrices();
        setPrices(newPrices);
    }, settings.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [settings.refreshInterval]);

  // Alert Handler
  const handleAlert = useCallback((alert: MarketAlert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 50)); // Keep last 50
  }, []);

  // Price Monitor Hook
  usePriceMonitor(prices, stats, trackedItems, settings.alertThreshold, handleAlert);

  const handleRefresh = async () => {
    setLoading(true);
    const [newPrices, newStats] = await Promise.all([
        osrsApi.getLatestPrices(),
        osrsApi.get24hStats()
    ]);
    setPrices(newPrices);
    setStats(newStats);
    setLoading(false);
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
      setTrades(prev => [trade, ...prev]);
  }

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
          Market Terminal
        </h1>
        <ItemSearch items={items} onSelect={handleAddItem} isLoading={loading} />
      </div>

      {trades.length > 0 && <Analytics trades={trades} />}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
             <h2 className="text-xl font-semibold text-slate-200">
                Active Watchlist 
                <span className="ml-2 text-sm text-slate-500 font-normal">({trackedItems.length} items)</span>
            </h2>
            <SettingsDialog settings={settings} onSave={setSettings} />
        </div>
        
        <div className="flex gap-2">
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="border-slate-800 bg-slate-900 text-slate-300">
                        <History className="mr-2 h-4 w-4" /> History
                    </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Trade History</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                        {trades.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">No trades logged yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {trades.map(trade => (
                                    <div key={trade.id} className="p-3 bg-slate-800/50 rounded flex justify-between items-center border border-slate-700">
                                        <div>
                                            <div className="font-bold text-slate-200">{trade.itemName}</div>
                                            <div className="text-xs text-slate-500">
                                                {new Date(trade.timestamp).toLocaleDateString()} • {trade.quantity} qty
                                            </div>
                                        </div>
                                        <div className={`font-mono ${trade.profit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {trade.profit > 0 ? '+' : ''}{formatGP(trade.profit)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

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
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh
            </Button>
        </div>
      </div>

      {loading && items.length === 0 ? (
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