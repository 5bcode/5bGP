import React from 'react';
import { Card } from '@/components/ui/card';
import { Stats24h } from '@/services/osrs-api';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { HelpCircle, BarChart3 } from 'lucide-react';

interface VolumeCardProps {
    stats: Stats24h;
}

const VolumeCard = ({ stats }: VolumeCardProps) => {
    const dailyVolume = stats.highPriceVolume + stats.lowPriceVolume;

    // Determine Demand Level
    let demandLevel = "Low";
    let demandColor = "text-slate-400";
    let barColor = "#94a3b8";

    if (dailyVolume > 1000000) {
        demandLevel = "Extreme";
        demandColor = "text-purple-400";
        barColor = "#c084fc";
    } else if (dailyVolume > 10000) {
        demandLevel = "High";
        demandColor = "text-emerald-400";
        barColor = "#34d399";
    } else if (dailyVolume > 1000) {
        demandLevel = "Moderate";
        demandColor = "text-amber-400";
        barColor = "#fbbf24";
    }

    // Mock data for the tiny chart to match design
    // In a real app we'd use useMarketData history
    const mockHistory = [
        { name: 'Jan', val: dailyVolume * 0.8 },
        { name: 'Feb', val: dailyVolume * 0.9 },
        { name: 'Mar', val: dailyVolume * 0.7 },
        { name: 'Apr', val: dailyVolume * 1.1 },
        { name: 'May', val: dailyVolume * 1.0 },
        { name: 'Jun', val: dailyVolume },
    ];

    return (
        <Card className="glass-card p-6 h-full flex flex-col relative overflow-hidden group">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-purple-500/20 transition-all duration-700"></div>

            <div className="flex justify-between items-start mb-4 relative z-10">
                <h3 className="text-slate-100 font-semibold flex items-center gap-2" title="Based on 24h trading volume">
                    Volume & Demand
                    <HelpCircle size={14} className="text-slate-600 cursor-help" />
                </h3>
            </div>

            <div className="flex-1 flex flex-col justify-end relative z-10">
                <div className="mb-6">
                    <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-1">Daily Volume</p>
                    <div className="flex items-center justify-between">
                        <span className="text-3xl font-mono font-bold text-slate-100 tracking-tight">
                            {dailyVolume.toLocaleString()}
                        </span>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 rounded-lg border border-slate-700/50 backdrop-blur-sm">
                            <BarChart3 size={16} className={demandColor} />
                            <span className={`text-sm font-bold ${demandColor}`}>
                                {demandLevel}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="h-32 w-full mt-auto">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={mockHistory}>
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{
                                    backgroundColor: '#020617', // slate-950
                                    border: '1px solid #1e293b',
                                    borderRadius: '8px',
                                    padding: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
                                }}
                                itemStyle={{ color: '#e2e8f0', fontSize: '12px', fontFamily: 'monospace' }}
                                labelStyle={{ display: 'none' }}
                                formatter={(value: number) => [value.toLocaleString(), 'Vol']}
                            />
                            <Bar dataKey="val" fill={barColor} radius={[4, 4, 0, 0]} fillOpacity={0.8} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex justify-between text-[10px] text-slate-500 mt-2 px-2 font-mono opacity-60">
                    <span>Low</span>
                    <span>Mod</span>
                    <span>High</span>
                </div>
            </div>
        </Card>
    );
};

export default VolumeCard;
