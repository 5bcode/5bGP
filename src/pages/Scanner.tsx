import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { osrsApi, Item, PriceData, Stats24h } from '@/services/osrs-api';
import { useMarketAnalysis, AnalysisFilter } from '@/hooks/use-market-analysis';
import { Loader2, ArrowLeft, TrendingUp, ArrowDown, ExternalLink, Plus } from 'lucide-react';
import { formatGP } from '@/lib/osrs-math';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ItemIcon from '@/components/ItemIcon';

const Scanner = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = searchParams.get('type') === 'crash' ? 'crash' : 'flip';
  const filterParam = (searchParams.get('filter') as AnalysisFilter) || 'all';

  const [filter, setFilter] = useState<AnalysisFilter>(filterParam);
  const [type, setType] = useState<'crash'|'flip'>(typeParam);

  const [items, setItems] = useState<Item[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [stats, setStats] = useState<Record<string, Stats24h>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Update URL when state changes
    setSearchParams({ type, filter });
  }, [type, filter, setSearchParams]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [mappingData, priceData, statsData] = await Promise.all([
          osrsApi.getMapping(),
          osrsApi.getLatestPrices(),
          osrsApi.get24hStats()
        ]);
        setItems(mappingData);
        setPrices(priceData);
        setStats(statsData);
      } catch (e) {
        toast.error("Failed to load OSRS data");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const { dumps, bestFlips } = useMarketAnalysis(items, prices, stats, filter);
  const data = type === 'crash' ? dumps : bestFlips;
  const displayData = data.slice(0, 100);

  const handleTrack = (item: Item) => {
    const saved = localStorage.getItem('trackedItems');
    const tracked = saved ? JSON.parse(saved) : [];
    if (tracked.find((i: Item) => i.id === item.id)) {
        toast.info("Already tracking");
        return;
    }
    localStorage.setItem('trackedItems', JSON.stringify([item, ...tracked]));
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
            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <Loader2 className="animate-spin text-emerald-500 h-8 w-8" />
                </div>
            ) : displayData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500">
                    <p>No results found for this filter.</p>
                </div>
            ) : (
                <Table>
                    <TableHeader className="bg-slate-950">
                        <TableRow className="border-slate-800 hover:bg-slate-950">
                            <TableHead className="w-[80px]"></TableHead>
                            <TableHead className="text-slate-400">Item</TableHead>
                            <TableHead className="text-right text-slate-400">Buy Price</TableHead>
                            <TableHead className="text-right text-slate-400">
                                {type === 'crash' ? 'Drop %' : 'Profit / Item'}
                            </TableHead>
                            <TableHead className="text-right text-slate-400">
                                {type === 'crash' ? 'Potential Profit' : 'ROI'}
                            </TableHead>
                            <TableHead className="text-right text-slate-400">Volume (24h)</TableHead>
                            <TableHead className="text-right text-slate-400">Score</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayData.map((row) => (
                            <TableRow key={row.item.id} className="border-slate-800 hover:bg-slate-800/50">
                                <TableCell>
                                    <ItemIcon item={row.item} size="md" />
                                </TableCell>
                                <TableCell className="font-medium text-slate-200">
                                    <div className="flex flex-col">
                                        <Link to={`/item/${row.item.id}`} className="hover:text-emerald-400 transition-colors">
                                            {row.item.name}
                                        </Link>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <span>ID: {row.item.id}</span>
                                            {row.item.limit && <span className="bg-slate-950 px-1 rounded">Lim: {row.item.limit}</span>}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-slate-300">
                                    {formatGP(row.price.low)}
                                </TableCell>
                                <TableCell className={`text-right font-bold ${type === 'crash' ? 'text-rose-500' : 'text-emerald-400'}`}>
                                    {type === 'crash' 
                                        ? `-${row.metric.toFixed(1)}%` 
                                        : `+${formatGP(row.metric)}`
                                    }
                                </TableCell>
                                <TableCell className="text-right font-mono text-slate-400">
                                    {type === 'crash'
                                        ? formatGP(row.secondaryMetric)
                                        : `${row.secondaryMetric.toFixed(2)}%`
                                    }
                                </TableCell>
                                <TableCell className="text-right text-slate-400">
                                    {formatGP(row.stats.highPriceVolume + row.stats.lowPriceVolume)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs text-slate-500">
                                    {row.score.toFixed(1)}
                                </TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-2">
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-400"
                                            onClick={() => handleTrack(row.item)}
                                            title="Track Item"
                                        >
                                            <Plus size={16} />
                                        </Button>
                                        <a href={`https://prices.runescape.wiki/osrs/item/${row.item.id}`} target="_blank" rel="noreferrer">
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-blue-400">
                                                <ExternalLink size={14} />
                                            </Button>
                                        </a>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    </Layout>
  );
};

export default Scanner;