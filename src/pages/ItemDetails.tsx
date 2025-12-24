import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import PriceChart from '@/components/PriceChart';
import TradeLogDialog, { Trade } from '@/components/TradeLogDialog';
import { osrsApi, Item, PriceData, Stats24h } from '@/services/osrs-api';
import { calculateMargin, calculateVolatility, formatGP, calculateDumpScore } from '@/lib/osrs-math';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ExternalLink, Activity, BarChart3, Clock, DollarSign, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const ItemDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [price, setPrice] = useState<PriceData | null>(null);
  const [stats, setStats] = useState<Stats24h | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // Fetch all necessary data
        // Note: In a real production app with individual item endpoints, we'd fetch just this item.
        // Since the wiki API is bulk-oriented, we reuse the cached bulk data methods.
        const [mapping, prices, statsData] = await Promise.all([
          osrsApi.getMapping(),
          osrsApi.getLatestPrices(),
          osrsApi.get24hStats()
        ]);

        const foundItem = mapping.find(i => i.id.toString() === id);
        if (foundItem) {
          setItem(foundItem);
          setPrice(prices[foundItem.id]);
          setStats(statsData[foundItem.id]);
        }
      } catch (e) {
        toast.error("Failed to load item details");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleLogTrade = (trade: Trade) => {
    const saved = localStorage.getItem('tradeHistory');
    const history = saved ? JSON.parse(saved) : [];
    localStorage.setItem('tradeHistory', JSON.stringify([trade, ...history]));
    toast.success("Trade logged to local history");
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-1/3 bg-slate-800" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32 bg-slate-800" />
            <Skeleton className="h-32 bg-slate-800" />
            <Skeleton className="h-32 bg-slate-800" />
          </div>
          <Skeleton className="h-[400px] bg-slate-800" />
        </div>
      </Layout>
    );
  }

  if (!item || !price) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
          <h2 className="text-2xl font-bold mb-2">Item Not Found</h2>
          <Link to="/" className="text-emerald-500 hover:underline">Return to Dashboard</Link>
        </div>
      </Layout>
    );
  }

  // Analytics Calculation
  const { net, roi, tax } = calculateMargin(price.low, price.high);
  const volatility = calculateVolatility(price.high, price.low);
  const volume = stats ? stats.highPriceVolume + stats.lowPriceVolume : 0;
  
  // Advanced Analysis
  const liquidityScore = volume > 10000 ? 'High' : volume > 1000 ? 'Medium' : 'Low';
  const riskLevel = volatility > 50 ? 'High' : volatility > 20 ? 'Medium' : 'Low';
  
  // Dump Detection for Analysis Card
  const dumpScore = stats ? calculateDumpScore(price.low, stats.avgLowPrice) : 0;
  const isCrashing = dumpScore > 5;

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" className="flex items-center text-slate-400 hover:text-emerald-400 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
        <div className="flex gap-2">
            <a 
                href={`https://prices.runescape.wiki/osrs/item/${item.id}`} 
                target="_blank" 
                rel="noreferrer"
            >
                <Button variant="outline" size="sm" className="bg-slate-900 border-slate-700 text-slate-300">
                    <ExternalLink className="mr-2 h-4 w-4" /> Wiki Prices
                </Button>
            </a>
        </div>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
        <div className="flex items-center gap-4">
            {/* Icon Placeholder (Wiki API doesn't provide direct icon URLs easily without constructing them, using a placeholder/generic) */}
            <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700">
                <span className="text-2xl font-bold text-slate-500">{item.name.charAt(0)}</span>
            </div>
            <div>
                <h1 className="text-3xl font-bold text-slate-100">{item.name}</h1>
                <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-xs font-mono border border-slate-700">ID: {item.id}</span>
                    {item.limit && (
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-xs border border-slate-700">
                            Limit: {item.limit}
                        </span>
                    )}
                    {item.members ? (
                         <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20">Members</Badge>
                    ) : (
                         <Badge variant="secondary" className="bg-slate-700 text-slate-300">F2P</Badge>
                    )}
                </div>
            </div>
        </div>
        
        <div className="flex gap-4">
            <TradeLogDialog item={item} priceData={price} onSave={handleLogTrade} />
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Potential Profit</CardTitle>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold font-mono ${net > 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                    {net > 0 ? '+' : ''}{formatGP(net)}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex justify-between">
                    <span>ROI: <span className={roi > 2 ? 'text-emerald-500' : 'text-slate-400'}>{roi.toFixed(2)}%</span></span>
                    <span>Tax: -{formatGP(tax)}</span>
                </div>
            </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Buy Price (Low)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-slate-200 font-mono">
                    {formatGP(price.low)}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Clock size={12} /> {Math.floor((Date.now()/1000 - price.lowTime))}s ago
                </div>
            </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Sell Price (High)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-slate-200 font-mono">
                    {formatGP(price.high)}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Clock size={12} /> {Math.floor((Date.now()/1000 - price.highTime))}s ago
                </div>
            </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Analysis</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-500">Risk</span>
                    <Badge variant="outline" className={`
                        ${riskLevel === 'High' ? 'border-rose-500 text-rose-500' : riskLevel === 'Medium' ? 'border-amber-500 text-amber-500' : 'border-emerald-500 text-emerald-500'}
                    `}>{riskLevel}</Badge>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Liquidity</span>
                    <span className="text-sm font-mono text-slate-300">{liquidityScore}</span>
                </div>
                {isCrashing && (
                    <div className="mt-2 text-xs text-rose-400 flex items-center gap-1 font-bold animate-pulse">
                        <AlertTriangle size={12} /> POTENTIAL CRASH
                    </div>
                )}
            </CardContent>
        </Card>
      </div>

      {/* Main Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                <Activity className="text-emerald-500" size={20} /> Price Action (Last 4h)
            </h3>
            <PriceChart itemId={item.id} />
        </div>

        {/* Side Stats */}
        <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <BarChart3 className="text-blue-500" size={20} /> 24h Volume
                </h3>
                {stats ? (
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-slate-400">Total Traded</span>
                                <span className="text-slate-200 font-mono">{formatGP(volume)}</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
                                <div 
                                    className="bg-emerald-500/50 h-full" 
                                    style={{ width: `${(stats.highPriceVolume / volume) * 100}%` }}
                                ></div>
                                <div 
                                    className="bg-blue-500/50 h-full" 
                                    style={{ width: `${(stats.lowPriceVolume / volume) * 100}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                                <span>Buys (High)</span>
                                <span>Sells (Low)</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-slate-400">Avg High</span>
                                <span className="text-emerald-400 font-mono">{formatGP(stats.avgHighPrice)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Avg Low</span>
                                <span className="text-blue-400 font-mono">{formatGP(stats.avgLowPrice)}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-slate-500 italic">No volume data available.</p>
                )}
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                 <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <DollarSign className="text-amber-500" size={20} /> Investment Specs
                </h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                         <span className="text-slate-400">GE Limit</span>
                         <span className="text-slate-200">{item.limit ? item.limit.toLocaleString() : 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                         <span className="text-slate-400">Full Limit Cost</span>
                         <span className="text-slate-200 font-mono">
                            {item.limit ? formatGP(item.limit * price.low) : '--'}
                         </span>
                    </div>
                    <div className="flex justify-between">
                         <span className="text-slate-400">Potential Limit Profit</span>
                         <span className="text-emerald-400 font-mono font-bold">
                            {item.limit ? formatGP(item.limit * net) : '--'}
                         </span>
                    </div>
                </div>
            </div>
        </div>
      </div>

    </Layout>
  );
};

export default ItemDetails;