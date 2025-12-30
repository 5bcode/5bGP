import React, { useMemo } from 'react';
import { useMarketData } from '@/hooks/use-osrs-query';
import { Item } from '@/services/osrs-api';
import { useMarketHighlights } from '@/hooks/use-market-highlights';
import MarketCard from '@/components/dashboard/MarketCard';
import DiscoverRow from '@/components/dashboard/DiscoverRow';
import { Loader2, TrendingUp, TrendingDown, BarChart2, DollarSign, Shield, Gem, Zap, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SettingsDialog from '@/components/SettingsDialog';
import ItemSearch from '@/components/ItemSearch';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const { items, prices, stats, isLoading } = useMarketData(60000); // 1 min refresh for dashboard
    const navigate = useNavigate();

    // Compute Highlights
    const {
        topGainers,
        topLosers,
        highVolumeProfit,
        mostProfitable,
        mostProfitableF2P,
        mostExpensive,
        profitableAlchs
    } = useMarketHighlights(items, prices, stats);

    // Discover Items (Random selection from 'Most Profitable' for now to show variety)
    const discoverItems = useMemo(() => {
        if (!items.length) return [];
        // Just pick 5 random items from the "Most Profitable" list to fill the discover row
        const source = mostProfitable.length > 5 ? mostProfitable : items.slice(0, 10);
        // Map back to Item objects
        return source.slice(0, 5).map(h => items.find(i => i.id === h.id)).filter((i): i is Item => !!i);
    }, [mostProfitable, items]);

    if (isLoading && items.length === 0) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 p-4 lg:p-8 space-y-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100">Market Highlights</h1>
                    <p className="text-slate-500 mt-1">
                        The Old School Runescape market at a glance. Curated item lists to help you flip to 5B.
                    </p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-full md:w-[300px]">
                        <ItemSearch
                            items={items}
                            onSelect={(item) => navigate(`/item/${item.id}`)}
                            isLoading={isLoading}
                        />
                    </div>
                    <SettingsDialog />
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 font-bold">
                        <Crown size={16} className="mr-2" /> Upgrade
                    </Button>
                </div>
            </div>

            {/* Market Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Row 1 */}
                <div className="h-[320px]">
                    <MarketCard
                        title="Top Gainers"
                        icon={<TrendingUp className="text-emerald-500" size={18} />}
                        items={topGainers}
                        type="gainers"
                    />
                </div>
                <div className="h-[320px]">
                    <MarketCard
                        title="Top Losers"
                        icon={<TrendingDown className="text-rose-500" size={18} />}
                        items={topLosers}
                        type="losers"
                    />
                </div>
                <div className="h-[320px]">
                    <MarketCard
                        title="High Volume Profit"
                        icon={<BarChart2 className="text-purple-500" size={18} />}
                        items={highVolumeProfit}
                        type="neutral"
                    />
                </div>

                {/* Row 2 */}
                <div className="h-[320px]">
                    <MarketCard
                        title="Most Profitable"
                        icon={<DollarSign className="text-amber-500" size={18} />}
                        items={mostProfitable}
                        type="neutral"
                    />
                </div>
                <div className="h-[320px]">
                    <MarketCard
                        title="Most Profitable F2P"
                        icon={<Shield className="text-blue-500" size={18} />}
                        items={mostProfitableF2P}
                        type="neutral"
                    />
                </div>
                <div className="h-[320px]">
                    <MarketCard
                        title="Most Expensive"
                        icon={<Gem className="text-cyan-500" size={18} />}
                        items={mostExpensive}
                        type="neutral"
                    />
                </div>

                {/* Row 3 - Optional additional rows */}
                <div className="h-[320px]">
                    <MarketCard
                        title="Profitable Alchs"
                        icon={<Zap className="text-yellow-400" size={18} />}
                        items={profitableAlchs}
                        type="neutral"
                    />
                </div>
                <div className="h-[320px] bg-slate-900/50 border border-slate-800/50 rounded-lg flex items-center justify-center border-dashed">
                    <div className="text-center text-slate-500">
                        <Crown size={32} className="mx-auto mb-2 opacity-50" />
                        <p>Unlock more lists with Premium</p>
                    </div>
                </div>
                <div className="h-[320px] bg-slate-900/50 border border-slate-800/50 rounded-lg flex items-center justify-center border-dashed">
                    <div className="text-center text-slate-500">
                        <BarChart2 size={32} className="mx-auto mb-2 opacity-50" />
                        <p>Custom Filters Coming Soon</p>
                    </div>
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