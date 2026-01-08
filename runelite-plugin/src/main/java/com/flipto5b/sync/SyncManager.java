package com.flipto5b.sync;

import com.google.gson.Gson;
import com.google.gson.annotations.SerializedName;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * Manages synchronization directly with Supabase Database via REST API.
 */
@Slf4j
public class SyncManager {

    private static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");

    private final OkHttpClient httpClient;
    private final Gson gson;
    private final String supabaseUrl;
    private final String supabaseKey;
    private final String userId;

    private volatile boolean isSyncing = false;

    // Map DTO to Supabase snake_case columns
    @Getter
    @Builder
    public static class ActiveOfferRow {
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
        @SerializedName("updated_at")
        private final String updatedAt; // ISO string
    }

    public SyncManager(OkHttpClient httpClient, Gson gson, String supabaseUrl, String supabaseKey, String userId) {
        this.httpClient = httpClient;
        this.gson = gson;
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        this.userId = userId;
    }

    public void synchronize(List<com.flipto5b.FlipTo5BPlugin.OfferData> offers) {
        if (isSyncing)
            return;
        isSyncing = true;

        CompletableFuture.runAsync(() -> {
            try {
                // Convert plugin offers to Supabase rows
                List<ActiveOfferRow> rows = offers.stream().map(o -> ActiveOfferRow.builder()
                        .userId(userId)
                        .slot(o.slot)
                        .itemId(o.itemId)
                        .itemName(o.itemName)
                        .price(o.price)
                        .quantity(o.quantity)
                        .quantityFilled(0) // Plugin doesn't track this yet perfectly, defaulting
                        .offerType(o.offerType)
                        .status(o.state)
                        .updatedAt(java.time.Instant.now().toString())
                        .build()).collect(Collectors.toList());

                if (rows.isEmpty()) {
                    isSyncing = false;
                    return;
                }

                String jsonBody = gson.toJson(rows);

                // Supabase Upsert URL
                String url = supabaseUrl + "/rest/v1/active_offers?on_conflict=user_id,slot";

                Request request = new Request.Builder()
                        .url(url)
                        .post(RequestBody.create(JSON, jsonBody))
                        .header("apikey", supabaseKey)
                        .header("Authorization", "Bearer " + supabaseKey)
                        .header("Prefer", "resolution=merge-duplicates")
                        .build();

                try (Response response = httpClient.newCall(request).execute()) {
                    if (!response.isSuccessful()) {
                        log.warn("Sync failed: HTTP " + response.code() + " " + response.message());
                        ResponseBody body = response.body();
                        if (body != null) {
                            log.warn("Body: " + body.string());
                        }
                    } else {
                        log.debug("Sync successful: " + rows.size() + " offers updated");
                    }
                }
            } catch (Exception e) {
                log.error("Sync error", e);
            } finally {
                isSyncing = false;
            }
        });
    }
}
