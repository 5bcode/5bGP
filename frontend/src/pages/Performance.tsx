import React from 'react';
import { FlipPerformanceOverview } from '../components/FlipPerformanceOverview';

export function Performance() {
    return (
        <div className="space-y-6 animate-in fade-in">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Flip Performance</h1>
                    <p className="text-secondary text-sm">
                        Historical analysis of your flipping performance over time
                    </p>
                </div>
            </header>

            <FlipPerformanceOverview />
        </div>
    );
}
