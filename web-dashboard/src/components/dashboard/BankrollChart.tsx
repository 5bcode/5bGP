import React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatGP } from '@/lib/osrs-math';
import { BankrollSnapshot } from '@/hooks/use-bankroll-history'; // Ensure this path is correct

interface BankrollChartProps {
    data: BankrollSnapshot[];
}

const BankrollChart = ({ data }: BankrollChartProps) => {
    if (data.length < 2) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-slate-600 bg-slate-950/20 rounded-lg border border-slate-800">
                <p>Not enough data history yet.</p>
                <p className="text-xs mt-2">Check back after a few trades!</p>
            </div>
        );
    }

    return (
        <div className="h-64 w-full bg-slate-950/20 rounded-lg border border-slate-800 p-4">
            <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">Account Value History</h3>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                        dataKey="recorded_at"
                        stroke="#64748b"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(str) => {
                            const d = new Date(str);
                            return `${d.getMonth() + 1}/${d.getDate()}`;
                        }}
                        minTickGap={30}
                    />
                    <YAxis
                        stroke="#64748b"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(val) => {
                            if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)}B`;
                            if (val >= 1000000) return `${(val / 1000000).toFixed(0)}M`;
                            return `${val}`;
                        }}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }}
                        itemStyle={{ color: '#e2e8f0' }}
                        labelStyle={{ color: '#94a3b8' }}
                        formatter={(value: number) => [formatGP(value), 'Value']}
                        labelFormatter={(label) => new Date(label).toLocaleString()}
                    />
                    <Area
                        type="monotone"
                        dataKey="total_value"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#colorValue)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default BankrollChart;
