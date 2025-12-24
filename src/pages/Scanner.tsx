import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Item } from '@/services/osrs-api';
import { useMarketAnalysis, AnalysisFilter } from '@/hooks/use-market-analysis';
import { useMarketData } from '@/hooks/use-osrs-query';
import { Loader2, ArrowLeft, TrendingUp, ArrowDown } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ScannerTable from '@/components/ScannerTable';

const Scanner = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = searchParams.get('type') === 'crash' ? 'crash' : 'flip';
  const filterParam = (searchParams.get('filter') as AnalysisFilter) || 'all';

  const [filter, setFilter] = useState<AnalysisFilter>(filterParam);
  const [type, setType] = useState<'crash'|'flip'>(typeParam);
  
  // Tracked Items State
  const [trackedIds, setTrackedIds] = useState<Set<number>>(new Set());

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ 
      key: 'score', 
      direction: 'desc' 
  });

  // React Query
  const { items, prices, stats, isLoading } = useMarketData();

  useEffect(() => {
    // Update URL when state changes
    setSearchParams({ type, filter });
  }, [type, filter, setSearchParams]);

  useEffect(() => {
      const saved = localStorage.getItem('trackedItems');
      if (saved) {
          const parsed = JSON.parse(saved);
          setTrackedIds(new Set(parsed.map((i: Item) => i.id)));
      }
  }, []);

  const { dumps, bestFlips } = useMarketAnalysis(items, prices, stats, filter);
  const data = type === 'crash' ? dumps : bestFlips;
  
  const displayData = useMemo(() => {
      const topItems = data.slice(0, 100);
      
      return [...topItems].sort((a, b) => {
          let aValue: any = 0;
          let bValue: any = 0;

          switch(sortConfig.key) {
              case 'name': 
                  aValue = a.item.name; 
                  bValue = b.item.name; 
                  break;
              case 'price': 
                  aValue = a.price.low; 
                  bValue = b.price.low; 
                  break;
              case 'metric': // Drop % or Profit
                  aValue = a.metric; 
                  bValue = b.metric; 
                  break;
              case 'secondary': // Potential or ROI
                  aValue = a.secondaryMetric; 
                  bValue = b.secondaryMetric; 
                  break;
              case 'volume': 
                  aValue = a.stats.highPriceVolume + a.stats.lowPriceVolume; 
                  bValue = b.stats.highPriceVolume + b.stats.lowPriceVolume; 
                  break;
              case 'score': 
                  aValue = a.score; 
                  bValue = b.score; 
                  break;
              default: return 0;
          }

          if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });
  }, [data, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleTrack = (item: Item) => {
    const saved = localStorage.getItem('trackedItems');
    const tracked = saved ? JSON.parse(saved) : [];
    if (tracked.find((i: Item) => i.id === item.id)) {
        toast.info("Already tracking");
        return;
    }
    localStorage.setItem('trackedItems', JSON.stringify([item, ...tracked]));
    setTrackedIds(prev => new Set(prev).add(item.id));
    toast.success(`Tracking ${item.name}`);
  }

  return (
    <Layout>
        <div className="mb-6">
            <Link to="/" className="text-slate-400 hover:text-emerald-400 flex items-center gap-2 mb-4 transition-colors">
                <ArrowLeft size={16} /> Back to Dashboard
            </Link>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
                        {type === 'crash' ? (
                            <><ArrowDown className="text-rose-500" /> Crash Watch</>
                        ) : (
                            <><TrendingUp className="text-emerald-500" /> Top Opportunities</>
                        )}
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Scanning top 100 items based on your strategy.
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-1 inline-flex">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setType('flip')}
                            className={type === 'flip' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}
                        >
                            Flips
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setType('crash')}
                            className={type === 'crash' ? 'bg-rose-600/20 text-rose-400' : 'text-slate-400 hover:text-slate-200'}
                        >
                            Crashes
                        </Button>
                    </div>

                    <ToggleGroup 
                        type="single" 
                        value={filter} 
                        onValueChange={(v) => v && setFilter(v as AnalysisFilter)}
                        className="bg-slate-900 border border-slate-800 rounded-lg p-1"
                    >
                        <ToggleGroupItem value="all" size="sm" className="text-xs px-3 data-[state=on]:bg-emerald-600/20 data-[state=on]:text-emerald-400">
                            Balanced
                        </ToggleGroupItem>
                        <ToggleGroupItem value="high_volume" size="sm" className="text-xs px-3 data-[state=on]:bg-blue-600/20 data-[state=on]:text-blue-400">
                            High Vol
                        </ToggleGroupItem>
                        <ToggleGroupItem value="high_ticket" size="sm" className="text-xs px-3 data-[state=on]:bg-amber-600/20 data-[state=on]:text-amber-400">
                            Big Ticket
                        </ToggleGroupItem>
                        <ToggleGroupItem value="f2p" size="sm" className="text-xs px-3 data-[state=on]:bg-slate-700 data-[state=on]:text-white">
                            F2P
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
            </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            {isLoading ? (
                <div className="h-64 flex items-center justify-center">
                    <Loader2 className="animate-spin text-emerald-500 h-8 w-8" />
                </div>
            ) : (
                <ScannerTable 
                    data={displayData}
                    type={type}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    trackedIds={trackedIds}
                    onTrack={handleTrack}
                />
            )}
        </div>
    </Layout>
  );
};

export default Scanner;