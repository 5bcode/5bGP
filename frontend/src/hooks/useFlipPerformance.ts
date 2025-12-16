import { useEffect, useMemo } from 'react';
import { usePortfolioStore } from '../store/portfolioStore';
import { useFlipPerformanceStore } from '../store/flipPerformanceStore';
import { useMarketData } from './useMarketData';
import { detectCompletedFlips, groupFlipsByTimePeriod } from '../utils/flipPerformance';
import type { FlipPerformance } from '../types';

export function useFlipPerformance() {
    const { transactions } = usePortfolioStore();
    const { completedFlips, historicalPerformance, updateFlips, lastCalculated } = useFlipPerformanceStore();
    const { items: marketItems } = useMarketData();

    // Detect flips when transactions or items change
    const detectedFlips = useMemo(() => {
        if (!marketItems || marketItems.length === 0) return [];

        // Only recalculate if we have new transactions since last calculation
        const latestTransactionTime = Math.max(...transactions.map(tx => tx.timestamp), 0);
        if (latestTransactionTime <= lastCalculated) {
            return completedFlips; // Return cached flips
        }

        return detectCompletedFlips(transactions, marketItems);
    }, [transactions, marketItems, lastCalculated, completedFlips]);

    // Update the store when flips change
    useEffect(() => {
        if (detectedFlips.length !== completedFlips.length ||
            detectedFlips.some((flip, index) => flip.id !== completedFlips[index]?.id)) {
            updateFlips(detectedFlips);
        }
    }, [detectedFlips, completedFlips, updateFlips]);

    return {
        flips: detectedFlips,
        performance: historicalPerformance,
        isCalculating: false, // Could add loading state if needed
        totalFlips: detectedFlips.length,
        totalProfit: historicalPerformance?.totalProfit || 0,
        winRate: historicalPerformance?.winRate || 0,
        averageROI: historicalPerformance?.averageROI || 0,
        bestFlip: historicalPerformance?.bestFlip || null,
        worstFlip: historicalPerformance?.worstFlip || null,
        recentFlips: detectedFlips.slice(0, 10), // Last 10 flips
        profitableFlips: detectedFlips.filter(flip => flip.profit > 0),
        losingFlips: detectedFlips.filter(flip => flip.profit <= 0),
    };
}

/**
 * Hook for getting flip performance statistics for a specific time period
 */
export function useFlipPerformanceStats(period: 'daily' | 'weekly' | 'monthly' = 'daily') {
    const { performance } = useFlipPerformance();

    return useMemo(() => {
        if (!performance) {
            return {
                flips: [],
                profit: 0,
                count: 0,
                averageProfit: 0,
                winRate: 0
            };
        }

        const periodFlips = performance.flipsByPeriod[period];
        const periodProfits = performance.profitByPeriod[period];
        const profitableFlips = periodFlips.filter(flip => flip.profit > 0);

        return {
            flips: periodFlips,
            profit: periodProfits.reduce((sum, p) => sum + p, 0),
            count: periodFlips.length,
            averageProfit: periodFlips.length > 0 ? periodProfits.reduce((sum, p) => sum + p, 0) / periodFlips.length : 0,
            winRate: periodFlips.length > 0 ? (profitableFlips.length / periodFlips.length) * 100 : 0
        };
    }, [performance, period]);
}

/**
 * Hook for getting flip performance data formatted for charts
 */
export function useFlipChartData(period: 'daily' | 'weekly' | 'monthly' = 'weekly') {
    const { flips } = useFlipPerformance();

    return useMemo(() => {
        return groupFlipsByTimePeriod(flips, period);
    }, [flips, period]);
}
