import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { calculateMargin, calculateVolatility } from '@/lib/osrs-math';
import { useMarketData } from '@/hooks/use-osrs-query';
import { useWatchlist } from '@/hooks/use-watchlist';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Stitch Components
import ItemHeader from '@/components/dashboard/ItemHeader';
import VolumeCard from '@/components/dashboard/VolumeCard';
import PriceActionChart from '@/components/dashboard/PriceActionChart';
import SignalWidget from '@/components/dashboard/SignalWidget';
// Support existing widgets if needed, but SignalWidget replaces the main decision ones
import { ArbitrageCheck, MarginBreakdown } from '@/components/dashboard/AnalysisWidgets';

const ItemDetails = () => {
  const { id } = useParams<{ id: string }>();
  const itemId = id ? parseInt(id) : 12934; // Default to Zulrah Scale if missing

  const { items, prices, stats, isLoading } = useMarketData(60000);

  // We don't strictly need useWatchlist here unless we add a button, but keeping for consistency
  const { addToWatchlist } = useWatchlist(items);

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

  return (
    <div className="min-h-screen bg-slate-950 p-4 lg:p-6 space-y-4">
      <Link to="/" className="inline-flex items-center text-slate-400 hover:text-white mb-4 transition-colors">
        <ArrowLeft size={16} className="mr-2" /> Back to Market
      </Link>

      {/* --- STITCH LAYOUT GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* LEFT COLUMN: Header & Chart (Span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* 1. Header & Quick Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ItemHeader
              item={selectedItem}
              price={selectedPrice}
              netProfit={net}
              volatility={volatility}
            />
            <VolumeCard stats={selectedStats} />
          </div>

          {/* 2. Main Price Chart */}
          <div className="flex-1 min-h-[550px]">
            <PriceActionChart
              itemId={itemId}
              latestHigh={selectedPrice.high}
              latestLow={selectedPrice.low}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Analysis Widgets (Span 1) */}
        <div className="flex flex-col gap-4">
          {/* NEW: Smart Signal Engine Widget */}
          <SignalWidget itemId={itemId} />

          <MarginBreakdown price={selectedPrice} />
          <ArbitrageCheck item={selectedItem} price={selectedPrice} />
        </div>
      </div>
    </div>
  );
};

export default ItemDetails;