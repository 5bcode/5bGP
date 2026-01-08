package com.flipto5b.engine;

import com.flipto5b.model.MarketSignal;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

/**
 * The "Sniper" Logic - Calculates exact GP-precise buy/sell recommendations.
 *
 * <h2>Pricing Formulae:</h2>
 * <ul>
 * <li><b>Buy Price:</b> Max(HighestActiveBuy, RecentSupport) + 1gp
 * (undercut)</li>
 * <li><b>Sell Price:</b> Min(LowestActiveSell, RecentResistance) - 1gp</li>
 * <li><b>Quantity:</b> min(SafeLimit, MaxCash * RiskMultiplier)</li>
 * </ul>
 *
 * <p>
 * All calculations account for the 2% GE Tax (capped at 5M GP).
 *
 * @author FlipTo5B Team
 * @version 1.0
 */
@Slf4j
public class PricingEngine {

    // =========================================================================
    // CONSTANTS
    // =========================================================================

    /** GE tax rate as of May 2025 update */
    private static final double TAX_RATE = 0.02;

    /** Maximum tax per item sale */
    private static final int TAX_CAP = 5_000_000;

    /** Minimum item price that incurs tax (2% of 49 = 0.98, floors to 0) */
    private static final int TAX_THRESHOLD = 50;

    /** Risk multipliers for position sizing: [Low, Medium, High] */
    private static final double[] RISK_MULTIPLIERS = { 0.05, 0.10, 0.20 };

    // =========================================================================
    // DATA CLASSES
    // =========================================================================

    /**
     * Complete price recommendation with all relevant calculations.
     */
    @Getter
    @Builder
    public static class PriceRecommendation {
        /** Recommended buy price in GP */
        private final int buyAt;

        /** Recommended sell price in GP */
        private final int sellAt;

        /** Recommended quantity to trade */
        private final int quantity;

        /** Gross profit before tax */
        private final int grossProfit;

        /** Net profit after tax */
        private final int netProfit;

        /** Tax amount per item */
        private final int taxAmount;

        /** Effective ROI percentage */
        private final double effectiveRoi;

        /** Human-readable reasoning */
        private final String reasoning;

        /** Stop-loss price recommendation */
        private final int stopLoss;

        /** Take-profit price target */
        private final int takeProfit;
    }

    // =========================================================================
    // MAIN CALCULATION METHOD
    // =========================================================================

    /**
     * Calculates optimal price recommendations for a given item.
     *
     * @param signal       The market signal containing current price data
     * @param userCash     The user's available GP for trading
     * @param riskLevel    Risk tolerance: 0 = Low, 1 = Medium, 2 = High
     * @param supportPrice Historical support price (e.g., 7-day low)
     * @param resistPrice  Historical resistance price (e.g., 7-day high)
     * @return A fully computed PriceRecommendation
     */
    public PriceRecommendation calculate(
            MarketSignal signal,
            long userCash,
            int riskLevel,
            int supportPrice,
            int resistPrice) {
        log.debug("PricingEngine: Calculating for {} (ID: {})",
                signal.getItemName(), signal.getItemId());

        // --- STEP 1: Determine Buy Price ---
        // Buy at: Max of (current insta-sell + 1) or (support + 1)
        // This undercuts the current highest buyer or catches bounce from support
        int highestBuyOffer = signal.getWikiLow(); // Wiki "low" = where buyers are
        int buyPrice = Math.max(highestBuyOffer, supportPrice) + 1;

        // --- STEP 2: Determine Sell Price ---
        // Sell at: Min of (current insta-buy - 1) or (resistance - 1)
        // Undercuts the current lowest seller or respects resistance
        int lowestSellOffer = signal.getWikiHigh(); // Wiki "high" = where sellers are
        int sellPrice = Math.min(lowestSellOffer, resistPrice) - 1;

        // Sanity check: don't recommend negative margin trades
        if (sellPrice <= buyPrice) {
            log.warn("PricingEngine: Negative margin detected, adjusting sell price");
            sellPrice = buyPrice + 1; // Force minimum 1gp margin
        }

        // --- STEP 3: Calculate Tax ---
        int taxAmount = calculateTax(sellPrice);

        // --- STEP 4: Determine Quantity ---
        double riskMultiplier = RISK_MULTIPLIERS[Math.min(riskLevel, 2)];
        long maxCashToRisk = (long) (userCash * riskMultiplier);
        int geLimit = signal.getBuyLimit();

        // Safe quantity: minimum of (what we can afford) and (GE limit)
        int affordableQty = buyPrice > 0 ? (int) (maxCashToRisk / buyPrice) : 0;
        int quantity = Math.min(affordableQty, geLimit);
        quantity = Math.max(1, quantity); // At least 1

        // --- STEP 5: Calculate Profits ---
        int grossProfit = (sellPrice - buyPrice) * quantity;
        int totalTax = taxAmount * quantity;
        int netProfit = grossProfit - totalTax;
        double effectiveRoi = buyPrice > 0
                ? (double) netProfit / (buyPrice * quantity) * 100
                : 0;

        // --- STEP 6: Calculate Stop-Loss and Take-Profit ---
        double stopLossMultiplier = riskLevel == 0 ? 0.97 : (riskLevel == 1 ? 0.95 : 0.93);
        int stopLoss = (int) Math.floor(buyPrice * stopLossMultiplier);

        // Take-profit more aggressive for higher risk tolerance
        double takeProfitMultiplier = riskLevel == 0 ? 1.05 : (riskLevel == 1 ? 1.10 : 1.15);
        int takeProfit = (int) Math.ceil(sellPrice * takeProfitMultiplier);

        // --- STEP 7: Build Reasoning ---
        StringBuilder reasoning = new StringBuilder();
        reasoning.append(String.format("Buy at %,dgp (Support: %,dgp), ", buyPrice, supportPrice));
        reasoning.append(String.format("Sell at %,dgp (Resist: %,dgp). ", sellPrice, resistPrice));
        reasoning.append(String.format("Tax: %,dgp/ea. ", taxAmount));
        reasoning.append(String.format("Net: %,dgp (%.2f%% ROI)", netProfit, effectiveRoi));

        log.info("PricingEngine: {} -> Buy@{}, Sell@{}, Qty={}, Net={}",
                signal.getItemName(), buyPrice, sellPrice, quantity, netProfit);

        return PriceRecommendation.builder()
                .buyAt(buyPrice)
                .sellAt(sellPrice)
                .quantity(quantity)
                .grossProfit(grossProfit)
                .netProfit(netProfit)
                .taxAmount(taxAmount)
                .effectiveRoi(effectiveRoi)
                .reasoning(reasoning.toString())
                .stopLoss(stopLoss)
                .takeProfit(takeProfit)
                .build();
    }

    // =========================================================================
    // TAX CALCULATION UTILITIES
    // =========================================================================

    /**
     * Calculates GE tax for a single item sale.
     * 
     * <p>
     * Tax is 2% of sell price, capped at 5M GP.
     * Items sold under 50gp have 0 tax (floor).
     *
     * @param sellPrice The sell price of the item
     * @return The tax amount in GP
     */
    public static int calculateTax(int sellPrice) {
        if (sellPrice < TAX_THRESHOLD) {
            return 0;
        }
        int tax = (int) Math.floor(sellPrice * TAX_RATE);
        return Math.min(tax, TAX_CAP);
    }

    /**
     * Calculates after-tax margin between two prices.
     *
     * @param buyPrice  The buy price
     * @param sellPrice The sell price
     * @return Net margin after tax
     */
    public static int netMargin(int buyPrice, int sellPrice) {
        return sellPrice - buyPrice - calculateTax(sellPrice);
    }

    /**
     * Calculates the break-even sell price given a buy price.
     * 
     * <p>
     * Formula: sellPrice where (sellPrice - buyPrice - tax) = 0
     * Solving: sellPrice * 0.98 = buyPrice → sellPrice = buyPrice / 0.98
     *
     * @param buyPrice The buy price
     * @return The minimum sell price to break even
     */
    public static int breakEvenSellPrice(int buyPrice) {
        // Account for tax: sell * 0.98 - buy = 0 → sell = buy / 0.98
        return (int) Math.ceil(buyPrice / (1.0 - TAX_RATE));
    }

    /**
     * Calculates the maximum buy price for a target profit margin.
     *
     * @param sellPrice    Expected sell price
     * @param targetMargin Desired net profit per item
     * @return Maximum buy price to achieve target margin
     */
    public static int maxBuyPrice(int sellPrice, int targetMargin) {
        int tax = calculateTax(sellPrice);
        return sellPrice - tax - targetMargin;
    }

    // =========================================================================
    // POSITION SIZING UTILITIES
    // =========================================================================

    /**
     * Calculates the optimal position size based on Kelly Criterion (simplified).
     * 
     * <p>
     * Kelly Formula: f* = (bp - q) / b
     * Where: b = odds, p = win probability, q = loss probability
     *
     * @param winRate      Historical win rate (0.0 to 1.0)
     * @param avgWin       Average profit on winning trades
     * @param avgLoss      Average loss on losing trades
     * @param totalCapital Total available capital
     * @return Recommended position size in GP
     */
    public long calculateKellyPosition(
            double winRate,
            double avgWin,
            double avgLoss,
            long totalCapital) {
        if (avgLoss <= 0 || winRate <= 0 || winRate >= 1) {
            return (long) (totalCapital * 0.05); // Default to 5%
        }

        double b = avgWin / avgLoss; // Odds
        double p = winRate;
        double q = 1 - winRate;

        double kellyFraction = (b * p - q) / b;

        // Apply half-Kelly for safety
        kellyFraction = Math.max(0, Math.min(0.25, kellyFraction * 0.5));

        return (long) (totalCapital * kellyFraction);
    }
}
