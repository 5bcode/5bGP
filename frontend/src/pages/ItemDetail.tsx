import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FaArrowLeft, FaStar, FaStore, FaBook, FaChartLine, FaCoins, FaWandMagicSparkles } from 'react-icons/fa6';
import { useMarketData } from '../hooks/useMarketData';
import { fetchItemTimeseries } from '../services/api';
import { PriceChart } from '../components/ui/PriceChart';
import { formatNumber } from '../utils/analysis';
import clsx from 'clsx';
import { useState } from 'react';
import { usePreferencesStore } from '../store/preferencesStore';
import { usePortfolioStore } from '../store/portfolioStore';
import { toast } from 'sonner';

// Base URL for OSRS Wiki Images
const ICON_BASE = 'https://oldschool.runescape.wiki/images/';

export function ItemDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { items } = useMarketData();
    const itemId = Number(id);

    const [timestep, setTimestep] = useState('5m');
    const { toggleFavorite } = usePreferencesStore();
    const transactions = usePortfolioStore(state => state.transactions);

    // Find item metadata and current price from the global hook
    const item = items.find(i => i.id === itemId);

    // Limit Logic
    const limitUsed = item ? transactions
        .filter(tx => tx.itemId === itemId && tx.type === 'buy' && tx.timestamp > Date.now() - (4 * 60 * 60 * 1000))
        .reduce((acc, tx) => acc + tx.quantity, 0) : 0;

    const limitRemaining = item?.limit ? Math.max(0, item.limit - limitUsed) : 0;
    const limitPercent = item?.limit ? Math.min(100, (limitUsed / item.limit) * 100) : 0;

    const handleToggleFav = () => {
        if (!item) return;
        toggleFavorite(item.id);
        toast.success(item.fav ? 'Removed from favorites' : 'Added to favorites');
    };

    // Queries
    const { data: timeseriesData, isLoading: loadingChart, error: chartError } = useQuery({
        queryKey: ['timeseries', itemId, timestep],
        queryFn: () => fetchItemTimeseries(itemId, timestep),
        enabled: !!itemId,
        staleTime: 60000, // 1 min
    });

    if (!item) {
        return (
            <div className="p-8 text-center text-muted">
                <h2 className="text-xl mb-4">Item Not Found</h2>
                <button onClick={() => navigate(-1)} className="text-gold hover:underline">Go Back</button>
            </div>
        );
    }

    const iconUrl = item.icon ? `${ICON_BASE}${item.icon.replace(/ /g, '_')}` : '';
    const isProfit = item.margin > 0;

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-hover rounded-full text-muted hover:text-primary transition-colors"
                        aria-label="Go Back"
                    >
                        <FaArrowLeft />
                    </button>
                    <div className="relative w-16 h-16 bg-card rounded-xl border border-border flex items-center justify-center">
                        {iconUrl && <img src={iconUrl} alt={item.name} className="w-10 h-10 object-contain" />}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            {item.name}
                            <button
                                onClick={handleToggleFav}
                                className={clsx(
                                    "transition-colors text-xl",
                                    item.fav ? "text-gold" : "text-muted hover:text-gold"
                                )}
                            >
                                <FaStar />
                            </button>
                        </h1>
                        <p className="text-sm text-muted">ID: {item.id} • Limit: {formatNumber(item.limit || 0)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-8 bg-card border border-border px-6 py-3 rounded-xl">
                    <div className="text-right">
                        <p className="text-xs text-muted uppercase font-bold tracking-wider">Buy Price</p>
                        <p className="text-xl font-mono text-secondary">{formatNumber(item.buyPrice)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted uppercase font-bold tracking-wider">Sell Price</p>
                        <p className="text-xl font-mono text-primary text-gold">{formatNumber(item.sellPrice)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted uppercase font-bold tracking-wider">Margin</p>
                        <p className={clsx("text-xl font-mono font-bold", isProfit ? "text-green" : "text-red")}>
                            {isProfit ? '+' : ''}{formatNumber(item.margin)}
                        </p>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted uppercase font-bold tracking-wider">ROI</p>
                        <p className={clsx("text-xl font-mono", item.roi > 5 ? "text-green" : "text-secondary")}>
                            {item.roi.toFixed(2)}%
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Chart Section */}
                <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm h-[500px] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <FaChartLine className="text-gold" /> Price History
                        </h3>
                        <div className="flex bg-background rounded-lg p-1 border border-border">
                            {['5m', '1h', '6h'].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTimestep(t)}
                                    className={clsx(
                                        "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                        timestep === t ? "bg-hover text-primary shadow-sm" : "text-muted hover:text-secondary"
                                    )}
                                >
                                    {t.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 relative min-h-0">
                        {loadingChart ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 border-4 border-zinc-700 border-t-gold rounded-full animate-spin"></div>
                            </div>
                        ) : chartError ? (
                            <div className="absolute inset-0 flex items-center justify-center text-red-400">
                                Error loading chart data
                            </div>
                        ) : (
                            <PriceChart data={timeseriesData?.data || []} itemName={item.name} />
                        )}
                    </div>
                </div>

                {/* Sidebar Stats */}
                <div className="space-y-6">

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <a
                            href={`https://oldschool.runescape.wiki/w/${item.name.replace(/ /g, '_')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 bg-hover hover:bg-zinc-800 border border-border rounded-lg py-3 text-sm font-medium transition-colors"
                        >
                            <FaBook /> OSRS Wiki
                        </a>
                        <a
                            href={`https://prices.runescape.wiki/osrs/item/${item.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 bg-hover hover:bg-zinc-800 border border-border rounded-lg py-3 text-sm font-medium transition-colors"
                        >
                            <FaStore /> Official GE
                        </a>
                    </div>

                    {/* High Alch Info */}
                    <div className="bg-card border border-border rounded-xl p-5">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <FaWandMagicSparkles className="text-purple-400" /> High Alchemy
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted">Alch Value</span>
                                <span className="font-mono text-primary">{formatNumber(item.highalch || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted">Current Buy Price</span>
                                <span className="font-mono text-red-400">-{formatNumber(item.buyPrice)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted">Nature Rune Cost</span>
                                <span className="font-mono text-red-400">-200</span>
                            </div>
                            <div className="h-px bg-border my-2"></div>
                            <div className="flex justify-between items-center font-medium">
                                <span className="text-secondary">Net Profit</span>
                                <span className={clsx(
                                    "font-mono",
                                    (item.alchProfit || 0) > 0 ? "text-green" : "text-red"
                                )}>
                                    {formatNumber(item.alchProfit || -999)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Potential Info */}
                    <div className="bg-card border border-border rounded-xl p-5">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <FaCoins className="text-yellow-500" /> Profit Potential
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted">Max Profit (4hr Limit)</span>
                                <span className="font-mono text-green font-bold">
                                    {formatNumber(item.potentialProfit)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted">Investment Required</span>
                                <span className="font-mono text-secondary">
                                    {formatNumber(item.buyPrice * (item.limit || 0))}
                                </span>
                            </div>

                            {/* Limit Tracker */}
                            <div className="pt-2">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-muted font-medium">GE Limit (4h)</span>
                                    <span className="text-secondary">{formatNumber(limitUsed)} / {formatNumber(item.limit || 0)}</span>
                                </div>
                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className={clsx("h-full transition-all duration-500", limitPercent > 90 ? "bg-red-500" : "bg-gold")}
                                        style={{ width: `${limitPercent}%` }}
                                    ></div>
                                </div>
                                <div className="text-[10px] text-muted text-right mt-1">
                                    {formatNumber(limitRemaining)} remaining
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
