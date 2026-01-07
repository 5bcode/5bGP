import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { calculateMargin, calculateVolatility, calculateTax } from '@/lib/osrs-math';
import { useMarketData } from '@/hooks/use-osrs-query';
import { Loader2, ArrowLeft, Crown, TrendingUp, TrendingDown, ChevronDown, ChevronUp, ExternalLink, Clock, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatGP } from '@/lib/osrs-math';

import PriceActionChart from '@/components/dashboard/PriceActionChart';
import { useSignalEngine, SignalConfig } from '@/hooks/use-signal-engine';
import { useSignalSettings } from '@/contexts/useSignalSettings';

// Format relative time
const formatTimeAgo = (timestamp: number): string => {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// Stat Card Component
const StatCard = ({ label, value, subValue, color = 'default' }: {
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'default' | 'green' | 'red' | 'blue' | 'amber';
}) => {
  const colorClasses = {
    default: 'text-slate-100',
    green: 'text-emerald-400',
    red: 'text-rose-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 text-center">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className={`text-lg font-mono font-bold ${colorClasses[color]}`}>
        {typeof value === 'number' ? formatGP(value) : value}
      </p>
      {subValue && (
        <p className="text-[10px] text-slate-500 mt-0.5">{subValue}</p>
      )}
    </div>
  );
};

// Compact Signal Display
const CompactSignal = ({ itemId }: { itemId: number }) => {
  const { settings } = useSignalSettings();
  const config: SignalConfig = {
    riskProfile: settings.riskLevel,
    flipIntervalMinutes: settings.frequencyMinutes
  };
  const signal = useSignalEngine(itemId, config);

  const getActionColor = () => {
    if (signal.action === 'BUY' || signal.action === 'ACCUMULATE') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (signal.action === 'SELL') return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  };

  if (signal.isLoading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-500" size={16} />
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-4 border ${getActionColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair size={14} className="text-blue-400" />
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Signal</span>
        </div>
        <span className="text-xs font-mono text-slate-500">{signal.confidence}% conf</span>
      </div>
      <div className="text-xl font-black mt-1">{signal.action}</div>
      {signal.prices.buyAt > 0 && (
        <div className="flex gap-2 mt-2 text-[10px]">
          <span className="text-emerald-400">Buy: {formatGP(signal.prices.buyAt)}</span>
          <span className="text-slate-600">|</span>
          <span className="text-rose-400">Sell: {formatGP(signal.prices.sellAt)}</span>
        </div>
      )}
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
    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <p className="text-slate-500">Item data not found.</p>
        <Link to="/"><Button>Back to Dashboard</Button></Link>
      </div>
    );
  }

  const { net, roi } = calculateMargin(selectedPrice.low, selectedPrice.high);
  const tax = calculateTax(selectedPrice.high);
  const volume = selectedStats.highPriceVolume + selectedStats.lowPriceVolume;
  const limit = selectedItem.limit || 0;
  const potentialProfit = net * limit;

  // Calculate price change
  const avgPrice = selectedStats?.avgHighPrice || selectedPrice.high;
  const priceChange = selectedPrice.high - avgPrice;
  const priceChangePercent = avgPrice > 0 ? ((priceChange / avgPrice) * 100) : 0;
  const isPositiveChange = priceChange >= 0;

  // Wiki URL
  const wikiUrl = `https://oldschool.runescape.wiki/w/${encodeURIComponent(selectedItem.name.replace(/ /g, '_'))}`;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-3 lg:px-6 lg:py-4">
      {/* Slim Header Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-slate-500 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700/50 overflow-hidden">
              <img
                src={`https://static.runelite.net/cache/item/icon/${selectedItem.id}.png`}
                alt={selectedItem.name}
                className="w-7 h-7 object-contain"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-100">{selectedItem.name}</h1>
                {selectedItem.members && (
                  <Crown size={12} className="text-amber-400" />
                )}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-mono font-bold text-emerald-400">
                  {formatGP(selectedPrice.high)}
                </span>
                <span className={`font-mono text-xs flex items-center gap-1 ${isPositiveChange ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isPositiveChange ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                  {priceChangePercent.toFixed(2)}%
                </span>
                <span className="text-slate-500 text-xs">
                  {formatTimeAgo(selectedPrice.highTime)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <a
          href={wikiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
        >
          Wiki <ExternalLink size={10} />
        </a>
      </div>

      {/* Full Width Chart */}
      <div className="h-[400px] lg:h-[450px] mb-4">
        <PriceActionChart
          itemId={itemId}
          latestHigh={selectedPrice.high}
          latestLow={selectedPrice.low}
        />
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <StatCard
          label="Buy Price"
          value={selectedPrice.low}
          color="blue"
        />
        <StatCard
          label="Sell Price"
          value={selectedPrice.high}
          color="green"
        />
        <StatCard
          label="Margin"
          value={`${net >= 0 ? '+' : ''}${formatGP(net)}`}
          subValue={`${roi.toFixed(2)}% ROI`}
          color={net >= 0 ? 'green' : 'red'}
        />
        <StatCard
          label="Potential"
          value={potentialProfit}
          subValue={`${limit} limit`}
          color={potentialProfit > 0 ? 'green' : 'default'}
        />

        {/* Compact Signal - Takes last slot */}
        <CompactSignal itemId={itemId} />
      </div>

      {/* Collapsible Details Section */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full flex items-center justify-between bg-slate-900/30 hover:bg-slate-900/50 border border-slate-800/50 rounded-xl px-4 py-3 transition-colors"
      >
        <span className="text-sm font-medium text-slate-400">More Details</span>
        {showDetails ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
      </button>

      {showDetails && (
        <div className="mt-3 bg-slate-900/30 border border-slate-800/50 rounded-xl p-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Volume (24h)</p>
              <p className="font-mono text-slate-200">{volume.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">GE Limit</p>
              <p className="font-mono text-amber-400">{limit || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Tax</p>
              <p className="font-mono text-slate-200">{formatGP(tax)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Cost per Limit</p>
              <p className="font-mono text-slate-200">{formatGP(selectedPrice.low * limit)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Avg High (24h)</p>
              <p className="font-mono text-slate-200">{formatGP(selectedStats.avgHighPrice)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Avg Low (24h)</p>
              <p className="font-mono text-slate-200">{formatGP(selectedStats.avgLowPrice)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">High Alch</p>
              <p className="font-mono text-slate-200">{selectedItem.highalch ? formatGP(selectedItem.highalch) : '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Members</p>
              <p className={`font-mono ${selectedItem.members ? 'text-amber-400' : 'text-slate-200'}`}>
                {selectedItem.members ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemDetails;