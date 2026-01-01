import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { calculateMargin, calculateVolatility } from '@/lib/osrs-math';
import { useMarketData } from '@/hooks/use-osrs-query';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Stitch Components
import ItemHeader from '@/components/dashboard/ItemHeader';
import VolumeCard from '@/components/dashboard/VolumeCard';
import PriceActionChart from '@/components/dashboard/PriceActionChart';
import SignalWidget from '@/components/dashboard/SignalWidget';
import { MarginBreakdown } from '@/components/dashboard/AnalysisWidgets';

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
          {/* Header Row - Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ItemHeader
              item={selectedItem}
              price={selectedPrice}
              netProfit={net}
              volatility={volatility}
            />
            <VolumeCard stats={selectedStats} />
          </div>

          {/* Chart - Full Height */}
          <div className="flex-1 min-h-[400px] lg:min-h-[500px]">
            <PriceActionChart
              itemId={itemId}
              latestHigh={selectedPrice.high}
              latestLow={selectedPrice.low}
            />
          </div>
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