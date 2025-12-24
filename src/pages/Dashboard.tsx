import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import ItemSearch from '@/components/ItemSearch';
import MarginCard from '@/components/MarginCard';
import { osrsApi, Item, PriceData } from '@/services/osrs-api';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const Dashboard = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [trackedItems, setTrackedItems] = useState<Item[]>([]);
  
  // Initial Data Load
  useEffect(() => {
    const init = async () => {
      try {
        const [mappingData, priceData] = await Promise.all([
          osrsApi.getMapping(),
          osrsApi.getLatestPrices()
        ]);
        
        setItems(mappingData);
        setPrices(priceData);
        
        // Add some default popular items to track if empty
        if (mappingData.length > 0) {
            // Examples: Zulrah scale, Old school bond, Fire rune
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

    // Auto-refresh prices every 60s
    const interval = setInterval(async () => {
        const newPrices = await osrsApi.getLatestPrices();
        setPrices(newPrices);
        toast.success("Prices updated");
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    const newPrices = await osrsApi.getLatestPrices();
    setPrices(newPrices);
    setLoading(false);
    toast.success("Prices refreshed manually");
  };

  const handleAddItem = (item: Item) => {
    if (trackedItems.find(i => i.id === item.id)) {
      toast.info("Item already tracked");
      return;
    }
    setTrackedItems(prev => [item, ...prev]);
    toast.success(`Added ${item.name} to dashboard`);
  };

  const handleRemoveItem = (id: number) => {
      setTrackedItems(prev => prev.filter(i => i.id !== id));
  }

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
          Market Terminal
        </h1>
        <p className="text-slate-500 mb-8 max-w-lg text-center">
          Real-time volatility monitoring and tax-adjusted margin calculations for OSRS flipping.
        </p>
        
        <ItemSearch items={items} onSelect={handleAddItem} isLoading={loading} />
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-200">Active Watchlist</h2>
        <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh Prices
        </Button>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {trackedItems.map(item => (
            <div key={item.id} className="relative group">
                <MarginCard 
                    item={item} 
                    priceData={prices[item.id]} 
                />
                <button 
                    onClick={() => handleRemoveItem(item.id)}
                    className="absolute -top-2 -right-2 bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-slate-700 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove item"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
          ))}
          
          {trackedItems.length === 0 && (
             <div className="col-span-full text-center py-20 border-2 border-dashed border-slate-800 rounded-xl">
                 <p className="text-slate-500">Your watchlist is empty. Search for items above to start tracking.</p>
             </div>
          )}
        </div>
      )}
    </Layout>
  );
};

export default Dashboard;