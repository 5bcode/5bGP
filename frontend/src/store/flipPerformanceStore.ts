import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FlipPerformance, HistoricalPerformance, Item } from '../types';
import type { Transaction } from './portfolioStore';

/**
 * Calculate tax for a Grand Exchange transaction (1% of sale value)
 */
function calculateTax(saleValue: number): number {
    return Math.floor(saleValue * 0.01);
}

/**
 * Calculate historical performance metrics from completed flips
 */
function calculateHistoricalPerformance(flips: FlipPerformance[]): HistoricalPerformance {
    if (flips.length === 0) {
        return {
            totalFlips: 0,
            totalProfit: 0,
            totalROI: 0,
            averageProfit: 0,
            averageROI: 0,
            averageHoldingTime: 0,
            winRate: 0,
            bestFlip: null,
            worstFlip: null,
            flipsByPeriod: { daily: [], weekly: [], monthly: [] },
            profitByPeriod: { daily: [], weekly: [], monthly: [] }
        };
    }

    const totalProfit = flips.reduce((sum, flip) => sum + flip.profit, 0);
    const totalROI = flips.reduce((sum, flip) => sum + flip.roi, 0);
    const profitableFlips = flips.filter(flip => flip.profit > 0);

    // Find best and worst flips
    const bestFlip = flips.reduce((best, current) =>
        !best || current.profit > best.profit ? current : best, null as FlipPerformance | null);
    const worstFlip = flips.reduce((worst, current) =>
        !worst || current.profit < worst.profit ? current : worst, null as FlipPerformance | null);

    // Calculate flips and profits by period
    const now = Date.now();
    const flipsByPeriod = {
        daily: flips.filter(flip => now - flip.sellTimestamp < 24 * 60 * 60 * 1000),
        weekly: flips.filter(flip => now - flip.sellTimestamp < 7 * 24 * 60 * 60 * 1000),
        monthly: flips.filter(flip => now - flip.sellTimestamp < 30 * 24 * 60 * 60 * 1000)
    };

    const profitByPeriod = {
        daily: flipsByPeriod.daily.map(flip => flip.profit),
        weekly: flipsByPeriod.weekly.map(flip => flip.profit),
        monthly: flipsByPeriod.monthly.map(flip => flip.profit)
    };

    return {
        totalFlips: flips.length,
        totalProfit,
        totalROI,
        averageProfit: totalProfit / flips.length,
        averageROI: totalROI / flips.length,
        averageHoldingTime: flips.reduce((sum, flip) => sum + flip.holdingTime, 0) / flips.length,
        winRate: (profitableFlips.length / flips.length) * 100,
        bestFlip,
        worstFlip,
        flipsByPeriod,
        profitByPeriod
    };
}



/**
 * Group flips by time periods for charting
 */
export function groupFlipsByTimePeriod(flips: FlipPerformance[], period: 'daily' | 'weekly' | 'monthly'): Array<{ period: string; profit: number; flips: number }> {
    const grouped = new Map<string, { profit: number; flips: number }>();

    flips.forEach(flip => {
        const date = new Date(flip.sellTimestamp);
        let key: string;

        switch (period) {
            case 'daily':
                key = date.toISOString().split('T')[0];
                break;
            case 'weekly':
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                key = weekStart.toISOString().split('T')[0];
                break;
            case 'monthly':
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                break;
        }

        if (!grouped.has(key)) {
            grouped.set(key, { profit: 0, flips: 0 });
        }

        const group = grouped.get(key)!;
        group.profit += flip.profit;
        group.flips += 1;
    });

    return Array.from(grouped.entries())
        .map(([period, data]) => ({ period, ...data }))
        .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Detects completed flips from transaction history
 * A flip is when you buy an item and then sell some/all of it later
 */
function detectCompletedFlips(transactions: Transaction[], items: Item[]): FlipPerformance[] {
    const flips: FlipPerformance[] = [];
    const itemMap = new Map(items.map(item => [item.id, item]));

    // Group transactions by item
    const transactionsByItem = new Map<number, Transaction[]>();
    transactions.forEach(tx => {
        if (!transactionsByItem.has(tx.itemId)) {
            transactionsByItem.set(tx.itemId, []);
        }
        transactionsByItem.get(tx.itemId)!.push(tx);
    });

    // Process each item's transactions to find flips
    transactionsByItem.forEach((itemTransactions, itemId) => {
        const item = itemMap.get(itemId);
        if (!item) return;

        // Sort transactions chronologically
        const sortedTxs = itemTransactions.sort((a, b) => a.timestamp - b.timestamp);

        // Track position for each flip (FIFO method)
        let position: { quantity: number; avgPrice: number; buyTx: Transaction }[] = [];

        sortedTxs.forEach(tx => {
            if (tx.type === 'buy') {
                // Add to position
                position.push({
                    quantity: tx.quantity,
                    avgPrice: tx.price,
                    buyTx: tx
                });
            } else if (tx.type === 'sell') {
                // Process sell against existing positions (FIFO)
                let remainingQuantity = tx.quantity;

                while (remainingQuantity > 0 && position.length > 0) {
                    const oldestPosition = position[0];

                    if (oldestPosition.quantity <= remainingQuantity) {
                        // Complete position flip
                        const flipQuantity = oldestPosition.quantity;
                        const profit = (tx.price - oldestPosition.avgPrice) * flipQuantity;
                        const tax = calculateTax(tx.price * flipQuantity);

                        flips.push({
                            id: `flip_${oldestPosition.buyTx.id}_${tx.id}`,
                            itemId: itemId,
                            itemName: item.name,
                            itemIcon: item.icon,
                            buyTransactionId: oldestPosition.buyTx.id,
                            sellTransactionId: tx.id,
                            buyPrice: oldestPosition.avgPrice,
                            sellPrice: tx.price,
                            quantity: flipQuantity,
                            buyTimestamp: oldestPosition.buyTx.timestamp,
                            sellTimestamp: tx.timestamp,
                            profit: profit - tax,
                            roi: ((tx.price - oldestPosition.avgPrice) / oldestPosition.avgPrice) * 100,
                            holdingTime: tx.timestamp - oldestPosition.buyTx.timestamp,
                            taxPaid: tax,
                            realized: true
                        });

                        remainingQuantity -= flipQuantity;
                        position.shift(); // Remove completed position
                    } else {
                        // Partial position flip
                        const flipQuantity = remainingQuantity;
                        const profit = (tx.price - oldestPosition.avgPrice) * flipQuantity;
                        const tax = calculateTax(tx.price * flipQuantity);

                        flips.push({
                            id: `flip_${oldestPosition.buyTx.id}_${tx.id}_partial`,
                            itemId: itemId,
                            itemName: item.name,
                            itemIcon: item.icon,
                            buyTransactionId: oldestPosition.buyTx.id,
                            sellTransactionId: tx.id,
                            buyPrice: oldestPosition.avgPrice,
                            sellPrice: tx.price,
                            quantity: flipQuantity,
                            buyTimestamp: oldestPosition.buyTx.timestamp,
                            sellTimestamp: tx.timestamp,
                            profit: profit - tax,
                            roi: ((tx.price - oldestPosition.avgPrice) / oldestPosition.avgPrice) * 100,
                            holdingTime: tx.timestamp - oldestPosition.buyTx.timestamp,
                            taxPaid: tax,
                            realized: true
                        });

                        oldestPosition.quantity -= flipQuantity;
                        remainingQuantity = 0;
                    }
                }
            }
        });
    });

    return flips.sort((a, b) => b.sellTimestamp - a.sellTimestamp);
}

interface FlipPerformanceState {
    // Cached flip data
    completedFlips: FlipPerformance[];
    historicalPerformance: HistoricalPerformance | null;
    lastCalculated: number;

    // Actions
    updateFlips: (flips: FlipPerformance[]) => void;
    getPerformance: () => HistoricalPerformance | null;
    clearHistory: () => void;
    detectFlips: (transactions: Transaction[], items: Item[]) => FlipPerformance[];
}

export const useFlipPerformanceStore = create<FlipPerformanceState>()(
    persist(
        (set, get) => ({
            completedFlips: [],
            historicalPerformance: null,
            lastCalculated: 0,

            updateFlips: (flips) => {
                const performance = calculateHistoricalPerformance(flips);

                set({
                    completedFlips: flips,
                    historicalPerformance: performance,
                    lastCalculated: Date.now()
                });
            },

            getPerformance: () => {
                return get().historicalPerformance;
            },

            clearHistory: () => {
                set({
                    completedFlips: [],
                    historicalPerformance: null,
                    lastCalculated: 0
                });
            },

            detectFlips: (transactions, items) => {
                return detectCompletedFlips(transactions, items);
            }
        }),
        {
            name: 'flip-performance-storage',
            // Only persist essential data, recalculate performance on load
            partialize: (state) => ({
                completedFlips: state.completedFlips,
                lastCalculated: state.lastCalculated
            })
        }
    )
);

// Rehydrate performance data on store creation
useFlipPerformanceStore.subscribe((state) => {
    if (state.completedFlips.length > 0 && !state.historicalPerformance) {
        const performance = calculateHistoricalPerformance(state.completedFlips);
        useFlipPerformanceStore.setState({ historicalPerformance: performance });
    }
});
