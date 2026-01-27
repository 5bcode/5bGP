package com.flipto5b.model;

import java.time.Duration;

public class GELimitTracker {
    private long nextRefreshMillis;
    private int itemsBought;

    // Default constructor for GSON
    public GELimitTracker() {
    }

    public void recordPurchase(int qty) {
        long now = System.currentTimeMillis();

        // If we are past the refresh time, or it's a fresh tracker (0), reset
        if (nextRefreshMillis == 0 || now > nextRefreshMillis) {
            // New window starts NOW.
            // Reset itemsBought to just this purchase
            nextRefreshMillis = now + Duration.ofHours(4).toMillis();
            itemsBought = qty;
        } else {
            // Within window, just add
            itemsBought += qty;
        }
    }

    public int getItemsBought() {
        // If window expired, effectively 0 (until next buy resets it properly,
        // but for display purposes we should show 0 if expired)
        if (System.currentTimeMillis() > nextRefreshMillis) {
            return 0;
        }
        return itemsBought;
    }

    public long getRemainingMillis() {
        long now = System.currentTimeMillis();
        if (now > nextRefreshMillis) {
            return 0;
        }
        return nextRefreshMillis - now;
    }

    public String getRemainingTimeLabel() {
        long millis = getRemainingMillis();
        if (millis <= 0)
            return "Ready";

        long hours = java.util.concurrent.TimeUnit.MILLISECONDS.toHours(millis);
        long minutes = java.util.concurrent.TimeUnit.MILLISECONDS.toMinutes(millis) % 60;

        if (hours > 0) {
            return String.format("%dh %dm", hours, minutes);
        } else {
            return String.format("%dm", minutes);
        }
    }

    // Aliases regarding recent refactor or unified naming
    public int getBoughtInLast4Hours() {
        return getItemsBought();
    }

    public long getNextResetTime() {
        return nextRefreshMillis;
    }
}
