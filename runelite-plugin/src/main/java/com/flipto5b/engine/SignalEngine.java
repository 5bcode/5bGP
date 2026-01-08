package com.flipto5b.engine;

import com.flipto5b.FlipTo5BPlugin.WikiPrice;
import com.flipto5b.model.MarketSignal;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import net.runelite.client.game.ItemManager;
import okhttp3.*;

import java.io.IOException;
import java.lang.reflect.Type;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * The "Signal Engine" - Scans thousands of items to find optimal flips.
 *
 * <h2>Core Features:</h2>
 * <ul>
 * <li><b>Dynamic Weighting:</b> Shifts focus based on TimeHorizon</li>
 * <li><b>Elasticity Check:</b> Filters items by recovery time</li>
 * <li><b>Multi-factor Scoring:</b> RSI, Momentum, Spread, Volume</li>
 * </ul>
 *
 * @author FlipTo5B Team
 * @version 1.0
 */
@Slf4j
public class SignalEngine {

    // =========================================================================
    // CONSTANTS
    // =========================================================================

    private static final String WIKI_LATEST_URL = "https://prices.runescape.wiki/api/v1/osrs/latest";
    private static final String WIKI_24H_URL = "https://prices.runescape.wiki/api/v1/osrs/24h";
    private static final String USER_AGENT = "FlipTo5B-SignalEngine/1.0";

    /** Minimum volume to consider an item tradeable */
    private static final int MIN_VOLUME_THRESHOLD = 50;

    /** Maximum items to return in signal list */
    private static final int MAX_SIGNALS = 25;

    // =========================================================================
    // DEPENDENCIES
    // =========================================================================

    private final OkHttpClient httpClient;
    private final Gson gson;
    private final ItemManager itemManager;

    /** Cache of item buy limits (populated from wiki mapping) */
    private final Map<Integer, Integer> buyLimitCache = new ConcurrentHashMap<>();

    /** Cache of item names */
    private final Map<Integer, String> itemNameCache = new ConcurrentHashMap<>();

    /** Historical average recovery times (mocked/estimated) */
    private final Map<Integer, Double> recoveryTimeCache = new ConcurrentHashMap<>();

    // =========================================================================
    // CONFIGURATION
    // =========================================================================

    /**
     * Signal engine configuration.
     */
    @Getter
    @Builder
    public static class SignalConfig {
        /** Time horizon in minutes (5 to 480) */
        private final int timeHorizonMinutes;

        /** Risk tolerance level */
        private final RiskTolerance riskTolerance;

        /** Minimum opportunity score to include */
        @Builder.Default
        private final double minScore = 30.0;

        /** Maximum number of signals to return */
        @Builder.Default
        private final int maxResults = MAX_SIGNALS;

        public enum RiskTolerance {
            LOW(0.5, 25, 75),
            MEDIUM(1.0, 30, 70),
            HIGH(1.5, 40, 60);

            public final double riskMultiplier;
            public final int rsiBuyThreshold;
            public final int rsiSellThreshold;

            RiskTolerance(double riskMultiplier, int rsiBuy, int rsiSell) {
                this.riskMultiplier = riskMultiplier;
                this.rsiBuyThreshold = rsiBuy;
                this.rsiSellThreshold = rsiSell;
            }
        }
    }

    /**
     * Dynamic weight profile based on time horizon.
     */
    @Getter
    @Builder
    public static class WeightProfile {
        private final double spreadWeight;
        private final double orderBookWeight;
        private final double volumeSurgeWeight;
        private final double baselineDeviationWeight;
        private final double volumeConsistencyWeight;
        private final double trendStrengthWeight;
        private final double rsiWeight;
        private final double riskPenaltyWeight;
    }

    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================

    public SignalEngine(OkHttpClient httpClient, Gson gson, ItemManager itemManager) {
        this.httpClient = httpClient;
        this.gson = gson;
        this.itemManager = itemManager;
    }

    // =========================================================================
    // MAIN SCAN METHOD
    // =========================================================================

    /**
     * Scans all tradeable items and returns ranked signals.
     *
     * <p>
     * This method is designed to run on a background thread.
     * Do NOT call from the Swing EDT or game thread.
     *
     * @param config The signal configuration
     * @return List of MarketSignals sorted by opportunity score
     */
    public List<MarketSignal> scan(SignalConfig config) {
        log.info("SignalEngine: Starting scan with TimeHorizon={}m, Risk={}",
                config.getTimeHorizonMinutes(), config.getRiskTolerance());

        try {
            // Fetch latest prices
            Map<Integer, WikiPrice> latestPrices = fetchLatestPrices();
            Map<Integer, VolumeData> volumeData = fetch24hVolume();

            if (latestPrices.isEmpty()) {
                log.warn("SignalEngine: No price data available");
                return Collections.emptyList();
            }

            // Calculate weight profile for this time horizon
            WeightProfile weights = calculateWeights(config.getTimeHorizonMinutes());

            // Process each item
            List<MarketSignal> signals = new ArrayList<>();

            for (Map.Entry<Integer, WikiPrice> entry : latestPrices.entrySet()) {
                int itemId = entry.getKey();
                WikiPrice price = entry.getValue();

                // Skip items with bad data
                if (price.high <= 0 || price.low <= 0 || price.high <= price.low) {
                    continue;
                }

                // Get volume data
                VolumeData vol = volumeData.getOrDefault(itemId, new VolumeData());
                if (vol.totalVolume < MIN_VOLUME_THRESHOLD) {
                    continue;
                }

                // Calculate signal
                MarketSignal signal = calculateSignal(itemId, price, vol, weights, config);

                // Apply elasticity check
                if (!passesElasticityCheck(signal, config.getTimeHorizonMinutes())) {
                    continue;
                }

                // Apply minimum score filter
                if (signal.getOpportunityScore() >= config.getMinScore()) {
                    signals.add(signal);
                }
            }

            // Sort by opportunity score * confidence
            signals.sort((a, b) -> Double.compare(
                    b.getOpportunityScore() * b.getConfidence(),
                    a.getOpportunityScore() * a.getConfidence()));

            // Limit results
            List<MarketSignal> result = signals.stream()
                    .limit(config.getMaxResults())
                    .collect(Collectors.toList());

            log.info("SignalEngine: Scan complete. Found {} signals from {} items",
                    result.size(), latestPrices.size());

            return result;

        } catch (Exception e) {
            log.error("SignalEngine: Scan failed", e);
            return Collections.emptyList();
        }
    }

    // =========================================================================
    // DYNAMIC WEIGHTING
    // =========================================================================

    /**
     * Calculates dynamic weights based on time horizon.
     *
     * <p>
     * Short-term (5-30m): Prioritize spread, volume surges, order book
     * <p>
     * Long-term (2-8h): Prioritize baseline deviation, trend, consistency
     *
     * @param timeHorizonMinutes User's flip interval
     * @return Weight profile for scoring
     */
    public WeightProfile calculateWeights(int timeHorizonMinutes) {
        // Normalize time to 0.0 (5m) to 1.0 (480m)
        double t = Math.min(1.0, Math.max(0.0, (timeHorizonMinutes - 5.0) / 475.0));

        // Short-term factors: decay as time increases
        double spreadWeight = 0.30 * (1 - t);
        double orderBookWeight = 0.25 * (1 - t);
        double volumeSurgeWeight = 0.20 * (1 - t);

        // Long-term factors: grow as time increases
        double baselineDeviationWeight = 0.35 * t;
        double volumeConsistencyWeight = 0.25 * t;
        double trendStrengthWeight = 0.20 * t;

        // Always-relevant factors (constant)
        double rsiWeight = 0.15;
        double riskPenaltyWeight = 0.10;

        log.debug("SignalEngine: Weights for {}m -> Spread={:.2f}, Baseline={:.2f}",
                timeHorizonMinutes, spreadWeight, baselineDeviationWeight);

        return WeightProfile.builder()
                .spreadWeight(spreadWeight)
                .orderBookWeight(orderBookWeight)
                .volumeSurgeWeight(volumeSurgeWeight)
                .baselineDeviationWeight(baselineDeviationWeight)
                .volumeConsistencyWeight(volumeConsistencyWeight)
                .trendStrengthWeight(trendStrengthWeight)
                .rsiWeight(rsiWeight)
                .riskPenaltyWeight(riskPenaltyWeight)
                .build();
    }

    // =========================================================================
    // ELASTICITY CHECK
    // =========================================================================

    /**
     * Filters items where AvgRecoveryTime > TimeHorizon * 3.
     *
     * <p>
     * For 5-minute flips, only items with < 15min avg recovery pass.
     *
     * @param signal             The market signal
     * @param timeHorizonMinutes User's flip interval
     * @return true if item passes the check
     */
    public boolean passesElasticityCheck(MarketSignal signal, int timeHorizonMinutes) {
        double maxAllowedRecovery = timeHorizonMinutes * 3.0;
        boolean passes = signal.getAvgRecoveryTime() <= maxAllowedRecovery;

        if (!passes) {
            log.debug("SignalEngine: {} failed elasticity check (recovery={:.1f}m > max={:.1f}m)",
                    signal.getItemName(), signal.getAvgRecoveryTime(), maxAllowedRecovery);
        }

        return passes;
    }

    // =========================================================================
    // SIGNAL CALCULATION
    // =========================================================================

    private MarketSignal calculateSignal(
            int itemId,
            WikiPrice price,
            VolumeData volume,
            WeightProfile weights,
            SignalConfig config) {
        String itemName = getItemName(itemId);
        int buyLimit = getBuyLimit(itemId);

        // Basic metrics
        int spread = price.high - price.low;
        double spreadPercent = price.low > 0 ? (double) spread / price.low * 100 : 0;
        int marginAfterTax = PricingEngine.netMargin(price.low, price.high);
        double roi = price.low > 0 ? (double) marginAfterTax / price.low * 100 : 0;

        // Simulated RSI (in production, calculate from timeseries)
        double rsi = calculateSimulatedRSI(price, volume);

        // Simulated momentum
        double momentum = calculateSimulatedMomentum(price, volume);

        // Baseline deviation (simplified - in production use historical data)
        double baselineDeviation = calculateBaselineDeviation(price, volume);

        // Recovery time estimate
        double avgRecoveryTime = estimateRecoveryTime(itemId, volume, spreadPercent);

        // Anomaly detection
        boolean isAnomaly = detectAnomaly(spreadPercent, volume);

        // Calculate opportunity score
        double score = calculateOpportunityScore(
                marginAfterTax, roi, volume.totalVolume, spreadPercent,
                rsi, momentum, baselineDeviation, weights, config);

        // Calculate confidence
        double confidence = calculateConfidence(score, volume.totalVolume, isAnomaly);

        // Determine action
        MarketSignal.SignalAction action = determineAction(score, rsi, config);

        return MarketSignal.builder()
                .itemId(itemId)
                .itemName(itemName)
                .timestamp(System.currentTimeMillis())
                .wikiHigh(price.high)
                .wikiLow(price.low)
                .volume24h(volume.totalVolume)
                .buyLimit(buyLimit)
                .spreadPercent(spreadPercent)
                .marginAfterTax(marginAfterTax)
                .roiPercent(roi)
                .rsi(rsi)
                .momentum(momentum)
                .baselineDeviation(baselineDeviation)
                .avgRecoveryTime(avgRecoveryTime)
                .opportunityScore(score)
                .confidence(confidence)
                .action(action)
                .isAnomaly(isAnomaly)
                .isSafeForTimeframe(avgRecoveryTime <= config.getTimeHorizonMinutes() * 3)
                .build();
    }

    private double calculateOpportunityScore(
            int margin, double roi, int volume, double spreadPct,
            double rsi, double momentum, double baselineDeviation,
            WeightProfile w, SignalConfig config) {
        double score = 50.0; // Base score

        // Spread component (short-term)
        if (spreadPct > 2.0)
            score += 15 * w.getSpreadWeight();
        else if (spreadPct > 1.0)
            score += 8 * w.getSpreadWeight();
        else if (spreadPct < 0.5)
            score -= 10 * w.getSpreadWeight();

        // Volume component
        double volScore = Math.log10(Math.max(1, volume)) * 5;
        score += volScore * w.getVolumeSurgeWeight();

        // RSI component
        if (rsi < config.getRiskTolerance().rsiBuyThreshold) {
            score += 20 * w.getRsiWeight(); // Oversold = buy opportunity
        } else if (rsi > config.getRiskTolerance().rsiSellThreshold) {
            score -= 15 * w.getRsiWeight(); // Overbought
        }

        // Baseline deviation (long-term)
        if (baselineDeviation < -10) {
            score += 25 * w.getBaselineDeviationWeight(); // Crashed = opportunity
        } else if (baselineDeviation > 10) {
            score -= 15 * w.getBaselineDeviationWeight(); // Pumped = risky
        }

        // Momentum
        if (momentum > 5)
            score += 10 * w.getTrendStrengthWeight();
        else if (momentum < -5)
            score -= 5 * w.getTrendStrengthWeight();

        // ROI bonus
        if (roi > 5)
            score += 10;
        else if (roi > 2)
            score += 5;

        // Normalize to 0-100
        return Math.max(0, Math.min(100, score));
    }

    private double calculateConfidence(double score, int volume, boolean isAnomaly) {
        double confidence = Math.abs(score - 50) * 2;

        // Volume boost
        if (volume > 10000)
            confidence *= 1.2;
        else if (volume < 100)
            confidence *= 0.7;

        // Anomaly penalty
        if (isAnomaly)
            confidence *= 0.6;

        return Math.max(0, Math.min(100, confidence));
    }

    private MarketSignal.SignalAction determineAction(
            double score, double rsi, SignalConfig config) {
        if (score >= 80)
            return MarketSignal.SignalAction.BUY;
        if (score >= 70)
            return MarketSignal.SignalAction.ACCUMULATE;
        if (score <= 25)
            return MarketSignal.SignalAction.SELL;
        if (score <= 35)
            return MarketSignal.SignalAction.WAIT;
        return MarketSignal.SignalAction.HOLD;
    }

    // =========================================================================
    // SIMULATED INDICATORS (Replace with real data in production)
    // =========================================================================

    private double calculateSimulatedRSI(WikiPrice price, VolumeData volume) {
        // Simplified RSI based on spread and volume ratio
        double spreadRatio = price.low > 0 ? (double) price.high / price.low : 1;
        double volumeRatio = volume.highVolume > 0 ? (double) volume.lowVolume / volume.highVolume : 1;

        // Higher sell volume = lower RSI (more selling pressure)
        double rsi = 50 + (volumeRatio - 1) * 30 + (1 - spreadRatio) * 20;
        return Math.max(0, Math.min(100, rsi));
    }

    private double calculateSimulatedMomentum(WikiPrice price, VolumeData volume) {
        // Positive if buy volume > sell volume
        int volumeDiff = volume.lowVolume - volume.highVolume;
        return volumeDiff > 0 ? Math.min(50, volumeDiff / 100.0) : Math.max(-50, volumeDiff / 100.0);
    }

    private double calculateBaselineDeviation(WikiPrice price, VolumeData volume) {
        // In production, compare to 30-day average
        // Simulated: assume current is baseline, return small random deviation
        return (Math.random() - 0.5) * 10;
    }

    private double estimateRecoveryTime(int itemId, VolumeData volume, double spreadPct) {
        // Cached value if available
        if (recoveryTimeCache.containsKey(itemId)) {
            return recoveryTimeCache.get(itemId);
        }

        // Estimate: higher volume = faster recovery, higher spread = slower
        double baseTime = 10.0; // 10 minutes base
        double volumeFactor = volume.totalVolume > 1000 ? 0.5 : (volume.totalVolume > 100 ? 1.0 : 2.0);
        double spreadFactor = spreadPct > 5 ? 2.0 : (spreadPct > 2 ? 1.5 : 1.0);

        double estimate = baseTime * volumeFactor * spreadFactor;
        recoveryTimeCache.put(itemId, estimate);
        return estimate;
    }

    private boolean detectAnomaly(double spreadPct, VolumeData volume) {
        // Anomaly if spread is extremely high (>20%) or volume spike
        return spreadPct > 20 || volume.totalVolume > volume.avgVolume * 5;
    }

    // =========================================================================
    // API CALLS
    // =========================================================================

    private Map<Integer, WikiPrice> fetchLatestPrices() throws IOException {
        Request request = new Request.Builder()
                .url(WIKI_LATEST_URL)
                .header("User-Agent", USER_AGENT)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            ResponseBody responseBody = response.body();
            if (!response.isSuccessful() || responseBody == null) {
                return Collections.emptyMap();
            }

            String body = responseBody.string();
            JsonObject json = gson.fromJson(body, JsonObject.class);
            JsonObject data = json.getAsJsonObject("data");

            Type type = new TypeToken<Map<Integer, WikiPrice>>() {
            }.getType();
            Map<Integer, WikiPrice> result = gson.fromJson(data, type);
            return result != null ? result : Collections.emptyMap();
        }
    }

    private Map<Integer, VolumeData> fetch24hVolume() throws IOException {
        Request request = new Request.Builder()
                .url(WIKI_24H_URL)
                .header("User-Agent", USER_AGENT)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            ResponseBody responseBody = response.body();
            if (!response.isSuccessful() || responseBody == null) {
                return Collections.emptyMap();
            }

            String body = responseBody.string();
            JsonObject json = gson.fromJson(body, JsonObject.class);
            JsonObject data = json.getAsJsonObject("data");

            Map<Integer, VolumeData> result = new HashMap<>();
            for (String key : data.keySet()) {
                try {
                    int itemId = Integer.parseInt(key);
                    JsonObject item = data.getAsJsonObject(key);

                    VolumeData vol = new VolumeData();
                    vol.highVolume = item.has("highPriceVolume") ? item.get("highPriceVolume").getAsInt() : 0;
                    vol.lowVolume = item.has("lowPriceVolume") ? item.get("lowPriceVolume").getAsInt() : 0;
                    vol.totalVolume = vol.highVolume + vol.lowVolume;
                    vol.avgVolume = vol.totalVolume; // Simplified

                    result.put(itemId, vol);
                } catch (NumberFormatException ignored) {
                }
            }
            return result;
        }
    }

    // =========================================================================
    // UTILITY METHODS
    // =========================================================================

    private String getItemName(int itemId) {
        return itemNameCache.computeIfAbsent(itemId, id -> {
            try {
                return itemManager.getItemComposition(id).getName();
            } catch (Exception e) {
                return "Item #" + id;
            }
        });
    }

    private int getBuyLimit(int itemId) {
        return buyLimitCache.getOrDefault(itemId, 8); // Default limit
    }

    public void setBuyLimits(Map<Integer, Integer> limits) {
        buyLimitCache.putAll(limits);
    }

    // =========================================================================
    // HELPER CLASSES
    // =========================================================================

    private static class VolumeData {
        int highVolume;
        int lowVolume;
        int totalVolume;
        int avgVolume;
    }
}
