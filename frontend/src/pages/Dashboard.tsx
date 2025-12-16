import { useNavigate } from 'react-router-dom';
import { useMarketData } from '../hooks/useMarketData';
import { Card } from '../components/ui/Card';
import { MiniTable } from '../components/dashboard/MiniTable';
import { FaMoneyBillWave, FaWandMagicSparkles, FaArrowTrendUp, FaFireFlameCurved, FaArrowTrendDown, FaBolt, FaSkullCrossbones, FaClock } from 'react-icons/fa6';
import { formatNumber, isWithinTime } from '../utils/analysis';
import type { TrendSignal } from '../utils/analysis';
import { useMemo } from 'react';
import clsx from 'clsx';

// Only show items traded within this many minutes
const RECENCY_THRESHOLD_MINS = 10;

// Simple Flipper Score calculation (matches Screener)
function estimateFlipperScore(roi: number, margin: number, potentialProfit: number, limit: number, volume: number): number {
  const roiScore = Math.min(100, Math.max(0, roi * 10));
  const marginScore = Math.min(100, Math.max(0, (margin / 10000) * 100));
  const profitScore = Math.min(100, Math.max(0, (potentialProfit / 500000) * 100));
  const volumeScore = Math.min(100, Math.max(0, (volume / 100) * 100));
  const limitBonus = limit >= 100 && limit <= 10000 ? 10 : 0;

  const score = (roiScore * 0.25) + (marginScore * 0.25) + (profitScore * 0.20) + (volumeScore * 0.30);
  return Math.min(100, score + limitBonus);
}

// Trend config
const TREND_CONFIG: Record<TrendSignal, { color: string; label: string }> = {
  pump: { color: 'text-green', label: '↑' },
  dump: { color: 'text-red', label: '↓' },
  volatile: { color: 'text-gold', label: '⚡' },
  stable: { color: 'text-muted', label: '' },
};

export function Dashboard() {
  const navigate = useNavigate();
  const { items, isLoading, error, hasVolumeData } = useMarketData();

  // Filter to only recently traded items (within 10 minutes)
  const recentItems = useMemo(() => {
    return items.filter(item =>
      isWithinTime(item.lastBuyAgo, RECENCY_THRESHOLD_MINS) &&
      isWithinTime(item.lastSellAgo, RECENCY_THRESHOLD_MINS)
    );
  }, [items]);

  // Add flipper scores to recent items
  const itemsWithScores = useMemo(() => {
    return recentItems.map(item => ({
      ...item,
      flipperScore: estimateFlipperScore(item.roi, item.margin, item.potentialProfit, item.limit || 0, item.volume)
    }));
  }, [recentItems]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <div className="w-10 h-10 border-4 border-zinc-800 border-t-gold rounded-full animate-spin"></div>
        <p className="text-muted animate-pulse">Loading market data with volume...</p>
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

  // --- Filtering Logic (all based on recently traded items) ---

  // 1. Top Flipper Picks (sorted by Flipper Score)
  const topFlipperPicks = [...itemsWithScores]
    .filter(i => i.margin > 0)
    .sort((a, b) => (b.flipperScore || 0) - (a.flipperScore || 0))
    .slice(0, 8);

  // 2. DUMP ALERTS - Items with high volume + decreasing prices
  const dumpAlerts = [...recentItems]
    .filter(i => i.trendSignal === 'dump')
    .sort((a, b) => a.priceChange - b.priceChange) // Most negative first
    .slice(0, 8);

  // 3. PUMP ALERTS - Items with high volume + increasing prices
  const pumpAlerts = [...recentItems]
    .filter(i => i.trendSignal === 'pump')
    .sort((a, b) => b.priceChange - a.priceChange) // Most positive first
    .slice(0, 8);

  // 4. HOT / Volatile Items
  const hotItems = [...recentItems]
    .filter(i => i.trendSignal === 'volatile' || i.volume > 50)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 8);

  // 5. Largest Margins
  const topMargins = [...recentItems]
    .filter(i => i.margin > 0)
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 8);

  // 6. Profitable Alchs
  const topAlchs = [...recentItems]
    .filter(i => (i.alchProfit || 0) > 0)
    .sort((a, b) => (b.alchProfit || 0) - (a.alchProfit || 0))
    .slice(0, 8);

  // Helper for score colors
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green';
    if (score >= 50) return 'text-gold';
    if (score >= 30) return 'text-yellow-400';
    return 'text-muted';
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Market Highlights</h1>
          <p className="text-secondary text-sm flex items-center gap-2">
            <FaClock className="text-gold" />
            Items traded within last {RECENCY_THRESHOLD_MINS} minutes
            {hasVolumeData && (
              <span className="text-green text-xs">● Live</span>
            )}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted font-mono">
            Active: <span className="text-gold font-bold">{recentItems.length}</span> items
          </div>
          <div className="text-[10px] text-muted">
            of {items.length} total
          </div>
        </div>
      </header>

      {/* Alert Counts */}
      {hasVolumeData && (dumpAlerts.length > 0 || pumpAlerts.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {dumpAlerts.length > 0 && (
            <button
              onClick={() => navigate('/screener?preset=active_flips')}
              className="flex items-center gap-2 px-4 py-2 bg-red/10 border border-red/30 rounded-lg text-red hover:bg-red/20 transition-colors"
            >
              <FaArrowTrendDown />
              <span className="font-bold">{dumpAlerts.length}</span>
              <span className="text-sm">dumping</span>
            </button>
          )}
          {pumpAlerts.length > 0 && (
            <button
              onClick={() => navigate('/screener?preset=active_flips')}
              className="flex items-center gap-2 px-4 py-2 bg-green/10 border border-green/30 rounded-lg text-green hover:bg-green/20 transition-colors"
            >
              <FaArrowTrendUp />
              <span className="font-bold">{pumpAlerts.length}</span>
              <span className="text-sm">pumping</span>
            </button>
          )}
          <button
            onClick={() => navigate('/screener?preset=active_flips')}
            className="flex items-center gap-2 px-4 py-2 bg-gold/10 border border-gold/30 rounded-lg text-gold hover:bg-gold/20 transition-colors"
          >
            <FaBolt />
            <span className="font-bold">{recentItems.length}</span>
            <span className="text-sm">active items</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">

        {/* Card 1: DUMP ALERTS */}
        {dumpAlerts.length > 0 ? (
          <Card
            title="🚨 Dump Alerts"
            icon={<FaSkullCrossbones className="text-red" />}
            action={() => navigate('/screener?dumps=true')}
            className="h-[420px] ring-1 ring-red/30 bg-gradient-to-br from-card to-red/5"
          >
            <div className="space-y-1">
              {dumpAlerts.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="flex items-center justify-between px-2 py-2 hover:bg-red/10 rounded-lg cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.icon && (
                      <img
                        src={`https://oldschool.runescape.wiki/images/${item.icon.replace(/ /g, '_')}`}
                        className="w-6 h-6 object-contain flex-shrink-0"
                        alt=""
                      />
                    )}
                    <span className="text-sm text-primary truncate group-hover:text-red transition-colors">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted font-mono">
                      Vol: {formatNumber(item.volume)}
                    </span>
                    <span className="text-sm font-mono font-bold text-red">
                      {item.priceChange.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card
            title="Dump Alerts"
            icon={<FaSkullCrossbones className="text-muted" />}
            className="h-[420px]"
          >
            <div className="flex flex-col items-center justify-center h-full text-muted text-sm">
              <FaSkullCrossbones className="text-3xl mb-3 opacity-30" />
              <p>No dumps detected</p>
              <p className="text-xs mt-1">Market is stable</p>
            </div>
          </Card>
        )}

        {/* Card 2: TOP FLIPPER PICKS */}
        <Card
          title="Top Flipper Picks"
          icon={<FaFireFlameCurved className="text-gold" />}
          action={() => navigate('/screener?preset=active_flips')}
          className="h-[420px] ring-1 ring-gold/20 bg-gradient-to-br from-card to-gold/5"
        >
          {topFlipperPicks.length > 0 ? (
            <div className="space-y-1">
              {topFlipperPicks.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="flex items-center justify-between px-2 py-2 hover:bg-hover rounded-lg cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.icon && (
                      <img
                        src={`https://oldschool.runescape.wiki/images/${item.icon.replace(/ /g, '_')}`}
                        className="w-6 h-6 object-contain flex-shrink-0"
                        alt=""
                      />
                    )}
                    <span className="text-sm text-primary truncate group-hover:text-gold transition-colors">
                      {item.name}
                    </span>
                    {item.trendSignal !== 'stable' && (
                      <span className={clsx("text-[10px]", TREND_CONFIG[item.trendSignal].color)}>
                        {TREND_CONFIG[item.trendSignal].label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted font-mono">
                      +{formatNumber(item.margin)}
                    </span>
                    <span className={clsx(
                      "text-sm font-mono font-bold flex items-center gap-1",
                      getScoreColor(item.flipperScore || 0)
                    )}>
                      <FaFireFlameCurved className="text-[10px]" />
                      {Math.round(item.flipperScore || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted text-sm">
              <FaFireFlameCurved className="text-3xl mb-3 opacity-30" />
              <p>No active flips</p>
              <p className="text-xs mt-1">Waiting for trades...</p>
            </div>
          )}
        </Card>

        {/* Card 3: HOT / Volatile Items */}
        <Card
          title="Hot Items (High Volume)"
          icon={<FaBolt className="text-gold" />}
          action={() => navigate('/screener?preset=quick_flips')}
          className="h-[420px]"
        >
          {hotItems.length > 0 ? (
            <div className="space-y-1">
              {hotItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="flex items-center justify-between px-2 py-2 hover:bg-hover rounded-lg cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.icon && (
                      <img
                        src={`https://oldschool.runescape.wiki/images/${item.icon.replace(/ /g, '_')}`}
                        className="w-6 h-6 object-contain flex-shrink-0"
                        alt=""
                      />
                    )}
                    <span className="text-sm text-primary truncate group-hover:text-gold transition-colors">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={clsx(
                      "text-xs font-mono",
                      item.priceChange > 0 ? "text-green" : item.priceChange < 0 ? "text-red" : "text-muted"
                    )}>
                      {item.priceChange > 0 ? '+' : ''}{item.priceChange.toFixed(1)}%
                    </span>
                    <span className="text-sm font-mono text-gold font-bold">
                      {formatNumber(item.volume)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted text-sm">
              <FaBolt className="text-3xl mb-3 opacity-30" />
              <p>No hot items</p>
            </div>
          )}
        </Card>

        {/* Card 4: Largest Margins */}
        <Card
          title="Largest Margins"
          icon={<FaMoneyBillWave />}
          action={() => navigate('/screener?preset=high_margin')}
          className="h-[420px]"
        >
          {topMargins.length > 0 ? (
            <MiniTable
              items={topMargins}
              valueLabel="Margin"
              valueKey="margin"
              valueFormatter={(val) => `+${formatNumber(val)}`}
              onItemClick={(id) => navigate(`/item/${id}`)}
              className="text-sm"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted text-sm">
              <FaMoneyBillWave className="text-3xl mb-3 opacity-30" />
              <p>No active margins</p>
            </div>
          )}
        </Card>

        {/* Card 5: Profitable Alchs */}
        <Card
          title="Profitable Alchs"
          icon={<FaWandMagicSparkles />}
          action={() => navigate('/screener?preset=alch')}
          className="h-[420px]"
        >
          {topAlchs.length > 0 ? (
            <MiniTable
              items={topAlchs}
              valueLabel="Profit"
              valueKey="alchProfit"
              valueFormatter={(val) => `+${formatNumber(val)}`}
              onItemClick={(id) => navigate(`/item/${id}`)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted text-sm">
              <FaWandMagicSparkles className="text-3xl mb-3 opacity-30" />
              <p>No alch opportunities</p>
            </div>
          )}
        </Card>

        {/* Card 6: Pump Alerts */}
        {pumpAlerts.length > 0 ? (
          <Card
            title="📈 Pump Alerts"
            icon={<FaArrowTrendUp className="text-green" />}
            action={() => navigate('/screener?pumps=true')}
            className="h-[420px] ring-1 ring-green/30 bg-gradient-to-br from-card to-green/5"
          >
            <div className="space-y-1">
              {pumpAlerts.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="flex items-center justify-between px-2 py-2 hover:bg-green/10 rounded-lg cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.icon && (
                      <img
                        src={`https://oldschool.runescape.wiki/images/${item.icon.replace(/ /g, '_')}`}
                        className="w-6 h-6 object-contain flex-shrink-0"
                        alt=""
                      />
                    )}
                    <span className="text-sm text-primary truncate group-hover:text-green transition-colors">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted font-mono">
                      Vol: {formatNumber(item.volume)}
                    </span>
                    <span className="text-sm font-mono font-bold text-green">
                      +{item.priceChange.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card
            title="Highest ROI"
            icon={<FaArrowTrendUp />}
            action={() => navigate('/screener?sort=roi')}
            className="h-[420px]"
          >
            {recentItems.filter(i => i.buyPrice > 1000).length > 0 ? (
              <MiniTable
                items={[...recentItems].filter(i => i.buyPrice > 1000).sort((a, b) => b.roi - a.roi).slice(0, 8)}
                valueLabel="ROI"
                valueKey="roi"
                valueFormatter={(val) => `${val.toFixed(1)}%`}
                onItemClick={(id) => navigate(`/item/${id}`)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted text-sm">
                <FaArrowTrendUp className="text-3xl mb-3 opacity-30" />
                <p>No active ROI items</p>
              </div>
            )}
          </Card>
        )}

      </div>
    </div>
  );
} 
