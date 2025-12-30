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
        <Card className="p-6 bg-slate-900 border-slate-800 h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-slate-100 font-semibold flex items-center gap-2">
                    Volume & Demand
                    <HelpCircle size={14} className="text-slate-600" />
                </h3>
            </div>

            <div className="flex-1 flex flex-col justify-end">
                <div className="mb-6">
                    <p className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-1">Daily Volume</p>
                    <div className="flex items-center justify-between">
                        <span className="text-3xl font-mono font-bold text-slate-200">
                            {dailyVolume.toLocaleString()}
                        </span>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
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
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{
                                    backgroundColor: '#0f172a',
                                    border: '1px solid #1e293b',
                                    borderRadius: '8px',
                                    padding: '8px'
                                }}
                                itemStyle={{ color: '#94a3b8', fontSize: '12px' }}
                                labelStyle={{ display: 'none' }}
                            />
                            <Bar dataKey="val" fill={barColor} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex justify-between text-[10px] text-slate-500 mt-2 px-2 font-mono">
                    <span>Low</span>
                    <span>Mod</span>
                    <span>High</span>
                </div>
            </div>
        </Card>
    );
};

export default VolumeCard;
