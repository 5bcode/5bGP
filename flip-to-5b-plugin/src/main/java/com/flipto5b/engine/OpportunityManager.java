package com.flipto5b.engine;

import com.flipto5b.model.MarketSignal;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * The "Opportunity Manager" - Determines when to ABORT an active trade.
 *
 * <h2>Core Logic: Opportunity Cost Analysis</h2>
 * <p>
 * Compares the profit rate of the current position against potential new
 * opportunities:
 * <ul>
 * <li><b>Current Position:</b> Projected profit rate = (profit / time
 * elapsed)</li>
 * <li><b>New Opportunity:</b> Expected profit rate = (margin / estimated fill
 * time)</li>
 * </ul>
 *
 * <p>
 * <b>Trigger:</b> If NewRate > CurrentRate * 1.5, recommend CANCEL.
 *
 * @author FlipTo5B Team
 * @version 1.0
 */
@Slf4j
public class OpportunityManager {

    // =========================================================================
    // CONSTANTS
    // =========================================================================

    /**
     * Threshold multiplier: new opportunity must be 1.5x better to trigger cancel
     */
    private static final double OPPORTUNITY_THRESHOLD = 1.5;

    /** Minimum time (seconds) before considering a cancel to avoid churn */
    private static final long MIN_HOLD_SECONDS = 30;

    /** Maximum evaluation lookback for rate calculations (minutes) */
    private static final double MAX_RATE_WINDOW_MINUTES = 60.0;

    // =========================================================================
    // DATA CLASSES
    // =========================================================================

    /**
     * Result of opportunity cost evaluation.
     */
    @Getter
    @Builder
    public static class EvaluationResult {
        /** Whether cancellation is recommended */
        private final boolean shouldCancel;

        /** Current position's profit rate (GP per minute) */
        private final double currentProfitRate;

        /** New opportunity's profit rate (GP per minute) */
        private final double newOpportunityRate;

        /** Ratio of new rate to current rate */
        private final double improvementFactor;

        /** Human-readable recommendation */
        private final String recommendation;

        /** Estimated GP lost by not switching */
        private final int estimatedLossIfHold;

        /** The better opportunity's item name (if any) */
        private final String betterItemName;

        /** Urgency level: LOW, MEDIUM, HIGH */
        private final Urgency urgency;

        public enum Urgency {
            LOW, // No action needed
            MEDIUM, // Consider switching
            HIGH // Cancel immediately
        }
    }

    /**
     * Represents an active GE offer being tracked.
     */
    @Getter
    @Builder
    public static class ActiveOffer {
        /** The item's unique ID */
        private final int itemId;

        /** The item name */
        private final String itemName;

        /** The offer's buy price */
        private final int buyPrice;

        /** The offer's sell price (target) */
        private final int sellPrice;

        /** Total quantity in offer */
        private final int quantity;

        /** Quantity already filled */
        private final int quantityFilled;

        /** True if buying, false if selling */
        private final boolean isBuyOffer;

        /** When the offer was created */
        private final Instant createdAt;

        /** GE slot number (0-7) */
        private final int slot;

        /**
         * Returns the fill percentage (0.0 to 1.0).
         */
        public double getFillPercent() {
            return quantity > 0 ? (double) quantityFilled / quantity : 0;
        }

        /**
         * Returns true if the offer is partially filled.
         */
        public boolean isPartiallyFilled() {
            return quantityFilled > 0 && quantityFilled < quantity;
        }
    }

    // =========================================================================
    // SINGLE OFFER EVALUATION
    // =========================================================================

    /**
     * Evaluates whether to cancel an active GE offer based on opportunity cost.
     *
     * @param activeOffer    The currently active GE offer
     * @param newOpportunity A potentially better opportunity detected by
     *                       SignalEngine
     * @return Evaluation result with recommendation
     */
    public EvaluationResult evaluate(ActiveOffer activeOffer, MarketSignal newOpportunity) {
        // --- STEP 1: Calculate time elapsed ---
        Duration elapsed = Duration.between(activeOffer.getCreatedAt(), Instant.now());
        long secondsElapsed = elapsed.getSeconds();

        // Don't recommend cancel too quickly to avoid churn
        if (secondsElapsed < MIN_HOLD_SECONDS) {
            return EvaluationResult.builder()
                    .shouldCancel(false)
                    .currentProfitRate(0)
                    .newOpportunityRate(0)
                    .improvementFactor(0)
                    .recommendation("Hold - Too early to evaluate (< 30s)")
                    .estimatedLossIfHold(0)
                    .betterItemName(null)
                    .urgency(EvaluationResult.Urgency.LOW)
                    .build();
        }

        // --- STEP 2: Calculate current position's profit rate ---
        int currentMargin = PricingEngine.netMargin(
                activeOffer.getBuyPrice(),
                activeOffer.getSellPrice());
        int projectedProfit = currentMargin * activeOffer.getQuantity();

        // Estimate remaining time based on fill progress
        double fillPercent = activeOffer.getFillPercent();
        double minutesElapsed = secondsElapsed / 60.0;

        double estimatedTotalMinutes;
        if (fillPercent > 0.1) {
            // Extrapolate from current fill rate
            estimatedTotalMinutes = minutesElapsed / fillPercent;
        } else {
            // Default estimate if barely filled
            estimatedTotalMinutes = Math.max(10.0, minutesElapsed * 5);
        }

        // Cap to prevent unrealistic projections
        estimatedTotalMinutes = Math.min(estimatedTotalMinutes, MAX_RATE_WINDOW_MINUTES);

        double currentProfitRate = estimatedTotalMinutes > 0
                ? projectedProfit / estimatedTotalMinutes
                : 0; // GP per minute

        // --- STEP 3: Calculate new opportunity's profit rate ---
        int newMargin = (int) newOpportunity.getMarginAfterTax();
        double avgRecoveryMins = newOpportunity.getAvgRecoveryTime();

        // Estimate how many we can flip with same capital
        long capitalInUse = (long) activeOffer.getBuyPrice() * activeOffer.getQuantity();
        int newQty = newOpportunity.getWikiLow() > 0
                ? (int) (capitalInUse / newOpportunity.getWikiLow())
                : 0;
        newQty = Math.min(newQty, newOpportunity.getBuyLimit());
        newQty = Math.max(1, newQty);

        int newProjectedProfit = newMargin * newQty;
        double effectiveRecoveryTime = avgRecoveryMins > 0 ? avgRecoveryMins : 10.0;
        double newProfitRate = newProjectedProfit / effectiveRecoveryTime;

        // --- STEP 4: Compare rates ---
        double improvementFactor;
        if (currentProfitRate > 0) {
            improvementFactor = newProfitRate / currentProfitRate;
        } else {
            improvementFactor = newProfitRate > 0 ? Double.MAX_VALUE : 0;
        }

        boolean shouldCancel = improvementFactor >= OPPORTUNITY_THRESHOLD;

        // --- STEP 5: Calculate opportunity cost ---
        double remainingMinutes = Math.max(0, estimatedTotalMinutes - minutesElapsed);
        int opportunityCost = (int) ((newProfitRate - currentProfitRate) * remainingMinutes);
        opportunityCost = Math.max(0, opportunityCost);

        // --- STEP 6: Determine urgency ---
        EvaluationResult.Urgency urgency;
        if (improvementFactor >= 2.5) {
            urgency = EvaluationResult.Urgency.HIGH;
        } else if (improvementFactor >= OPPORTUNITY_THRESHOLD) {
            urgency = EvaluationResult.Urgency.MEDIUM;
        } else {
            urgency = EvaluationResult.Urgency.LOW;
        }

        // --- STEP 7: Build recommendation ---
        String recommendation;
        if (shouldCancel) {
            recommendation = String.format(
                    "CANCEL RECOMMENDED: %s offers %.1fx better rate (%.0f vs %.0f gp/min). " +
                            "Opportunity cost if hold: %,dgp",
                    newOpportunity.getItemName(),
                    improvementFactor,
                    newProfitRate,
                    currentProfitRate,
                    opportunityCost);
        } else if (improvementFactor > 1.0) {
            recommendation = String.format(
                    "HOLD: %s is %.1fx better but below %.1fx threshold. " +
                            "Current offer is acceptable.",
                    newOpportunity.getItemName(),
                    improvementFactor,
                    OPPORTUNITY_THRESHOLD);
        } else {
            recommendation = String.format(
                    "HOLD: Current offer on %s is optimal (%.0f gp/min)",
                    activeOffer.getItemName(),
                    currentProfitRate);
        }

        log.debug("OpportunityManager: {} vs {} -> Factor={:.2f}, Cancel={}",
                activeOffer.getItemName(),
                newOpportunity.getItemName(),
                improvementFactor,
                shouldCancel);

        return EvaluationResult.builder()
                .shouldCancel(shouldCancel)
                .currentProfitRate(currentProfitRate)
                .newOpportunityRate(newProfitRate)
                .improvementFactor(improvementFactor)
                .recommendation(recommendation)
                .estimatedLossIfHold(opportunityCost)
                .betterItemName(shouldCancel ? newOpportunity.getItemName() : null)
                .urgency(urgency)
                .build();
    }

    // =========================================================================
    // BATCH EVALUATION
    // =========================================================================

    /**
     * Evaluates all active offers against all new signals.
     * Returns the best cancellation candidate, if any.
     *
     * @param activeOffers List of currently active GE offers
     * @param newSignals   List of new market signals from SignalEngine
     * @return The best evaluation result (highest improvement factor)
     */
    public EvaluationResult evaluateBest(
            List<ActiveOffer> activeOffers,
            List<MarketSignal> newSignals) {
        if (activeOffers.isEmpty() || newSignals.isEmpty()) {
            return EvaluationResult.builder()
                    .shouldCancel(false)
                    .recommendation("No offers or signals to evaluate")
                    .urgency(EvaluationResult.Urgency.LOW)
                    .build();
        }

        EvaluationResult best = null;
        double bestImprovement = 0;

        for (ActiveOffer offer : activeOffers) {
            for (MarketSignal signal : newSignals) {
                // Skip self-comparison
                if (offer.getItemId() == signal.getItemId()) {
                    continue;
                }

                // Skip signals that aren't actionable
                if (signal.getAction() == MarketSignal.SignalAction.WAIT ||
                        signal.getAction() == MarketSignal.SignalAction.HOLD) {
                    continue;
                }

                EvaluationResult result = evaluate(offer, signal);

                if (result.getImprovementFactor() > bestImprovement) {
                    best = result;
                    bestImprovement = result.getImprovementFactor();
                }
            }
        }

        if (best != null) {
            log.info("OpportunityManager: Best switch opportunity has {:.2f}x improvement",
                    best.getImprovementFactor());
            return best;
        }

        return EvaluationResult.builder()
                .shouldCancel(false)
                .recommendation("No better opportunities found - all positions optimal")
                .urgency(EvaluationResult.Urgency.LOW)
                .build();
    }

    /**
     * Finds the single best opportunity from a list of signals.
     *
     * @param signals  List of market signals
     * @param minScore Minimum opportunity score threshold
     * @return Optional containing the best signal, or empty if none qualify
     */
    public Optional<MarketSignal> findBestOpportunity(
            List<MarketSignal> signals,
            double minScore) {
        return signals.stream()
                .filter(s -> s.getOpportunityScore() >= minScore)
                .filter(s -> s.getAction() == MarketSignal.SignalAction.BUY ||
                        s.getAction() == MarketSignal.SignalAction.ACCUMULATE)
                .filter(MarketSignal::isSafeForTimeframe)
                .max((a, b) -> Double.compare(
                        a.getOpportunityScore() * a.getConfidence(),
                        b.getOpportunityScore() * b.getConfidence()));
    }

    // =========================================================================
    // UTILITY METHODS
    // =========================================================================

    /**
     * Calculates the "stale offer" threshold - how long before an offer
     * should be considered for cancellation regardless of opportunity cost.
     *
     * @param buyLimit     The item's GE buy limit
     * @param avgVolume24h Average 24h volume
     * @return Maximum minutes before offer is considered stale
     */
    public int calculateStaleThreshold(int buyLimit, int avgVolume24h) {
        if (avgVolume24h <= 0) {
            return 120; // Default 2 hours for unknown items
        }

        // Higher volume = shorter acceptable wait
        double volumeRatio = (double) buyLimit / avgVolume24h;

        // Scale: 1% of daily volume = ~15 min, 10% = ~60 min, 100% = ~240 min
        int threshold = (int) (15 + volumeRatio * 200);

        return Math.min(240, Math.max(15, threshold));
    }

    /**
     * Determines if an offer should be force-cancelled due to staleness.
     *
     * @param offer        The active offer
     * @param avgVolume24h Item's 24h volume
     * @return true if offer should be cancelled due to age
     */
    public boolean isStaleOffer(ActiveOffer offer, int avgVolume24h) {
        int threshold = calculateStaleThreshold(offer.getQuantity(), avgVolume24h);
        Duration elapsed = Duration.between(offer.getCreatedAt(), Instant.now());
        return elapsed.toMinutes() > threshold;
    }
}
