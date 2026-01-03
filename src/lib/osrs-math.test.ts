import { describe, it, expect } from 'vitest';
import { calculateTax, calculateVolatility, calculateDumpScore } from './osrs-math';

describe('Tax Engine', () => {
    it('should calculate 2% tax correctly', () => {
        expect(calculateTax(100)).toBe(2);
        expect(calculateTax(1000)).toBe(20);
        expect(calculateTax(10000)).toBe(200);
    });

    it('should ignore tax for items under 50gp', () => {
        expect(calculateTax(49)).toBe(0);
        expect(calculateTax(10)).toBe(0);
    });

    it('should cap tax at 5,000,000gp', () => {
        const TWISTED_BOW = 1_000_000_000; // 1B
        // 2% of 1B is 20M, but cap is 5M
        expect(calculateTax(TWISTED_BOW)).toBe(5_000_000);

        const ELYSIAN = 600_000_000; // 600M
        // 2% of 600M is 12M, cap is 5M
        expect(calculateTax(ELYSIAN)).toBe(5_000_000);

        const EXACT_CAP = 250_000_000; // 250M
        // 2% of 250M is 5M
        expect(calculateTax(EXACT_CAP)).toBe(5_000_000);
    });
});

describe('Volatility Index', () => {
    it('should calculate spread ratio correctly (0-100 scale)', () => {
        // High: 110, Low: 100 -> Spread 10, Ratio 0.1 -> *1000 = 100
        // But wait, our formula is min(100, ratio*1000)
        // Let's verify logic: SpreadRatio = (High-Low)/Low

        // 1% Spread: 101/100 -> Ratio 0.01 -> Score 10
        expect(calculateVolatility(101, 100)).toBeCloseTo(10);

        // 5% Spread: 105/100 -> Ratio 0.05 -> Score 50
        expect(calculateVolatility(105, 100)).toBeCloseTo(50);

        // 10% Spread (MAX): 110/100 -> Ratio 0.10 -> Score 100
        expect(calculateVolatility(110, 100)).toBeCloseTo(100);

        // Extreme Spread: 200/100 -> Ratio 1.0 -> Score 100 (Capped)
        expect(calculateVolatility(200, 100)).toBe(100);
    });

    it('should handle zero low price gracefully', () => {
        expect(calculateVolatility(100, 0)).toBe(0);
    });
});

describe('Dump Score', () => {
    it('should detect a crash', () => {
        // Avg: 100, Current: 80 -> 20% drop
        // Score = drop * 100 = 20
        expect(calculateDumpScore(80, 100)).toBeCloseTo(20);

        // Avg: 100, Current: 50 -> 50% drop -> Score 50
        expect(calculateDumpScore(50, 100)).toBeCloseTo(50);
    });

    it('should return 0 if price is higher than average', () => {
        expect(calculateDumpScore(120, 100)).toBe(0);
    });
});
