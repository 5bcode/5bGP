import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMarketAnalysis } from '@/hooks/use-market-analysis';
import { useMarketData } from '@/hooks/use-osrs-query';
import { useSettings } from '@/context/SettingsContext';
import { ArrowRight, Sparkles, TrendingUp, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatGP } from '@/lib/osrs-math';

const RecommendedFlips = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const { items, prices, stats } = useMarketData(settings.refreshInterval * 1000);

    // Use a default "Safe Flip" strategy for recommendations
    const { bestFlips } = useMarketAnalysis(items, prices, stats, {
        id: 'rec_safe',
        name: 'Safe',
        minPrice: 100,
        maxPrice: 2147483647,
        minVolume: 10000,
        minRoi: 1 // at least 1% ROI
    });

    const recommendations = bestFlips.slice(0, 4); // Top 4 - keep it clean

    if (recommendations.length === 0) return null;

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="text-amber-400 fill-amber-400/20" size={18} />
                    <h2 className="text-lg font-bold text-slate-100">AI Recommendations</h2>
                </div>
                <Button
                    variant="link"
                    className="text-emerald-400 hover:text-emerald-300 text-xs"
                    onClick={() => navigate('/scanner')}
                >
                    View Scanner <ArrowRight size={14} className="ml-1" />
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {recommendations.map((opp) => (
                    <div
                        key={opp.item.id}
                        onClick={() => navigate(`/item/${opp.item.id}`)}
                        className="glass-card p-4 hover:border-emerald-500/50 transition-colors cursor-pointer group relative overflow-hidden"
                    >
                        {/* Background Gradient */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -translate-y-10 translate-x-10 group-hover:bg-emerald-500/10 transition-colors" />

                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center p-1">
                                    <img
                                        src={`https://static.runelite.net/cache/item/icon/${opp.item.id}.png`}
                                        alt={opp.item.name}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-200 text-sm truncate max-w-[120px]">{opp.item.name}</span>
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                        <TrendingUp size={10} className="text-emerald-500" />
                                        High Demand
                                    </span>
                                </div>
                            </div>
                            <div className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded text-[10px] font-bold text-emerald-400">
                                {opp.score.toFixed(0)} Score
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Buy Price</span>
                                <span className="font-mono text-slate-300">{formatGP(opp.price.low)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Exp. Profit</span>
                                <span className="font-mono text-emerald-400 font-bold">+{formatGP(opp.metric)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">ROI</span>
                                <span className="font-mono text-blue-400">{opp.secondaryMetric.toFixed(2)}%</span>
                            </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-800/50 flex items-center justify-between">
                            <span className="text-[10px] text-slate-500"> Vol: {formatGP(opp.stats.highPriceVolume + opp.stats.lowPriceVolume)}</span>
                            <Button size="sm" className="h-6 text-[10px] bg-emerald-600/20 hover:bg-emerald-600 text-emerald-100 hover:text-white border border-emerald-500/20">
                                Analyze
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecommendedFlips;
