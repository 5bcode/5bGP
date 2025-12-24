import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import PriceChart from '@/components/PriceChart';
import TradeLogDialog, { Trade } from '@/components/TradeLogDialog';
import { osrsApi, Item, PriceData, Stats24h } from '@/services/osrs-api';
import { calculateMargin, calculateVolatility, formatGP, calculateDumpScore } from '@/lib/osrs-math';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
    ArrowLeft, ExternalLink, Activity, BarChart3, Clock, DollarSign, 
    AlertTriangle, ShieldCheck, Zap, TrendingUp, TrendingDown, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import ItemIcon from '@/components/ItemIcon';

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

  const copyToClipboard = (text: string, label: string) => {
      navigator.clipboard.writeText(text);
      toast.success(`Copied ${label} to clipboard`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-4 animate-pulse">
          <div className="h-12 w-1/3 bg-slate-800 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-800 rounded" />)}
          </div>
          <div className="h-[400px] bg-slate-800 rounded" />
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

  // --- CORE CALCULATIONS ---
  const { net, roi, tax } = calculateMargin(price.low, price.high);
  const volatility = calculateVolatility(price.high, price.low);
  const volume = stats ? stats.highPriceVolume + stats.lowPriceVolume : 0;
  
  // Advanced Analysis Logic
  const spread = price.high - price.low;
  const avgSpread = stats ? (stats.avgHighPrice - stats.avgLowPrice) : 0;
  const spreadDifference = avgSpread > 0 ? ((spread - avgSpread) / avgSpread) * 100 : 0;
  
  // Alch Arbitrage
  const natureRunePrice = 100; // rough estimate
  const highAlchProfit = (item.highalch || 0) - price.low - natureRunePrice;
  const isAlchable = highAlchProfit > 0;

  // Demand Pressure (Buy Vol vs Sell Vol)
  const buyPressure = stats ? (stats.highPriceVolume / (volume || 1)) * 100 : 50;

  // Smart Recommendation Engine
  let recommendation = "Neutral";
  let recColor = "text-slate-400";
  let recIcon = <Activity size={16} />;

  if (net > 0 && roi > 2 && volatility < 20) {
      recommendation = "Strong Buy";
      recColor = "text-emerald-400";
      recIcon = <TrendingUp size={16} />;
  } else if (volatility > 80) {
      recommendation = "Extreme Volatility";
      recColor = "text-rose-500";
      recIcon = <AlertTriangle size={16} />;
  } else if (item.highalch && price.low < item.highalch) {
      recommendation = "Safe Floor (Alch)";
      recColor = "text-blue-400";
      recIcon = <ShieldCheck size={16} />;
  } else if (spreadDifference > 50) {
      recommendation = "Gap Widening";
      recColor = "text-amber-400";
      recIcon = <Zap size={16} />;
  }

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
                    <ExternalLink className="mr-2 h-4 w-4" /> Wiki
                </Button>
            </a>
        </div>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 bg-slate-900/50 p-6 rounded-lg border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center gap-6">
            <ItemIcon item={item} size="lg" className="bg-slate-800 rounded-lg border border-slate-700 shadow-inner" />
            <div>
                <h1 className="text-3xl font-bold text-slate-100 tracking-tight">{item.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-slate-400">
                    <Badge variant="outline" className="border-slate-700 bg-slate-950 font-mono text-xs">ID: {item.id}</Badge>
                    {item.limit && (
                        <Badge variant="outline" className="border-slate-700 bg-slate-950 text-xs">
                            Limit: {item.limit.toLocaleString()}
                        </Badge>
                    )}
                    {item.members ? (
                         <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20">Members</Badge>
                    ) : (
                         <Badge variant="secondary" className="bg-slate-700 text-slate-300">F2P</Badge>
                    )}
                </div>
            </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border bg-slate-950 ${
                recommendation === 'Strong Buy' ? 'border-emerald-500/50 text-emerald-400' :
                recommendation === 'Extreme Volatility' ? 'border-rose-500/50 text-rose-500' :
                'border-slate-700 text-slate-300'
            }`}>
                {recIcon}
                <span className="font-bold text-sm">{recommendation}</span>
            </div>
            <TradeLogDialog item={item} priceData={price} onSave={handleLogTrade} />
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* BUY PRICE */}
        <Card className="bg-slate-900 border-slate-800 relative group overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">Buy Price (Insta Sell)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold text-slate-100 font-mono">{formatGP(price.low)}</div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(price.low.toString(), "Buy Price")}>
                        <Copy size={12} />
                    </Button>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Clock size={12} /> {Math.floor((Date.now()/1000 - price.lowTime))}s ago
                </div>
            </CardContent>
        </Card>

        {/* SELL PRICE */}
        <Card className="bg-slate-900 border-slate-800 relative group overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">Sell Price (Insta Buy)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold text-slate-100 font-mono">{formatGP(price.high)}</div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(price.high.toString(), "Sell Price")}>
                        <Copy size={12} />
                    </Button>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Clock size={12} /> {Math.floor((Date.now()/1000 - price.highTime))}s ago
                </div>
            </CardContent>
        </Card>

        {/* MARGIN / PROFIT */}
        <Card className="bg-slate-900 border-slate-800 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${net > 0 ? 'bg-emerald-400' : 'bg-rose-500'}`}></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">Net Profit</CardTitle>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold font-mono ${net > 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                    {net > 0 ? '+' : ''}{formatGP(net)}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex justify-between w-full">
                    <span>Tax: <span className="text-rose-400">-{formatGP(tax)}</span></span>
                    <span>ROI: <span className={roi > 2 ? 'text-emerald-500' : 'text-slate-400'}>{roi.toFixed(2)}%</span></span>
                </div>
            </CardContent>
        </Card>

        {/* RISK FACTOR */}
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">Volatility Score</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 mb-2">
                    <div className="text-2xl font-bold text-slate-100 font-mono">{volatility.toFixed(1)}</div>
                    {volatility > 50 && <AlertTriangle className="text-rose-500 animate-pulse" size={20} />}
                </div>
                <Progress value={volatility} max={100} className={`h-1.5 ${volatility > 50 ? "bg-rose-900" : "bg-slate-800"}`} />
            </CardContent>
        </Card>
      </div>

      {/* DEEP ANALYSIS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* SPREAD VISUALIZER */}
          <Card className="bg-slate-900 border-slate-800 md:col-span-2">
             <CardHeader className="pb-4 border-b border-slate-800/50">
                <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <DollarSign size={16} className="text-emerald-500" /> Margin Breakdown
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">Visualizing where your profit comes from relative to tax.</CardDescription>
             </CardHeader>
             <CardContent className="pt-6">
                <div className="relative h-12 bg-slate-950 rounded-lg flex items-center overflow-hidden border border-slate-800">
                    {/* Buy Cost */}
                    <div className="h-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 border-r border-slate-700" style={{ width: '40%' }}>
                        Cost
                    </div>
                    {/* Profit */}
                    <div className="h-full bg-emerald-600/20 flex items-center justify-center text-xs font-bold text-emerald-400 relative" style={{ flex: 1 }}>
                        <span className="z-10">Profit ({((net/price.high)*100).toFixed(1)}%)</span>
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    </div>
                    {/* Tax */}
                    <div className="h-full bg-rose-900/40 flex items-center justify-center text-[10px] text-rose-400 border-l border-rose-900/50" style={{ width: '10%' }}>
                        Tax
                    </div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500 font-mono">
                    <span>{formatGP(price.low)} (Buy)</span>
                    <span>{formatGP(price.high)} (Sell)</span>
                </div>
                
                {/* Comparison to Avg Spread */}
                <div className="mt-6 p-3 bg-slate-950 rounded border border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Current Margin vs 24h Avg</span>
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${spreadDifference > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {spreadDifference > 0 ? '+' : ''}{spreadDifference.toFixed(1)}%
                        </span>
                        {spreadDifference > 20 && <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-500">Wide Spread</Badge>}
                    </div>
                </div>
             </CardContent>
          </Card>

          {/* ARBITRAGE & ALCH */}
          <Card className="bg-slate-900 border-slate-800">
             <CardHeader className="pb-4 border-b border-slate-800/50">
                <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-blue-500" /> Arbitrage Check
                </CardTitle>
             </CardHeader>
             <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">High Alch Value</span>
                    <span className="font-mono text-slate-200">{formatGP(item.highalch || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Nature Rune</span>
                    <span className="font-mono text-slate-500">~100 gp</span>
                </div>
                <div className="pt-2 border-t border-slate-800">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-300">Alch Profit</span>
                        <span className={`font-mono font-bold ${isAlchable ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {formatGP(highAlchProfit)}
                        </span>
                    </div>
                </div>
                
                {isAlchable ? (
                    <div className="p-2 bg-emerald-950/30 border border-emerald-900/50 rounded text-xs text-emerald-400 flex items-start gap-2">
                        <ShieldCheck size={14} className="shrink-0 mt-0.5" />
                        <span>Price is below alch value. This is a very safe floor price.</span>
                    </div>
                ) : (
                    <div className="p-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-500">
                        Price is above alch value. Normal market risk applies.
                    </div>
                )}
             </CardContent>
          </Card>
      </div>

      {/* CHART & HISTORICAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                <Activity className="text-emerald-500" size={20} /> Price Action (Last 4h)
            </h3>
            <PriceChart itemId={item.id} />
        </div>

        {/* VOLUME ANALYSIS */}
        <div className="space-y-6">
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                        <BarChart3 className="text-blue-500" size={16} /> Volume & Demand
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {stats ? (
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-400">Daily Turnover</span>
                                    <span className="text-slate-200 font-mono">{formatGP(volume)}</span>
                                </div>
                                
                                {/* Buy vs Sell Pressure Bar */}
                                <div className="mt-2">
                                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                        <span>Sell Pressure</span>
                                        <span>Buy Pressure</span>
                                    </div>
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
                                        <div 
                                            className="bg-blue-500 transition-all duration-500" 
                                            style={{ width: `${100 - buyPressure}%` }}
                                        ></div>
                                        <div 
                                            className="bg-emerald-500 transition-all duration-500" 
                                            style={{ width: `${buyPressure}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                            
                            {item.limit && (
                                <div className="pt-4 border-t border-slate-800">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-400">Limit Saturation</span>
                                        <span className="text-slate-200 font-mono">
                                            {((volume / item.limit) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500">
                                        {volume > item.limit ? "High liquidity item." : "Low liquidity, easy to hit limit."}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-slate-500 italic">No volume data available.</p>
                    )}
                </CardContent>
            </Card>
            
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                     <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                        <DollarSign className="text-amber-500" size={16} /> Capital Required
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                         <span className="text-slate-400">For 1 Limit</span>
                         <span className="text-slate-200 font-mono">
                            {item.limit ? formatGP(item.limit * price.low) : '--'}
                         </span>
                    </div>
                    <div className="flex justify-between">
                         <span className="text-slate-400">Max Potential Profit</span>
                         <span className="text-emerald-400 font-mono font-bold">
                            {item.limit ? formatGP(item.limit * net) : '--'}
                         </span>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ItemDetails;