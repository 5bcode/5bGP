import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FlipPerformance, HistoricalPerformance } from '../types';

interface FlipPerformanceState {
    // Cached flip data
    completedFlips: FlipPerformance[];
    historicalPerformance: HistoricalPerformance | null;
    lastCalculated: number;

    // Actions
    updateFlips: (flips: FlipPerformance[]) => void;
    getPerformance: () => HistoricalPerformance | null;
    clearHistory: () => void;
}

export const useFlipPerformanceStore = create<FlipPerformanceState>()(
    persist(
        (set, get) => ({
            completedFlips: [],
            historicalPerformance: null,
            lastCalculated: 0,

            updateFlips: async (flips) => {
                // Dynamic import to avoid circular dependencies
                const { calculateHistoricalPerformance } = await import('../utils/flipPerformance');

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
useFlipPerformanceStore.subscribe(async (state) => {
    if (state.completedFlips.length > 0 && !state.historicalPerformance) {
        const { calculateHistoricalPerformance } = await import('../utils/flipPerformance');
        const performance = calculateHistoricalPerformance(state.completedFlips);
        useFlipPerformanceStore.setState({ historicalPerformance: performance });
    }
});
