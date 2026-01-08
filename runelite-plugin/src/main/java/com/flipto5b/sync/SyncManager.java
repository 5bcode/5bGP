package com.flipto5b.sync;

import com.google.gson.Gson;
import com.google.gson.annotations.SerializedName;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * Manages synchronization directly with Supabase Database via REST API.
 * 
 * NOTE: Currently DISABLED due to RLS policy issues.
 * Requires either:
 * 1. Proper user authentication (session token)
 * 2. Or service_role key (security risk)
 */
@Slf4j
public class SyncManager {

    private static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");

    // TOGGLE: Set to true to enable sync (requires RLS fix)
    private static final boolean SYNC_ENABLED = true;

    private final OkHttpClient httpClient;
    private final Gson gson;
    private final String supabaseUrl;
    private final String supabaseKey;
    private final String userId;

    private volatile boolean isSyncing = false;
    private volatile long lastSyncTime = 0;
    private static final long SYNC_COOLDOWN_MS = 10000; // 10 second cooldown

    @Getter
    @Builder
    public static class ActiveOfferRow {
        private final String id;

        @SerializedName("user_id")
        private final String userId;

        private final int slot;

        @SerializedName("item_id")
        private final int itemId;

        @SerializedName("item_name")
        private final String itemName;

        private final int price;

        private final int quantity;

        @SerializedName("quantity_filled")
        private final int quantityFilled;

        @SerializedName("offer_type")
        private final String offerType;

        private final String status;

        private final long timestamp;
    }

    public SyncManager(OkHttpClient httpClient, Gson gson, String supabaseUrl, String supabaseKey, String userId) {
        this.httpClient = httpClient;
        this.gson = gson;
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        this.userId = userId;

        if (SYNC_ENABLED) {
            log.info("SyncManager initialized for user: {}", userId);
        } else {
            log.info("SyncManager initialized but DISABLED (RLS policy issue)");
        }
    }

    public void synchronize(List<com.flipto5b.FlipTo5BPlugin.OfferData> offers) {
        // Sync is disabled until RLS is properly configured
        if (!SYNC_ENABLED) {
            return;
        }

        // Prevent concurrent syncs and rate limit
        if (isSyncing) {
            return;
        }

        long now = System.currentTimeMillis();
        if (now - lastSyncTime < SYNC_COOLDOWN_MS) {
            return;
        }

        isSyncing = true;
        lastSyncTime = now;

        CompletableFuture.runAsync(() -> {
            try {
                List<ActiveOfferRow> rows = offers.stream()
                        .map(o -> ActiveOfferRow.builder()
                                .userId(userId)
                                .slot(o.slot)
                                .itemId(o.itemId)
                                .itemName(o.itemName != null ? o.itemName : "Unknown")
                                .price(o.price)
                                .quantity(o.quantity)
                                .quantityFilled(o.quantityFilled)
                                .offerType(o.offerType)
                                .status(o.state) // Map state to status
                                .timestamp(System.currentTimeMillis())
                                .build())
                        .collect(Collectors.toList());

                if (rows.isEmpty()) {
                    return;
                }

                String jsonBody = gson.toJson(rows);
                String url = supabaseUrl + "/rest/v1/active_offers?on_conflict=user_id,slot";

                Request request = new Request.Builder()
                        .url(url)
                        .post(RequestBody.create(JSON, jsonBody))
                        .header("apikey", supabaseKey)
                        .header("Authorization", "Bearer " + supabaseKey)
                        .header("Content-Type", "application/json")
                        .header("Prefer", "resolution=merge-duplicates")
                        .build();

                try (Response response = httpClient.newCall(request).execute()) {
                    if (!response.isSuccessful()) {
                        ResponseBody body = response.body();
                        String errorBody = body != null ? body.string() : "No body";
                        log.warn("Sync failed: HTTP {} - {}", response.code(), errorBody);
                    } else {
                        log.info("Sync successful: {} offers updated", rows.size());
                    }
                }
            } catch (Exception e) {
                log.error("Sync error", e);
            } finally {
                isSyncing = false;
            }
        });
    }

    @Builder
    @Getter
    public static class TradeRow {
        private final String id;
        @SerializedName("user_id")
        private final String userId;
        @SerializedName("item_id")
        private final int itemId;
        @SerializedName("item_name")
        private final String itemName;
        @SerializedName("buy_price")
        private final Integer buyPrice;
        @SerializedName("sell_price")
        private final Integer sellPrice;
        private final int quantity;
        private final Integer profit;
        private final long timestamp;
    }

    public void logTrade(com.flipto5b.FlipTo5BPlugin.OfferData offer) {
        if (!SYNC_ENABLED)
            return;

        CompletableFuture.runAsync(() -> {
            try {
                // Determine if buy or sell
                boolean isBuy = "buy".equals(offer.offerType);

                TradeRow row = TradeRow.builder()
                        .id(UUID.randomUUID().toString())
                        .userId(userId)
                        .itemId(offer.itemId)
                        .itemName(offer.itemName)
                        .quantity(offer.quantityFilled) // Use filled quantity for logs
                        .buyPrice(isBuy ? offer.price : null)
                        .sellPrice(isBuy ? null : offer.price)
                        .profit(null) // API doesn't know profit yet
                        .timestamp(System.currentTimeMillis())
                        .build();

                String jsonBody = gson.toJson(row);
                String url = supabaseUrl + "/rest/v1/trades";

                Request request = new Request.Builder()
                        .url(url)
                        .post(RequestBody.create(JSON, jsonBody))
                        .header("apikey", supabaseKey)
                        .header("Authorization", "Bearer " + supabaseKey)
                        .header("Content-Type", "application/json")
                        .build();

                try (Response response = httpClient.newCall(request).execute()) {
                    if (response.isSuccessful()) {
                        log.info("Trade logged successfully: {}", offer.itemName);
                    } else {
                        log.warn("Failed to log trade: {}", response.code());
                    }
                }
            } catch (Exception e) {
                log.error("Error logging trade", e);
            }
        });
    }
}
