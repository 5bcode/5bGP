import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { calculateMargin, calculateVolatility } from '@/lib/osrs-math';
import { useMarketData } from '@/hooks/use-osrs-query';
import { Loader2, ArrowLeft, Crown, Heart, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatGP } from '@/lib/osrs-math';

// Stitch Components
import PriceActionChart from '@/components/dashboard/PriceActionChart';
import SignalWidget from '@/components/dashboard/SignalWidget';
import { MarginBreakdown } from '@/components/dashboard/AnalysisWidgets';
import KeyInfoPanel from '@/components/dashboard/KeyInfoPanel';
import MoreInfoPanel from '@/components/dashboard/MoreInfoPanel';

const ItemDetails = () => {
  const { id } = useParams<{ id: string }>();
  const itemId = id ? parseInt(id) : 12934;

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

  const { net } = calculateMargin(selectedPrice.low, selectedPrice.high);
  const volatility = calculateVolatility(selectedPrice.high, selectedPrice.low);

  // Calculate price change for display
  const avgPrice = selectedStats?.avgHighPrice || selectedPrice.high;
  const priceChange = selectedPrice.high - avgPrice;
  const priceChangePercent = avgPrice > 0 ? ((priceChange / avgPrice) * 100) : 0;
  const isPositiveChange = priceChange >= 0;

  return (
    <div className="min-h-screen bg-slate-950 px-3 py-2 lg:px-4 lg:py-3">
      {/* Back Link - Compact */}
      <Link to="/" className="inline-flex items-center text-xs text-slate-500 hover:text-white mb-2 transition-colors">
        <ArrowLeft size={12} className="mr-1" /> Back
      </Link>

      {/* Main Grid - Tighter spacing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

        {/* LEFT: Chart Area (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-3">

          {/* Item Header - Compact inline */}
          <div className="bg-slate-900 border border-slate-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Item Icon */}
                <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700/50 overflow-hidden">
                  <img
                    src={`https://static.runelite.net/cache/item/icon/${selectedItem.id}.png`}
                    alt={selectedItem.name}
                    className="w-8 h-8 object-contain"
                  />
                </div>

                {/* Item Name & Price */}
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold text-slate-100">{selectedItem.name}</h1>
                    {selectedItem.members && (
                      <Heart size={14} className="text-emerald-400 fill-emerald-400" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-3 mt-0.5">
                    <span className="text-2xl font-mono font-bold text-emerald-400">
                      {formatGP(selectedPrice.high)}
                    </span>
                    <span className={`text-sm font-mono flex items-center gap-1 ${isPositiveChange ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isPositiveChange ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                      {formatGP(Math.abs(priceChange))} {priceChangePercent !== 0 && `${isPositiveChange ? '+' : ''}${priceChangePercent.toFixed(2)}%`} 1D
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Last traded {new Date(selectedPrice.highTime * 1000).toLocaleTimeString()} ago
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Chart - Full Height */}
          <div className="flex-1 min-h-[400px] lg:min-h-[500px]">
            <PriceActionChart
              itemId={itemId}
              latestHigh={selectedPrice.high}
              latestLow={selectedPrice.low}
            />
          </div>

          {/* Key Info Panel */}
          <KeyInfoPanel
            price={selectedPrice}
            stats={selectedStats}
            item={selectedItem}
          />

          {/* More Info Panel */}
          <MoreInfoPanel
            price={selectedPrice}
            stats={selectedStats}
            item={selectedItem}
          />
        </div>

        {/* RIGHT: Analysis Sidebar (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <SignalWidget itemId={itemId} />
          <MarginBreakdown price={selectedPrice} />
        </div>
      </div>
    </div>
  );
};

export default ItemDetails;