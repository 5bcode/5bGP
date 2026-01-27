package com.flipto5b.controller;

import com.flipto5b.FlipTo5BConfig;
import com.flipto5b.FlipTo5BPlugin;

import com.flipto5b.sync.SyncManager;
import com.flipto5b.ui.FlipTo5BPanel;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.awt.Color;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

import javax.inject.Inject;

import lombok.extern.slf4j.Slf4j;
import net.runelite.api.Client;
import net.runelite.api.GrandExchangeOffer;
import net.runelite.api.GrandExchangeOfferState;
import net.runelite.api.ItemComposition;
import net.runelite.client.game.ItemManager;

@Slf4j
public class TradeController {

    private final Client client;
    private final FlipTo5BConfig config;
    private final ItemManager itemManager;
    private final SyncManager syncManager;
    private final Gson gson;
    private final FlipTo5BPlugin plugin;

    // Cache local history to avoid reading file constantly
    private final List<FlipTo5BPlugin.OfferData> tradeHistory = new ArrayList<>();

    // Track limits

    @Inject
    public TradeController(Client client, FlipTo5BConfig config, ItemManager itemManager,
            SyncManager syncManager, Gson gson, FlipTo5BPlugin plugin) {
        this.client = client;
        this.config = config;
        this.itemManager = itemManager;
        this.syncManager = syncManager;
        this.gson = gson;
        this.plugin = plugin;

        loadTradeHistory();
        // Limit trackers are loaded by Plugin currently, we might want to move that
        // here later
    }

    public void onGrandExchangeOfferChanged(GrandExchangeOffer offer, int slot) {
        GrandExchangeOfferState state = offer.getState();
        log.debug("GE Offer Changed: Slot {} State {}", slot, state);

        // 1. History & Limits
        if (state == GrandExchangeOfferState.BOUGHT || state == GrandExchangeOfferState.SOLD) {
            handleCompletedTrade(offer, state == GrandExchangeOfferState.BOUGHT);
        }

        // 2. Sync to Cloud
        if (syncManager != null && !config.apiKey().isEmpty()) {
            syncOfferToCloud(offer, slot);
        }
    }

    private void handleCompletedTrade(GrandExchangeOffer offer, boolean isBuy) {
        int itemId = offer.getItemId();
        ItemComposition itemComp = itemManager.getItemComposition(itemId);
        String name = itemComp.getName();
        int qty = offer.getQuantitySold();
        int price = offer.getSpent() / (qty > 0 ? qty : 1);

        // Add to history UI (via Plugin/Panel access or direct?)
        // We will decouple this: Plugin calls Controller -> Controller returns data or
        // triggers event?
        // For now, let's keep it simple: Controller has ref to Plugin, can call update.
        // Ideally we'd use an EventBus but direct call is fine for this size.

        // Log trade
        FlipTo5BPlugin.OfferData tradeData = new FlipTo5BPlugin.OfferData();
        tradeData.itemId = itemId;
        tradeData.itemName = name;
        tradeData.quantity = qty;
        tradeData.price = price;
        tradeData.timestamp = System.currentTimeMillis();
        // tradeData.offerType = isBuy ? "buy" : "sell"; // OfferData uses specific
        // fields logic in legacy

        if (isBuy) {
            tradeData.buyPrice = price;
            tradeData.sellPrice = 0;
            // Update Limit Tracker
            if (plugin != null) {
                plugin.updateGELimit(itemId, qty);
            }
        } else {
            tradeData.buyPrice = 0;
            tradeData.sellPrice = price;
        }

        tradeHistory.add(tradeData);
        saveTradeToFile(tradeData);

        // Sync completed trade to cloud
        if (syncManager != null && !config.apiKey().isEmpty()) {
            syncManager.logTrade(tradeData);
        }
    }

    private void syncOfferToCloud(GrandExchangeOffer offer, int slot) {
        // Capture state of all active offers to keep cloud in sync
        List<FlipTo5BPlugin.OfferData> offerList = new ArrayList<>();
        GrandExchangeOffer[] offers = client.getGrandExchangeOffers();
        if (offers != null) {
            for (int i = 0; i < offers.length; i++) {
                GrandExchangeOffer o = offers[i];
                if (o == null)
                    continue;

                GrandExchangeOfferState state = o.getState();
                if (state == GrandExchangeOfferState.BUYING || state == GrandExchangeOfferState.SELLING) {
                    FlipTo5BPlugin.OfferData data = new FlipTo5BPlugin.OfferData();
                    data.slot = i;
                    data.itemId = o.getItemId();
                    // Note: getItemComposition must be called on client thread, ensure this is
                    // running there
                    // or use previously cached name if possible. For now assuming client thread.
                    data.itemName = itemManager.getItemComposition(o.getItemId()).getName();
                    data.price = o.getPrice();
                    data.quantity = o.getTotalQuantity();
                    data.quantityFilled = o.getQuantitySold();
                    data.state = state.name();
                    data.offerType = state == GrandExchangeOfferState.BUYING ? "buy" : "sell";
                    offerList.add(data);
                }
            }
        }
        syncManager.synchronize(offerList);
    }

    public List<FlipTo5BPanel.PanelOffer> getActiveOffers() {
        GrandExchangeOffer[] offers = client.getGrandExchangeOffers();
        if (offers == null)
            return java.util.Collections.emptyList();

        List<FlipTo5BPanel.PanelOffer> panelOffers = new ArrayList<>();
        for (GrandExchangeOffer o : offers) {
            if (o == null)
                continue;
            if (o.getState() == GrandExchangeOfferState.BUYING || o.getState() == GrandExchangeOfferState.SELLING) {
                int itemId = o.getItemId();
                String name = itemManager.getItemComposition(itemId).getName();
                int qty = o.getTotalQuantity() - o.getQuantitySold();
                int price = o.getPrice();
                String status = o.getState() == GrandExchangeOfferState.BUYING ? "Buying" : "Selling";
                Color color = o.getState() == GrandExchangeOfferState.BUYING ? Color.ORANGE : Color.YELLOW;

                // We need icon, async. Pass null or handle in UI?
                // UI expects AsyncBufferedImage.
                net.runelite.client.util.AsyncBufferedImage icon = itemManager.getImage(itemId);

                // Pricing check
                FlipTo5BPlugin.WikiPrice wp = plugin.getWikiPrice(itemId);
                if (wp != null) {
                    if (o.getState() == GrandExchangeOfferState.BUYING) {
                        if (price >= wp.high) {
                            status = "Insta Buy";
                            color = Color.GREEN;
                        } else if (price >= wp.low) {
                            status = "Compet.";
                            color = Color.BLUE;
                        }
                    } else {
                        if (price <= wp.low) {
                            status = "Insta Sell";
                            color = Color.GREEN;
                        } else if (price <= wp.high) {
                            status = "Compet.";
                            color = Color.BLUE;
                        }
                    }
                }

                panelOffers.add(new FlipTo5BPanel.PanelOffer(name, itemId, qty, price, status, color, icon));
            }
        }
        return panelOffers;
    }

    private void loadTradeHistory() {
        File dir = new File(net.runelite.client.RuneLite.RUNELITE_DIR, "flipto5b");
        File file = new File(dir, "trades.json");
        if (!file.exists())
            return;

        try (FileReader reader = new FileReader(file)) {
            Type listType = new TypeToken<ArrayList<FlipTo5BPlugin.OfferData>>() {
            }.getType();
            List<FlipTo5BPlugin.OfferData> loaded = gson.fromJson(reader, listType);
            if (loaded != null) {
                tradeHistory.addAll(loaded);
            }
        } catch (IOException e) {
            log.error("Failed to load trades", e);
        }
    }

    private void saveTradeToFile(FlipTo5BPlugin.OfferData trade) {
        File dir = new File(net.runelite.client.RuneLite.RUNELITE_DIR, "flipto5b");
        if (!dir.exists())
            dir.mkdirs();
        File file = new File(dir, "trades.json");

        try {
            // Re-read entire list to append? Or just overwrite with in-memory list?
            // Safer to overwrite with in-memory list if we trust it's in sync.
            try (FileWriter writer = new FileWriter(file)) {
                gson.toJson(tradeHistory, writer);
            }
        } catch (IOException e) {
            log.error("Failed to save trade", e);
        }
    }
}
