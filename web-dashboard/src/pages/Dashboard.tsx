import React, { useMemo, useState, useEffect } from 'react';
import { useMarketData } from '@/hooks/use-osrs-query';
import { Item } from '@/services/osrs-api';
import { useMarketHighlights, MarketHighlightItem } from '@/hooks/use-market-highlights';
import MarketCard from '@/components/dashboard/MarketCard';
import DiscoverRow from '@/components/dashboard/DiscoverRow';
import { Loader2, TrendingUp, TrendingDown, BarChart2, DollarSign, Shield, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SettingsDialog from '@/components/SettingsDialog';
import ItemSearch from '@/components/ItemSearch';
import { useNavigate } from 'react-router-dom';
import { formatGP } from '@/lib/osrs-math';
import VirtualizedMarketTable from '@/components/dashboard/VirtualizedMarketTable';
import PageHeader from '@/components/PageHeader';
import RecommendedFlips from '@/components/dashboard/RecommendedFlips';
import PortfolioStatus, { Period } from '@/components/PortfolioStatus';
import { useTradeHistory } from '@/hooks/use-trade-history';
import { useActiveOffers } from '@/hooks/use-active-offers';
import { useBankroll } from '@/hooks/use-bankroll';
import { useBankrollHistory } from '@/hooks/use-bankroll-history';
import BankrollChart from '@/components/dashboard/BankrollChart';
import { useSettings } from '@/context/SettingsContext';
import { RefreshCw } from 'lucide-react';

const Dashboard = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const refreshMs = (settings.refreshInterval || 60) * 1000;
    const { items, prices, stats, isLoading, refetch } = useMarketData(refreshMs);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const { trades, activePositions } = useTradeHistory();
    const { offers: geSlots } = useActiveOffers();
    const { totalCash, updateBankroll, loading: bankrollLoading } = useBankroll();
    const { history, recordSnapshot } = useBankrollHistory();

    // Track last update time
    useEffect(() => {
        if (!isLoading) setLastUpdated(new Date());
    }, [prices]);

    const [viewAll, setViewAll] = useState<{ title: string; items: MarketHighlightItem[] } | null>(null);
    const [statsPeriod, setStatsPeriod] = useState<Period>('day');
    const [showAllMarkets, setShowAllMarkets] = useState(false);

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

    // Record bankroll snapshot periodically (rate-limited in hook)
    useEffect(() => {
        if (!bankrollLoading && totalCash > 0) {
            const invested = portfolioMetrics.activeInvestment;
            const liquid = totalCash - invested;
            recordSnapshot(liquid, invested);
        }
    }, [totalCash, portfolioMetrics.activeInvestment, bankrollLoading]);

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
        <div className="space-y-12 animate-page-enter">
            {/* Command Center Hero */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="glass-card relative p-8 lg:p-12 mb-12 flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="space-y-4 text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-4">
                            <h1 className="text-4xl lg:text-6xl font-black text-white tracking-tighter uppercase transition-all duration-700">
                                Terminal
                            </h1>
                            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">Live Engine</span>
                            </div>
                        </div>
                        <p className="text-slate-400 text-lg max-w-xl font-medium">
                            Monitoring <span className="text-white font-bold">{items.length.toLocaleString()}</span> active market items across the OSRS Exchange.
                        </p>
                    </div>

                    <div className="w-full lg:w-[460px] space-y-4">
                        <div className="premium-card p-4 bg-slate-950/40">
                            <ItemSearch
                                items={items}
                                onSelect={(item) => navigate(`/item/${item.id}`)}
                                isLoading={isLoading}
                            />
                        </div>
                        <div className="flex items-center justify-center lg:justify-end gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                            <span className="flex items-center gap-2">
                                <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
                                Last sync: {Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}s ago
                            </span>
                            <SettingsDialog />
                        </div>
                    </div>
                </div>
            </div>

            {/* Recommended Flips Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-emerald-500 rounded-full" />
                    <h2 className="text-2xl font-black tracking-tight uppercase">High-Confidence Signals</h2>
                </div>
                <RecommendedFlips />
            </section>

            {/* Portfolio Stats Bar */}
            <section className="pt-8">
                <PortfolioStatus
                    activeInvestment={portfolioMetrics.activeInvestment}
                    profit={portfolioMetrics.profit}
                    tradeCount={portfolioMetrics.tradeCount}
                    period={statsPeriod}
                    onPeriodChange={setStatsPeriod}
                    totalCash={totalCash}
                    onUpdateCash={updateBankroll}
                />
            </section>

            {/* Market Insights Engine */}
            <section className="space-y-8 pt-12 border-t border-white/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black tracking-tight uppercase flex items-center gap-4">
                            Market Engine <TrendingUp size={24} className="text-emerald-500" />
                        </h2>
                        <p className="text-slate-500 font-medium">Real-time volatility analysis and dump detection</p>
                    </div>

                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/5 rounded-xl">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">Auto-Scan active</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="h-[420px]">
                        <MarketCard
                            title="Bullish Momentum"
                            icon={<TrendingUp className="text-emerald-500" size={20} />}
                            items={topGainers.slice(0, 10)}
                            type="gainers"
                            onViewAll={() => setViewAll({ title: 'Top Gainers', items: topGainers })}
                        />
                    </div>
                    <div className="h-[420px]">
                        <MarketCard
                            title="Bearish Dumps"
                            icon={<TrendingDown className="text-rose-500" size={20} />}
                            items={topLosers.slice(0, 10)}
                            type="losers"
                            onViewAll={() => setViewAll({ title: 'Top Losers', items: topLosers })}
                        />
                    </div>
                    <div className="h-[420px]">
                        <MarketCard
                            title="Profit Leaders"
                            icon={<DollarSign className="text-amber-500" size={20} />}
                            items={mostProfitable.slice(0, 10)}
                            type="neutral"
                            onViewAll={() => setViewAll({ title: 'Most Profitable', items: mostProfitable })}
                        />
                    </div>
                </div>

                {showAllMarkets && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-4 animate-page-enter">
                        <div className="h-[420px]">
                            <MarketCard
                                title="Volume Liquidity"
                                icon={<BarChart2 className="text-purple-500" size={20} />}
                                items={highVolumeProfit.slice(0, 10)}
                                type="neutral"
                                onViewAll={() => setViewAll({ title: 'High Volume Profit', items: highVolumeProfit })}
                            />
                        </div>
                        <div className="h-[420px]">
                            <MarketCard
                                title="Free-to-Play"
                                icon={<Shield className="text-blue-500" size={20} />}
                                items={mostProfitableF2P.slice(0, 10)}
                                type="neutral"
                                onViewAll={() => setViewAll({ title: 'Most Profitable F2P', items: mostProfitableF2P })}
                            />
                        </div>
                        <div className="h-[420px]">
                            <MarketCard
                                title="Panic Sell Watch"
                                icon={<AlertTriangle className="text-rose-600" size={20} />}
                                items={potentialDumps.slice(0, 10)}
                                type="losers"
                                onViewAll={() => setViewAll({ title: 'Potential Dumps', items: potentialDumps })}
                            />
                        </div>
                    </div>
                )}

                <div className="flex justify-center pt-8">
                    <Button
                        variant="ghost"
                        onClick={() => setShowAllMarkets(!showAllMarkets)}
                        className="h-14 px-8 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all font-black uppercase tracking-widest text-xs"
                    >
                        {showAllMarkets ? 'Collapse Intelligence' : 'Expand Intelligence Engine'}
                    </Button>
                </div>
            </section>

            {/* Discover Section */}
            <section className="pt-20">
                <div className="glass-card p-8 bg-emerald-500/5 border-emerald-500/10">
                    <DiscoverRow items={discoverItems} prices={prices} />
                </div>
            </section>

            <div className="h-20" />
        </div>
    );
};


export default Dashboard;