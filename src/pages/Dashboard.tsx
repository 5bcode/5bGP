import React, { useMemo, useState } from 'react';
import { useMarketData } from '@/hooks/use-osrs-query';
import { Item } from '@/services/osrs-api';
import { useMarketHighlights, MarketHighlightItem } from '@/hooks/use-market-highlights';
import MarketCard from '@/components/dashboard/MarketCard';
import DiscoverRow from '@/components/dashboard/DiscoverRow';
import { Loader2, TrendingUp, TrendingDown, BarChart2, DollarSign, Shield, Gem, Zap, Crown, ArrowLeft, AlertTriangle, Briefcase, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SettingsDialog from '@/components/SettingsDialog';
import ItemSearch from '@/components/ItemSearch';
import { useNavigate } from 'react-router-dom';
import { formatGP } from '@/lib/osrs-math';
import SortableMarketTable from '@/components/dashboard/SortableMarketTable';
import VirtualizedMarketTable from '@/components/dashboard/VirtualizedMarketTable';
import PortfolioStatus, { Period } from '@/components/PortfolioStatus';
import { useTradeHistory } from '@/hooks/use-trade-history';
import { useActiveOffers } from '@/hooks/use-active-offers';

const Dashboard = () => {
    const navigate = useNavigate();
    const { items, prices, stats, isLoading } = useMarketData(60000);
    const { trades, activePositions } = useTradeHistory();
    const { offers: geSlots } = useActiveOffers();

    const [viewAll, setViewAll] = useState<{ title: string; items: MarketHighlightItem[] } | null>(null);
    const [statsPeriod, setStatsPeriod] = useState<Period>('day');

    // Portfolio Calculations
    const sessionStart = useMemo(() => Date.now(), []); // Session starts on mount

    const filteredTrades = useMemo(() => {
        const now = Date.now();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return trades.filter(t => {
            switch (statsPeriod) {
                case 'session': return t.timestamp >= sessionStart;
                case 'day': return t.timestamp >= today.getTime();
                case 'week': return t.timestamp >= (now - 7 * 24 * 60 * 60 * 1000);
                case 'month': return t.timestamp >= (now - 30 * 24 * 60 * 60 * 1000);
                default: return true;
            }
        });
    }, [trades, statsPeriod, sessionStart]);

    const portfolioMetrics = useMemo(() => {
        const totalProfit = filteredTrades.reduce((acc, t) => acc + t.profit, 0);
        // Active investment = money currently in manual active positions + money in GE slots
        const manualInvested = activePositions.reduce((acc, p) => acc + (p.buyPrice * p.quantity), 0);
        const geInvested = geSlots.reduce((acc, s) => acc + (s.price * s.quantity), 0);

        return {
            profit: totalProfit,
            tradeCount: filteredTrades.length,
            activeInvestment: manualInvested + geInvested
        };
    }, [filteredTrades, activePositions, geSlots]);

    // Compute Highlights
    const {
        topGainers,
        topLosers,
        highVolumeProfit,
        mostProfitable,
        mostProfitableF2P,
        mostExpensive,
        profitableAlchs,
        potentialDumps
    } = useMarketHighlights(items, prices, stats);

    // Discover Items
    const discoverItems = useMemo(() => {
        if (!items.length) return [];
        const source = mostProfitable.length > 5 ? mostProfitable : items.slice(0, 10);
        return source.slice(0, 5).map(h => items.find(i => i.id === h.id)).filter((i): i is Item => !!i);
    }, [mostProfitable, items]);

    if (isLoading && items.length === 0) {
        return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-emerald-500" /></div>;
    }

    // --- FULL LIST VIEW ---
    if (viewAll) {
        return (
            <div className="min-h-screen p-4 lg:p-8 space-y-6 animate-fade-in">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => setViewAll(null)} className="text-slate-400 hover:text-white">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Button>
                </div>

                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold text-slate-100">{viewAll.title}</h1>
                    <p className="text-slate-500">Showing top 50 results based on real-time volatility</p>
                </div>

                <VirtualizedMarketTable data={viewAll.items} />
            </div>
        );
    }

    // --- DASHBOARD VIEW ---
    return (
        <div className="min-h-screen p-4 lg:p-8 space-y-8 animate-fade-in">
            {/* Command Center Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Command Center</h1>
                    <div className="flex items-center gap-3 text-slate-500 text-sm">
                        <span className="flex items-center gap-1.5"><PlayCircle size={14} className="text-emerald-500" /> System Active</span>
                        <span className="w-1 h-1 bg-slate-800 rounded-full" />
                        <span>Scanning {items.length.toLocaleString()} items</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-full md:w-[320px]">
                        <ItemSearch
                            items={items}
                            onSelect={(item) => navigate(`/item/${item.id}`)}
                            isLoading={isLoading}
                        />
                    </div>
                    <SettingsDialog />
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 font-bold group">
                        <Crown size={16} className="mr-2 group-hover:scale-110 transition-transform" /> Upgrade
                    </Button>
                </div>
            </div>

            {/* Portfolio Summary Section */}
            <PortfolioStatus
                activeInvestment={portfolioMetrics.activeInvestment}
                profit={portfolioMetrics.profit}
                tradeCount={portfolioMetrics.tradeCount}
                period={statsPeriod}
                onPeriodChange={setStatsPeriod}
            />

            {/* Market Insights Header */}
            <div className="pt-4 border-t border-slate-900 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <TrendingUp size={20} className="text-emerald-500" /> Global Market Trends
                </h2>
                <div className="text-[10px] text-slate-600 uppercase font-black tracking-widest bg-slate-900/50 px-2 py-1 rounded border border-slate-800">
                    Auto-refreshing 60s
                </div>
            </div>

            {/* Market Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="h-[320px]">
                    <MarketCard
                        title="Top Gainers"
                        icon={<TrendingUp className="text-emerald-500" size={18} />}
                        items={topGainers.slice(0, 8)}
                        type="gainers"
                        onViewAll={() => setViewAll({ title: 'Top Gainers', items: topGainers })}
                    />
                </div>
                <div className="h-[320px]">
                    <MarketCard
                        title="Top Losers"
                        icon={<TrendingDown className="text-rose-500" size={18} />}
                        items={topLosers.slice(0, 8)}
                        type="losers"
                        onViewAll={() => setViewAll({ title: 'Top Losers', items: topLosers })}
                    />
                </div>
                <div className="h-[320px]">
                    <MarketCard
                        title="High Volume Profit"
                        icon={<BarChart2 className="text-purple-500" size={18} />}
                        items={highVolumeProfit.slice(0, 8)}
                        type="neutral"
                        onViewAll={() => setViewAll({ title: 'High Volume Profit', items: highVolumeProfit })}
                    />
                </div>

                <div className="h-[320px]">
                    <MarketCard
                        title="Most Profitable"
                        icon={<DollarSign className="text-amber-500" size={18} />}
                        items={mostProfitable.slice(0, 8)}
                        type="neutral"
                        onViewAll={() => setViewAll({ title: 'Most Profitable', items: mostProfitable })}
                    />
                </div>
                <div className="h-[320px]">
                    <MarketCard
                        title="Most Profitable F2P"
                        icon={<Shield className="text-blue-500" size={18} />}
                        items={mostProfitableF2P.slice(0, 8)}
                        type="neutral"
                        onViewAll={() => setViewAll({ title: 'Most Profitable F2P', items: mostProfitableF2P })}
                    />
                </div>
                <div className="h-[320px]">
                    <MarketCard
                        title="Potential Dumps"
                        icon={<AlertTriangle className="text-rose-600" size={18} />}
                        items={potentialDumps.slice(0, 8)}
                        type="losers"
                        onViewAll={() => setViewAll({ title: 'Potential Dumps (Panic Sells)', items: potentialDumps })}
                    />
                </div>
            </div>

            {/* Discover Section */}
            <div className="pt-8 border-t border-slate-900">
                <DiscoverRow items={discoverItems} prices={prices} />
            </div>

            <div className="h-8" />
        </div>
    );
};

export default Dashboard;