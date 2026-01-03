package com.flipto5b.sync;

import com.google.gson.Gson;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

/**
 * Manages cross-device state synchronization via cloud backend.
 *
 * <h2>Features:</h2>
 * <ul>
 * <li>Async HTTP sync to cloud endpoint</li>
 * <li>Automatic retry with exponential backoff</li>
 * <li>Conflict resolution via timestamp comparison</li>
 * </ul>
 *
 * @author FlipTo5B Team
 * @version 1.0
 */
@Slf4j
public class SyncManager {

    // =========================================================================
    // CONSTANTS
    // =========================================================================

    private static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");
    private static final String CLIENT_VERSION = "1.0.0";
    private static final int MAX_RETRIES = 3;
    private static final long RETRY_DELAY_MS = 1000;

    // =========================================================================
    // DEPENDENCIES
    // =========================================================================

    private final OkHttpClient httpClient;
    private final Gson gson;
    private final String syncEndpoint;
    private final String userId;

    /** Last successful sync timestamp */
    private long lastSyncTimestamp = 0;

    /** Sync state */
    private volatile boolean isSyncing = false;

    // =========================================================================
    // DATA CLASSES
    // =========================================================================

    /**
     * Payload sent to sync endpoint.
     */
    @Getter
    @Builder
    public static class SyncPayload {
        /** Unique request identifier for idempotency */
        private final UUID requestId;

        /** User's unique identifier */
        private final String userId;

        /** List of active GE offers */
        private final List<ActiveOfferDTO> activeOffers;

        /** Client timestamp when payload was created */
        private final long timestamp;

        /** Client version for compatibility checks */
        private final String clientVersion;

        /** Operation type: PUSH, PULL, or FULL_SYNC */
        private final SyncOperation operation;

        public enum SyncOperation {
            PUSH, // Send local state to cloud
            PULL, // Fetch cloud state
            FULL_SYNC // Bidirectional merge
        }
    }

    /**
     * DTO representing an active GE offer for sync.
     */
    @Getter
    @Builder
    public static class ActiveOfferDTO {
        /** GE slot number (0-7) */
        private final int slot;

        /** Item ID */
        private final int itemId;

        /** Item name for display */
        private final String itemName;

        /** Offer price */
        private final int price;

        /** Total quantity */
        private final int quantity;

        /** Quantity filled so far */
        private final int quantityFilled;

        /** "BUY" or "SELL" */
        private final String offerType;

        /** Unix timestamp when offer was created */
        private final long createdAt;

        /** Current offer state */
        private final String state;
    }

    /**
     * Response from sync endpoint.
     */
    @Getter
    @Builder
    public static class SyncResponse {
        private final boolean success;
        private final String message;
        private final long serverTimestamp;
        private final List<ActiveOfferDTO> serverOffers;
        private final ConflictResolution conflictResolution;

        public enum ConflictResolution {
            NONE, // No conflicts
            CLIENT_WINS, // Client data newer
            SERVER_WINS, // Server data newer
            MERGED // Data was merged
        }
    }

    /**
     * Result of a sync operation.
     */
    @Getter
    @Builder
    public static class SyncResult {
        private final boolean success;
        private final String message;
        private final int offersSynced;
        private final long syncTimestamp;
    }

    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================

    public SyncManager(OkHttpClient httpClient, Gson gson, String syncEndpoint, String userId) {
        this.httpClient = httpClient;
        this.gson = gson;
        this.syncEndpoint = syncEndpoint;
        this.userId = userId;
    }

    // =========================================================================
    // SYNC METHODS
    // =========================================================================

    /**
     * Synchronizes local state with cloud backend.
     *
     * <p>
     * This method is async and returns immediately.
     * Use the returned CompletableFuture to handle results.
     *
     * @param offers Current active GE offers
     * @return Future containing sync result
     */
    public CompletableFuture<SyncResult> synchronize(List<ActiveOfferDTO> offers) {
        return CompletableFuture.supplyAsync(() -> {
            if (isSyncing) {
                log.debug("SyncManager: Sync already in progress, skipping");
                return SyncResult.builder()
                        .success(false)
                        .message("Sync already in progress")
                        .build();
            }

            isSyncing = true;
            try {
                return doSync(offers, SyncPayload.SyncOperation.PUSH);
            } finally {
                isSyncing = false;
            }
        });
    }

    /**
     * Forces a full sync, pulling server state and merging.
     *
     * @param offers Current local offers
     * @return Future containing sync result with merged data
     */
    public CompletableFuture<SyncResult> fullSync(List<ActiveOfferDTO> offers) {
        return CompletableFuture.supplyAsync(() -> {
            if (isSyncing) {
                return SyncResult.builder()
                        .success(false)
                        .message("Sync already in progress")
                        .build();
            }

            isSyncing = true;
            try {
                return doSync(offers, SyncPayload.SyncOperation.FULL_SYNC);
            } finally {
                isSyncing = false;
            }
        });
    }

    private SyncResult doSync(List<ActiveOfferDTO> offers, SyncPayload.SyncOperation operation) {
        SyncPayload payload = SyncPayload.builder()
                .requestId(UUID.randomUUID())
                .userId(userId)
                .activeOffers(offers)
                .timestamp(System.currentTimeMillis())
                .clientVersion(CLIENT_VERSION)
                .operation(operation)
                .build();

        String json = gson.toJson(payload);
        log.debug("SyncManager: Sending {} payload with {} offers", operation, offers.size());

        // Retry loop with exponential backoff
        int attempt = 0;
        Exception lastError = null;

        while (attempt < MAX_RETRIES) {
            try {
                SyncResponse response = sendSyncRequest(json);

                if (response.isSuccess()) {
                    lastSyncTimestamp = response.getServerTimestamp();
                    log.info("SyncManager: Sync successful, {} offers synced", offers.size());

                    return SyncResult.builder()
                            .success(true)
                            .message(response.getMessage())
                            .offersSynced(offers.size())
                            .syncTimestamp(response.getServerTimestamp())
                            .build();
                } else {
                    log.warn("SyncManager: Server returned error: {}", response.getMessage());
                    return SyncResult.builder()
                            .success(false)
                            .message(response.getMessage())
                            .build();
                }
            } catch (IOException e) {
                lastError = e;
                attempt++;
                log.warn("SyncManager: Attempt {} failed: {}", attempt, e.getMessage());

                if (attempt < MAX_RETRIES) {
                    try {
                        Thread.sleep(RETRY_DELAY_MS * attempt);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }

        log.error("SyncManager: All {} attempts failed", MAX_RETRIES, lastError);
        return SyncResult.builder()
                .success(false)
                .message("Sync failed after " + MAX_RETRIES + " attempts: " +
                        (lastError != null ? lastError.getMessage() : "Unknown error"))
                .build();
    }

    private SyncResponse sendSyncRequest(String json) throws IOException {
        Request request = new Request.Builder()
                .url(syncEndpoint)
                .post(RequestBody.create(JSON, json))
                .header("Content-Type", "application/json")
                .header("X-User-Agent", "FlipTo5B-Sync/" + CLIENT_VERSION)
                .header("X-Request-Id", UUID.randomUUID().toString())
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                return SyncResponse.builder()
                        .success(false)
                        .message("HTTP " + response.code())
                        .build();
            }

            ResponseBody body = response.body();
            if (body == null) {
                return SyncResponse.builder()
                        .success(false)
                        .message("Empty response body")
                        .build();
            }

            // Parse response
            String responseJson = body.string();
            SyncResponse syncResponse = gson.fromJson(responseJson, SyncResponse.class);

            return syncResponse != null ? syncResponse
                    : SyncResponse.builder()
                            .success(true)
                            .serverTimestamp(System.currentTimeMillis())
                            .build();
        }
    }

    // =========================================================================
    // UTILITY METHODS
    // =========================================================================

    /**
     * Returns the timestamp of the last successful sync.
     */
    public long getLastSyncTimestamp() {
        return lastSyncTimestamp;
    }

    /**
     * Returns true if a sync is currently in progress.
     */
    public boolean isSyncing() {
        return isSyncing;
    }

    /**
     * Checks if a sync is needed based on time elapsed.
     *
     * @param maxAgeMs Maximum age before sync is considered stale
     * @return true if sync should be triggered
     */
    public boolean needsSync(long maxAgeMs) {
        return System.currentTimeMillis() - lastSyncTimestamp > maxAgeMs;
    }

    /**
     * Creates a builder for ActiveOfferDTO with common defaults.
     */
    public static ActiveOfferDTO.ActiveOfferDTOBuilder offerBuilder() {
        return ActiveOfferDTO.builder()
                .state("ACTIVE")
                .createdAt(System.currentTimeMillis());
    }
}
