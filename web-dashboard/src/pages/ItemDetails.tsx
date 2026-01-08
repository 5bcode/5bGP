import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { calculateMargin, calculateVolatility, calculateTax } from '@/lib/osrs-math';
import { useMarketData } from '@/hooks/use-osrs-query';
import { Loader2, ArrowLeft, Crown, TrendingUp, TrendingDown, ChevronDown, ChevronUp, ExternalLink, Clock, Crosshair, Target, BarChart2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatGP } from '@/lib/osrs-math';
import { cn } from '@/lib/utils';
import PriceActionChart from '@/components/dashboard/PriceActionChart';
import { useSignalEngine, SignalConfig } from '@/hooks/use-signal-engine';
import { useSignalSettings } from '@/contexts/useSignalSettings';

const formatTimeAgo = (timestamp: number): string => {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const StatCard = ({ label, value, subValue, icon: Icon, color = 'default' }: {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: any;
  color?: 'default' | 'green' | 'red' | 'blue' | 'amber';
}) => {
  const colorClasses = {
    default: 'text-white',
    green: 'text-emerald-400',
    red: 'text-rose-500',
    blue: 'text-blue-400',
    amber: 'text-amber-500',
  };

  const bgClasses = {
    default: 'bg-white/5',
    green: 'bg-emerald-500/10 border-emerald-500/10',
    red: 'bg-rose-500/10 border-rose-500/10',
    blue: 'bg-blue-500/10 border-blue-500/10',
    amber: 'bg-amber-500/10 border-amber-500/10',
  };

  return (
    <div className={cn("premium-card p-6 flex flex-col justify-between h-full transition-all hover:scale-[1.02]", bgClasses[color])}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</span>
        {Icon && <Icon size={14} className="text-slate-600" />}
      </div>
      <div className="space-y-1">
        <div className={cn("text-2xl font-black font-mono tracking-tighter", colorClasses[color])}>
          {typeof value === 'number' ? formatGP(value) : value}
        </div>
        {subValue && (
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{subValue}</div>
        )}
      </div>
    </div>
  );
};

const CompactSignal = ({ itemId }: { itemId: number }) => {
  const { settings } = useSignalSettings();
  const config: SignalConfig = {
    riskProfile: settings.riskLevel,
    flipIntervalMinutes: settings.frequencyMinutes
  };
  const signal = useSignalEngine(itemId, config);

  if (signal.isLoading) {
    return (
      <div className="premium-card p-6 flex items-center justify-center bg-white/5 animate-pulse">
        <Loader2 className="animate-spin text-slate-500" size={24} />
      </div>
    );
  }

  const isBuy = signal.action === 'BUY' || signal.action === 'ACCUMULATE';
  const isSell = signal.action === 'SELL';

  return (
    <div className={cn(
      "premium-card p-6 flex flex-col justify-between border-l-4 transition-all hover:scale-[1.02]",
      isBuy ? "border-emerald-500 bg-emerald-500/[0.03]" :
        isSell ? "border-rose-500 bg-rose-500/[0.03]" :
          "border-amber-500 bg-amber-500/[0.03]"
    )}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Signal Engine</span>
        <Target size={14} className={isBuy ? "text-emerald-500" : isSell ? "text-rose-500" : "text-amber-500"} />
      </div>
      <div className="space-y-4">
        <div>
          <div className={cn(
            "text-3xl font-black tracking-tighter uppercase",
            isBuy ? "text-emerald-400" : isSell ? "text-rose-400" : "text-amber-400"
          )}>
            {signal.action}
          </div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
            {signal.confidence}% System Confidence
          </div>
        </div>

        {signal.prices.buyAt > 0 && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-600 uppercase">Entry</span>
              <div className="text-xs font-mono font-bold text-white">{formatGP(signal.prices.buyAt)}</div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-600 uppercase">Exit</span>
              <div className="text-xs font-mono font-bold text-white">{formatGP(signal.prices.sellAt)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ItemDetails = () => {
  const { id } = useParams<{ id: string }>();
  const itemId = id ? parseInt(id) : 12934;
  const [showDetails, setShowDetails] = useState(false);

  const { items, prices, stats, isLoading } = useMarketData(60000);

  const selectedItem = items.find(i => i.id === itemId);
  const selectedPrice = prices[itemId];
  const selectedStats = stats[itemId];

  if (!selectedItem || !selectedPrice || !selectedStats) {
    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-emerald-500" /></div>;
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-600">
          <Target size={32} className="opacity-20" />
        </div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Signal sequence lost</p>
        <Link to="/"><Button variant="outline" className="rounded-xl border-white/10 text-slate-400">Return to Terminal</Button></Link>
      </div>
    );
  }

  const { net, roi } = calculateMargin(selectedPrice.low, selectedPrice.high);
  const tax = calculateTax(selectedPrice.high);
  const volume = selectedStats.highPriceVolume + selectedStats.lowPriceVolume;
  const limit = selectedItem.limit || 0;
  const potentialProfit = net * limit;

  const avgPrice = selectedStats?.avgHighPrice || selectedPrice.high;
  const priceChange = selectedPrice.high - avgPrice;
  const priceChangePercent = avgPrice > 0 ? ((priceChange / avgPrice) * 100) : 0;
  const isPositiveChange = priceChange >= 0;

  const wikiUrl = `https://oldschool.runescape.wiki/w/${encodeURIComponent(selectedItem.name.replace(/ /g, '_'))}`;

  return (
    <div className="space-y-8 animate-page-enter">
      {/* Advanced Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-8 border-b border-white/5">
        <div className="flex items-center gap-6">
          <Link to="/" className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-emerald-400 hover:border-emerald-500/20 transition-all group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </Link>

          <div className="flex items-center gap-6">
            <div className="relative group/icon">
              <div className="absolute -inset-4 bg-emerald-500/10 rounded-full blur opacity-0 group-hover/icon:opacity-100 transition duration-1000" />
              <div className="relative w-20 h-20 bg-slate-950 rounded-3xl flex items-center justify-center border border-white/5 shadow-2xl overflow-hidden group-hover:scale-105 transition-transform">
                <img
                  src={`https://static.runelite.net/cache/item/icon/${selectedItem.id}.png`}
                  alt={selectedItem.name}
                  className="w-12 h-12 object-contain"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase">{selectedItem.name}</h1>
                {selectedItem.members && (
                  <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md">
                    <Crown size={12} className="text-amber-500" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-black text-emerald-400 font-mono tracking-tighter">
                    {formatGP(selectedPrice.high)}
                  </span>
                  <span className={cn(
                    "flex items-center gap-1 text-xs font-black font-mono",
                    isPositiveChange ? 'text-rose-500' : 'text-emerald-500'
                  )}>
                    {isPositiveChange ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                    {Math.abs(priceChangePercent).toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <Clock size={12} />
                  Last sync {formatTimeAgo(selectedPrice.highTime)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" className="h-12 px-6 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:text-white font-black uppercase tracking-widest text-[10px]">
            <a href={wikiUrl} target="_blank" rel="noopener noreferrer">
              OSRS Wiki <ExternalLink size={14} className="ml-2 opacity-50" />
            </a>
          </Button>
          <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">Live Intel</span>
          </div>
        </div>
      </div>

      {/* Analytics Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 premium-card p-6 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <BarChart2 size={20} className="text-slate-500" />
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Price Action Terminal</h2>
            </div>
            <div className="flex gap-2">
              <div className="h-2 w-12 bg-emerald-500/20 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-emerald-500" />
              </div>
            </div>
          </div>
          <div className="h-[450px]">
            <PriceActionChart
              itemId={itemId}
              latestHigh={selectedPrice.high}
              latestLow={selectedPrice.low}
            />
          </div>
        </div>

        <div className="space-y-8">
          <CompactSignal itemId={itemId} />

          <div className="premium-card p-6 bg-slate-900/40">
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={14} className="text-amber-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Efficiency Metrics</span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-600 uppercase">Tax Allocation</span>
                  <span className="text-xs font-mono font-bold text-rose-500">-{formatGP(tax)}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-600 uppercase">Limit Exposure</span>
                  <span className="text-xs font-mono font-bold text-white">{formatGP(selectedPrice.low * limit)}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-600 uppercase">24h Volatility</span>
                  <span className="text-xs font-mono font-bold text-amber-500">{calculateVolatility(selectedPrice.high, selectedPrice.low).toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Intelligence Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard
          label="Optimal Entry"
          value={selectedPrice.low}
          color="blue"
          icon={ArrowLeft}
        />
        <StatCard
          label="Optimal Exit"
          value={selectedPrice.high}
          color="green"
          icon={ExternalLink}
        />
        <StatCard
          label="Net Alpha"
          value={`${net >= 0 ? '+' : ''}${formatGP(net)}`}
          subValue={`${roi.toFixed(2)}% Real ROI`}
          color={net >= 0 ? 'green' : 'red'}
          icon={TrendingUp}
        />
        <StatCard
          label="Profit Potential"
          value={potentialProfit}
          subValue={`Full ${limit.toLocaleString()} Limit`}
          color={potentialProfit > 0 ? 'amber' : 'default'}
          icon={Zap}
        />
      </div>

      {/* Deep Analysis Collapsible */}
      <div className="pt-8">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full premium-card p-6 border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.02] flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <ChevronDown size={20} className={cn("text-slate-500 transition-transform duration-500", showDetails && "rotate-180")} />
            </div>
            <div className="text-left">
              <span className="block text-sm font-black text-white uppercase tracking-widest">Extended Data Warehouse</span>
              <span className="block text-[10px] font-medium text-slate-500">Access deep market fundamentals and historic metadata</span>
            </div>
          </div>
        </button>

        {showDetails && (
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-8 premium-card p-8 bg-white/[0.01] animate-page-enter">
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Market Liquidity (24h)</p>
              <p className="font-black text-white text-xl tracking-tighter font-mono">{volume.toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Asset ID</p>
              <p className="font-black text-white text-xl tracking-tighter font-mono">#{selectedItem.id}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">High Alch Value</p>
              <p className="font-black text-slate-300 text-xl tracking-tighter font-mono">{selectedItem.highalch ? formatGP(selectedItem.highalch) : '—'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Exchange Limit</p>
              <p className="font-black text-amber-500 text-xl tracking-tighter font-mono">{limit.toLocaleString() || '—'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Median Benchmark High</p>
              <p className="font-black text-slate-300 text-xl tracking-tighter font-mono">{formatGP(selectedStats.avgHighPrice)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Median Benchmark Low</p>
              <p className="font-black text-slate-300 text-xl tracking-tighter font-mono">{formatGP(selectedStats.avgLowPrice)}</p>
            </div>
          </div>
        )}
      </div>
      <div className="h-20" />
    </div>
  );
};

export default ItemDetails;