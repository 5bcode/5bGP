import { useNavigate } from 'react-router-dom';
import { useMarketData } from '../hooks/useMarketData';
import { Card } from '../components/ui/Card';
import { MiniTable } from '../components/dashboard/MiniTable';
import { FaMoneyBillWave, FaFire, FaWandMagicSparkles, FaArrowTrendUp } from 'react-icons/fa6';
import { formatNumber } from '../utils/analysis';

export function Dashboard() {
  const navigate = useNavigate();
  const { items, isLoading, error } = useMarketData();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <div className="w-10 h-10 border-4 border-zinc-800 border-t-gold rounded-full animate-spin"></div>
        <p className="text-muted animate-pulse">Loading market data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
        <h3 className="font-bold mb-2">Error Loading Data</h3>
        <p>{(error as Error).message}</p>
      </div>
    );
  }

  // --- Filtering Logic (Ported from ui.js) ---

  // 1. Largest Margins (Profit > 0)
  const topMargins = [...items]
    .filter(i => i.margin > 0)
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 8);

  // 2. High Volume Profit (Volume > 100, sorted by score or volume)
  // Note: Since volume is 0 currently, this might be empty. 
  // We'll filter > -1 just to show something if volume is missing, or mocked.
  // Ideally we use score, but calculating score required volume.
  // Fallback: Sort by margin for now if volume is missing
  const highVol = [...items]
    .sort((a, b) => (b.score || 0) - (a.score || 0)) // if score 0, stability
    .slice(0, 8);

  // 3. Profitable Alchs
  const topAlchs = [...items]
    .filter(i => (i.alchProfit || 0) > 0)
    .sort((a, b) => (b.alchProfit || 0) - (a.alchProfit || 0))
    .slice(0, 8);

  // 4. Top Gainers
  // We don't have price1h yet in the simple /latest fetch.
  // We'll placeholder this with "Highest ROI" for now until we add timeseries fetching.
  const topROI = [...items]
    .filter(i => i.volume > 0 || true) // bypass volume filter for now
    .filter(i => i.buyPrice > 1000) // filter junk
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 8);


  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Market Dashboard</h1>
        <p className="text-secondary text-sm">Real-time opportunities from the Grand Exchange.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6 pb-10">

        <Card
          title="Largest Margins"
          icon={<FaMoneyBillWave />}
          action={() => navigate('/screener?sort=margin')}
          className="h-[420px]"
        >
          <MiniTable
            items={topMargins}
            valueLabel="Margin"
            valueKey="margin"
            valueFormatter={(val) => `+${formatNumber(val)}`}
            onItemClick={(id) => navigate(`/item/${id}`)}
          />
        </Card>

        {/* Card 2: High Volume (using Score) */}
        <Card
          title="High Volume Profit"
          icon={<FaFire />}
          action={() => navigate('/screener?sort=score')}
          className="h-[420px]"
        >
          <MiniTable
            items={highVol}
            valueLabel="Score"
            valueKey="score"
            valueFormatter={(val) => (val || 0).toFixed(1)}
            onItemClick={(id) => navigate(`/item/${id}`)}
          />
        </Card>

        {/* Card 3: Profitable Alchs */}
        <Card
          title="Profitable Alchs"
          icon={<FaWandMagicSparkles />}
          action={() => navigate('/screener?preset=alch')}
          className="h-[420px]"
        >
          <MiniTable
            items={topAlchs}
            valueLabel="Profit"
            valueKey="alchProfit"
            valueFormatter={(val) => `+${formatNumber(val)}`}
            onItemClick={(id) => navigate(`/item/${id}`)}
          />
        </Card>

        {/* Card 4: Top ROI (replacing gainers for now) */}
        <Card
          title="Highest ROI"
          icon={<FaArrowTrendUp />}
          action={() => navigate('/screener?sort=roi')}
          className="h-[420px]"
        >
          <MiniTable
            items={topROI}
            valueLabel="ROI"
            valueKey="roi"
            valueFormatter={(val) => `${val.toFixed(2)}%`}
            onItemClick={(id) => navigate(`/item/${id}`)}
          />
        </Card>

      </div>
    </div>
  );
} 
