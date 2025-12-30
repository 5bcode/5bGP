import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Item, PriceData, TimeSeriesPoint } from '@/services/osrs-api';
import { calculateMargin, calculateVolatility } from '@/lib/osrs-math';
import { useMarketData } from '@/hooks/use-osrs-query';
import { useWatchlist } from '@/hooks/use-watchlist';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Stitch Components
import ItemHeader from '@/components/dashboard/ItemHeader';
import VolumeCard from '@/components/dashboard/VolumeCard';
import PriceActionChart from '@/components/dashboard/PriceActionChart';
import { SmartAnalysis, AlgorithmicForecast, ArbitrageCheck } from '@/components/dashboard/AnalysisWidgets';

const ItemDetails = () => {
  const { id } = useParams<{ id: string }>();
  const itemId = id ? parseInt(id) : 12934; // Default to Zulrah Scale if missing

  const { items, prices, stats, isLoading } = useMarketData(60000);
  const { addToWatchlist } = useWatchlist(items);

  const [chartData, setChartData] = useState<TimeSeriesPoint[]>([]);

  // Fetch timeseries for the chart
  useEffect(() => {
    const fetchChart = async () => {
      if (!itemId) return;
      try {
        const { osrsApi } = await import('@/services/osrs-api');
        const data = await osrsApi.getTimeseries(itemId, '1h');
        setChartData(data);
      } catch (e) {
        console.error("Failed to fetch chart", e);
      }
    };
    fetchChart();
  }, [itemId]);

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[220px]">
            <ItemHeader
              item={selectedItem}
              price={selectedPrice}
              netProfit={net}
              volatility={volatility}
            />
            <VolumeCard stats={selectedStats} />
          </div>

          {/* 2. Main Price Chart */}
          <div className="flex-1 min-h-[400px]">
            <PriceActionChart data={chartData} />
          </div>
        </div>

        {/* RIGHT COLUMN: Analysis Widgets (Span 1) */}
        <div className="flex flex-col gap-4">
          <div className="h-[200px]">
            <SmartAnalysis item={selectedItem} price={selectedPrice} />
          </div>
          <div className="h-[200px]">
            <AlgorithmicForecast />
          </div>
          <div className="flex-1">
            <MarginAnalysisChart price={selectedPrice} net={net} />
          </div>
          <div className="min-h-[150px]">
            <ArbitrageCheck item={selectedItem} price={selectedPrice} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Quick Subcomponent for Margin Bar Chart
const MarginAnalysisChart = ({ price, net }: { price: PriceData, net: number }) => {
  return (
    <Card className="p-5 bg-slate-900 border-slate-800 h-full flex flex-col">
      <h4 className="text-slate-200 font-semibold mb-4">Margin Analysis</h4>
      <div className="flex-1 flex items-end gap-2 justify-center pb-4">
        {/* Visual Bar Representation */}
        <div className="w-12 bg-slate-800 h-[60%] rounded-t relative group">
          <div className="absolute -top-6 text-xs text-slate-400 w-full text-center">Buy</div>
        </div>
        <div className="w-12 bg-rose-500/50 h-[10%] rounded-t relative">
          <div className="absolute -top-6 text-xs text-rose-400 w-full text-center">Tax</div>
        </div>
        <div className="w-12 bg-emerald-500 h-[30%] rounded-t relative animate-in slide-in-from-bottom duration-700">
          <div className="absolute -top-6 text-xs text-emerald-400 w-full text-center font-bold">Net</div>
        </div>
      </div>
      <div className="text-center text-xs text-slate-500">
        Potential Profit: <span className="text-emerald-400 font-mono">{net} GP</span>
      </div>
    </Card>
  )
}

export default ItemDetails;