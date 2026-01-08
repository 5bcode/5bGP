import React from 'react';
import { useTimeseries } from '@/hooks/use-osrs-query';
import SparklineCell from './SparklineCell';
import { TimeStep } from '@/services/osrs-api';

interface ConnectedSparklineCellProps {
    itemId: number;
    timestep: TimeStep;
    days?: number; // How many days of history to show
}

const ConnectedSparklineCell = ({ itemId, timestep, days = 1 }: ConnectedSparklineCellProps) => {
    const { data, isLoading } = useTimeseries(itemId, timestep);

    // Filter data based on days window if needed
    // The API returns limited points based on timestep usually, but we might want to trim
    // For now, we'll just pass the data as is or slice it

    // Transform API data to SparklineData
    const chartData = React.useMemo(() => {
        if (!data) return [];

        // Calculate cutoff timestamp if specific days requested
        const cutoff = days ? Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60) : 0;

        return data
            .filter(p => p.avgLowPrice && p.timestamp >= cutoff)
            .map(p => ({
                timestamp: p.timestamp,
                value: (p.avgLowPrice! + p.avgHighPrice!) / 2 // Use average price
            }));
    }, [data, days]);

    if (isLoading) {
        return <div className="h-8 w-20 bg-slate-800/50 animate-pulse rounded" />;
    }

    return (
        <SparklineCell
            data={chartData}
            width={100}
            height={32}
        />
    );
};

export default ConnectedSparklineCell;
