package com.flipto5b.model;

import lombok.Builder;
import lombok.Getter;

/**
 * Core data structure representing a trading signal for an item.
 * Produced by SignalEngine, consumed by PricingEngine and UI.
 * 
 * <p>
 * This POJO encapsulates all market data, technical indicators,
 * and computed scores needed for trading decisions.
 */
@Getter
@Builder
public class MarketSignal {

    // =========================================================================
    // IDENTIFICATION
    // =========================================================================

    /** The item's unique ID in OSRS */
    private final int itemId;

    /** Human-readable item name */
    private final String itemName;

    /** Unix timestamp when this signal was generated */
    private final long timestamp;

    // =========================================================================
    // RAW MARKET DATA
    // =========================================================================

    /** Wiki "high" price - where sellers are (insta-buy price) */
    private final int wikiHigh;

    /** Wiki "low" price - where buyers are (insta-sell price) */
    private final int wikiLow;

    /** 24-hour trade volume from Wiki API */
    private final int volume24h;

    /** GE buy limit for this item */
    private final int buyLimit;

    // =========================================================================
    // CALCULATED METRICS
    // =========================================================================

    /** Spread as percentage: (high - low) / low * 100 */
    private final double spreadPercent;

    /** Net profit per flip after 2% GE tax */
    private final double marginAfterTax;

    /** Return on investment per flip: (margin / buyPrice) * 100 */
    private final double roiPercent;

    // =========================================================================
    // TECHNICAL INDICATORS
    // =========================================================================

    /** Relative Strength Index (0-100) */
    private final double rsi;

    /** Price momentum (-100 to +100) based on EMA crossovers */
    private final double momentum;

    /** Percentage deviation from 30-day weighted baseline */
    private final double baselineDeviation;

    /** Average minutes for price to recover after a dip (historical) */
    private final double avgRecoveryTime;

    // =========================================================================
    // SIGNAL SCORING
    // =========================================================================

    /** Composite opportunity score (0-100) considering all factors */
    private final double opportunityScore;

    /** Confidence in this signal (0-100) */
    private final double confidence;

    /** Recommended action based on analysis */
    private final SignalAction action;

    // =========================================================================
    // RISK FLAGS
    // =========================================================================

    /** True if pump/dump or flash spike detected */
    private final boolean isAnomaly;

    /** True if item passes elasticity check for user's timeframe */
    private final boolean isSafeForTimeframe;

    /**
     * Enumeration of possible trading actions.
     */
    public enum SignalAction {
        /** Strong buy signal - enter position */
        BUY,

        /** Strong sell signal - exit position */
        SELL,

        /** Neutral - maintain current position */
        HOLD,

        /** Market unstable - do not trade */
        WAIT,

        /** Gradual accumulation opportunity */
        ACCUMULATE
    }

    // =========================================================================
    // UTILITY METHODS
    // =========================================================================

    /**
     * Returns the raw spread in GP (not percentage).
     */
    public int getSpreadGp() {
        return wikiHigh - wikiLow;
    }

    /**
     * Returns true if this is a bullish signal (BUY or ACCUMULATE).
     */
    public boolean isBullish() {
        return action == SignalAction.BUY || action == SignalAction.ACCUMULATE;
    }

    /**
     * Returns true if the signal has high confidence (>= 70%).
     */
    public boolean isHighConfidence() {
        return confidence >= 70.0;
    }

    /**
     * Returns a human-readable summary of the signal.
     */
    public String getSummary() {
        return String.format(
                "%s: %s (%.0f%% conf) - Margin: %.0fgp, ROI: %.2f%%",
                itemName,
                action.name(),
                confidence,
                marginAfterTax,
                roiPercent);
    }

    @Override
    public String toString() {
        return getSummary();
    }
}
