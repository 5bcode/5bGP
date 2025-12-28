import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Item } from '@/services/osrs-api';
import { useMarketAnalysis, DEFAULT_STRATEGY } from '@/hooks/use-market-analysis';
import { useMarketData } from '@/hooks/use-osrs-query';
import { useStrategies, Strategy } from '@/hooks/use-strategies';
import { Loader2, ArrowLeft, TrendingUp, ArrowDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import ScannerTable from '@/components/ScannerTable';
import StrategyBuilder from '@/components/StrategyBuilder';

const Scanner = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = searchParams.get('type') === 'crash' ? 'crash' : 'flip';
  
  const [type, setType] = useState<'crash'|'flip'>(typeParam);
  const [trackedIds, setTrackedIds] = useState<Set<number>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ 
      key: 'score', 
      direction: 'desc' 
  });

  // Strategy Management
  const { strategies, saveStrategy, deleteStrategy } = useStrategies();
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('default_safe');

  const currentStrategy = useMemo(() => {
    return strategies.find(s => s.id === selectedStrategyId) || DEFAULT_STRATEGY;
  }, [strategies, selectedStrategyId]);

  // React Query
  const { items, prices, stats, isLoading } = useMarketData();

  useEffect(() => {
    setSearchParams({ type, strategy: selectedStrategyId });
  }, [type, selectedStrategyId, setSearchParams]);

  useEffect(() => {
      const saved = localStorage.getItem('trackedItems');
      if (saved) {
          const parsed = JSON.parse(saved);
          setTrackedIds(new Set(parsed.map((i: Item) => i.id)));
      }
  }, []);

  const { dumps, bestFlips } = useMarketAnalysis(items, prices, stats, currentStrategy);
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
              case 'metric': 
                  aValue = a.metric; 
                  bValue = b.metric; 
                  break;
              case 'secondary': 
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
  
  const handleDeleteStrategy = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (currentStrategy.id.startsWith('default')) return;
      if (confirm(`Delete strategy ${currentStrategy.name}?`)) {
          deleteStrategy(currentStrategy.id);
          setSelectedStrategyId('default_safe');
      }
  }

  return (
    <>
        <div className="mb-6">
            <Link to="/" className="text-slate-400 hover:text-emerald-400 flex items-center gap-2 mb-4 transition-colors">
                <ArrowLeft size={16} /> Back to Dashboard
            </Link>
            
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
                        {type === 'crash' ? (
                            <><ArrowDown className="text-rose-500" /> Crash Watch</>
                        ) : (
                            <><TrendingUp className="text-emerald-500" /> Opportunity Scanner</>
                        )}
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Scanned {items.length} items using strategy: <span className="text-emerald-400 font-bold">{currentStrategy.name}</span>
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
                         <Select value={selectedStrategyId} onValueChange={setSelectedStrategyId}>
                            <SelectTrigger className="w-[200px] border-none bg-transparent">
                                <SelectValue placeholder="Select Strategy" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                                {strategies.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {!currentStrategy.id.startsWith('default') && (
                            <Button size="icon" variant="ghost" className="h-10 w-10 text-slate-500 hover:text-rose-500" onClick={handleDeleteStrategy}>
                                <Trash2 size={16} />
                            </Button>
                        )}
                    </div>

                    <StrategyBuilder onSave={(s) => {
                        saveStrategy(s);
                        setSelectedStrategyId(s.id);
                    }} />

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
    </>
  );
};

export default Scanner;