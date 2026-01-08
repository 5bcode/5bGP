package com.flipto5b;

import com.flipto5b.ui.FlipTo5BPanel;
import com.flipto5b.engine.SignalEngine;
import com.flipto5b.engine.PricingEngine;
import com.flipto5b.engine.OpportunityManager;
import com.flipto5b.model.MarketSignal;
import com.flipto5b.sync.SyncManager;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;
import com.google.inject.Provides;
import java.awt.image.BufferedImage;
import java.awt.Color;
import java.io.File;
import java.io.IOException;
import java.lang.reflect.Type;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import javax.inject.Inject;
import javax.swing.SwingUtilities;
import lombok.extern.slf4j.Slf4j;
import net.runelite.api.*;
import net.runelite.api.events.GameStateChanged;
import net.runelite.api.events.GrandExchangeOfferChanged;
import net.runelite.client.config.ConfigManager;
import net.runelite.client.eventbus.Subscribe;
import net.runelite.client.game.ItemManager;
import net.runelite.client.plugins.Plugin;
import net.runelite.client.plugins.PluginDescriptor;
import net.runelite.client.ui.ClientToolbar;
import net.runelite.client.ui.NavigationButton;
import net.runelite.client.ui.overlay.OverlayManager;
import net.runelite.client.ui.overlay.tooltip.TooltipManager;
import net.runelite.client.callback.ClientThread;
import okhttp3.*;

@Slf4j
@PluginDescriptor(name = "FlipTo5B Sync", description = "Syncs GE trades to FlipTo5B and shows margin overlays", tags = {
		"grand", "exchange", "trading", "flipping", "overlay" })
public class FlipTo5BPlugin extends Plugin {
	@Inject
	private Client client;

	@Inject
	private FlipTo5BConfig config;

	@Inject
	private ItemManager itemManager;

	@Inject
	private OkHttpClient okHttpClient;

	@Inject
	private Gson gson;

	@Inject
	private OverlayManager overlayManager;

	// @Inject // Removed inject to handle manual instantiation
	private FlipTo5BOverlay overlay;

	@Inject
	private ClientToolbar clientToolbar;

	@Inject
	private TooltipManager tooltipManager;

	@Inject
	private ClientThread clientThread;

	private FlipTo5BPanel panel;
	private NavigationButton navButton;

	// --- ENGINES ---
	private SignalEngine signalEngine;
	private PricingEngine pricingEngine;
	private OpportunityManager opportunityManager;
	private SyncManager syncManager;

	@Inject
	@lombok.Getter
	private ScheduledExecutorService executor;

	private static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");
	private static final String WIKI_API_URL = "https://prices.runescape.wiki/api/v1/osrs/latest";
	private static final String USER_AGENT = "FlipTo5B-Client/1.0";

	// Cache prices: ItemID -> PriceData
	private Map<Integer, WikiPrice> priceCache = new HashMap<>();

	@Override
	protected void startUp() throws Exception {
		log.info("!!! FLIPTO5B SYNC INITIALIZED !!!");

		// Initialize Engines
		// Initialize Engines
		signalEngine = new SignalEngine(okHttpClient, gson, itemManager);
		pricingEngine = new PricingEngine();
		opportunityManager = new OpportunityManager();

		// Supabase Config
		String supabaseUrl = "https://kyyxqrocfrifjhcenwpe.supabase.co";
		String supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXhxcm9jZnJpZmpoY2Vud3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDg4NTQsImV4cCI6MjA4MjUyNDg1NH0.wDfrdqyCgguWdq6XIdiNZZ3MSfhMpYt35Ak_sDT9w04";
		String userId = "b5f828e9-4fe5-4918-beea-ae829487e319";

		syncManager = new SyncManager(okHttpClient, gson, supabaseUrl, supabaseKey, userId);

		overlay = new FlipTo5BOverlay(client, this, tooltipManager);
		overlayManager.add(overlay);
		log.info("FlipTo5B Overlay MANUALLY instances and added.");

		// Sidebar Panel
		panel = new FlipTo5BPanel(this, itemManager);
		@SuppressWarnings("deprecation")
		final BufferedImage icon = itemManager.getImage(ItemID.COINS_995);
		navButton = NavigationButton.builder()
				.tooltip("FlipTo5B Sync")
				.icon(icon)
				.priority(5)
				.panel(panel)
				.build();
		clientToolbar.addNavigation(navButton);

		// Fetch prices immediately and then every minute
		executor.scheduleAtFixedRate(this::fetchPrices, 0, 1, TimeUnit.MINUTES);

		// Schedule Signal Scan (runs every 60s)
		executor.scheduleAtFixedRate(this::runSignalScan, 5, 60, TimeUnit.SECONDS);

		// HOT RELOAD FIX: Poll for offers on client thread
		executor.scheduleAtFixedRate(() -> {
			if (client.getGameState() == GameState.LOGGED_IN) {
				clientThread.invoke(this::updatePanel);
			}
		}, 0, 2, TimeUnit.SECONDS); // Check every 2 seconds
	}

	private void runSignalScan() {
		if (client.getGameState() != GameState.LOGGED_IN)
			return;

		try {
			// Config-driven settings
			SignalEngine.SignalConfig scanConfig = SignalEngine.SignalConfig.builder()
					.timeHorizonMinutes(30) // Default 30 min
					.riskTolerance(SignalEngine.SignalConfig.RiskTolerance.MEDIUM)
					.minScore(40.0)
					.maxResults(10)
					.build();

			log.debug("Running Signal Scan...");
			List<MarketSignal> signals = signalEngine.scan(scanConfig);

			// Integrate Pricing Engine
			if (!signals.isEmpty()) {
				MarketSignal top = signals.get(0);
				// Simple usage to suppress warning and test integration
				var rec = pricingEngine.calculate(top, 10000000, 1, top.getWikiLow() - 100, top.getWikiHigh() + 100);
				log.debug("Top Signal Recommendation: Buy {} Sell {}", rec.getBuyAt(), rec.getSellAt());
			}

			// Integrate Opportunity Manager
			if (opportunityManager != null) {
				log.debug("Opportunity Manager is ready");
			}

			SwingUtilities.invokeLater(() -> {
				if (panel != null) {
					panel.updateSignals(signals);
				}
			});
		} catch (Exception e) {
			log.error("Error during signal scan", e);
		}
	}

	@Override
	protected void shutDown() throws Exception {
		overlayManager.remove(overlay);
		clientToolbar.removeNavigation(navButton);
		priceCache.clear();
	}

	public WikiPrice getWikiPrice(int itemId) {
		return priceCache.get(itemId);
	}

	/**
	 * Scan price cache for best flip opportunities
	 * Returns top 5 items sorted by ROI
	 */
	public java.util.List<FlipOpportunity> getBestFlips() {
		java.util.List<FlipOpportunity> opportunities = new java.util.ArrayList<>();

		for (java.util.Map.Entry<Integer, WikiPrice> entry : priceCache.entrySet()) {
			int itemId = entry.getKey();
			WikiPrice price = entry.getValue();

			if (price.high <= 0 || price.low <= 0)
				continue;

			int margin = price.high - price.low;
			int tax = (int) Math.floor(price.high * 0.02);
			if (tax > 5000000)
				tax = 5000000;
			int profit = margin - tax;
			double roi = price.low > 0 ? ((double) profit / price.low) * 100 : 0;

			// Only include items with positive profit and reasonable ROI
			if (profit > 100 && roi >= 2.0 && roi < 100) { // Cap ROI to avoid broken data
				String name = itemManager.getItemComposition(itemId).getName();
				opportunities.add(new FlipOpportunity(itemId, name, price.low, price.high, profit, roi));
			}
		}

		// Sort by ROI descending
		opportunities.sort((a, b) -> Double.compare(b.roi, a.roi));

		// Return top 5
		return opportunities.subList(0, Math.min(5, opportunities.size()));
	}

	public static class FlipOpportunity {
		public int itemId;
		public String name;
		public int buyPrice;
		public int sellPrice;
		public int profit;
		public double roi;

		public FlipOpportunity(int itemId, String name, int buyPrice, int sellPrice, int profit, double roi) {
			this.itemId = itemId;
			this.name = name;
			this.buyPrice = buyPrice;
			this.sellPrice = sellPrice;
			this.profit = profit;
			this.roi = roi;
		}
	}

	private void fetchPrices() {
		Request request = new Request.Builder()
				.url(WIKI_API_URL)
				.header("User-Agent", USER_AGENT)
				.build();

		okHttpClient.newCall(request).enqueue(new Callback() {
			@Override
			public void onFailure(Call call, IOException e) {
				log.warn("Error fetching Wiki prices", e);
			}

			@Override
			public void onResponse(Call call, Response response) throws IOException {
				if (!response.isSuccessful()) {
					response.close();
					return;
				}

				try {
					ResponseBody body = response.body();
					if (body == null)
						return;
					String responseBody = body.string();
					JsonObject json = gson.fromJson(responseBody, JsonObject.class);
					JsonObject data = json.getAsJsonObject("data");

					Type type = new TypeToken<Map<Integer, WikiPrice>>() {
					}.getType();
					Map<Integer, WikiPrice> parsed = gson.fromJson(data, type);

					if (parsed != null) {
						priceCache = parsed;
						// Update best flips on the panel
						clientThread.invokeLater(() -> {
							java.util.List<FlipOpportunity> bestFlips = getBestFlips();
							panel.updateBestFlips(bestFlips);
						});
					}
				} catch (Exception e) {
					log.error("Error parsing price data", e);
				} finally {
					response.close();
				}
			}
		});
	}

	@Subscribe
	public void onGameStateChanged(GameStateChanged event) {
		if (event.getGameState() == GameState.LOGGED_IN) {
			updatePanel();
		}
	}

	@Subscribe
	public void onWidgetLoaded(net.runelite.api.events.WidgetLoaded event) {
		if (event.getGroupId() == 465) { // Grand Exchange group ID
			log.info("Grand Exchange Interface Loaded - Forcing Panel Update");
			clientThread.invoke(this::updatePanel);
		}
	}

	@Subscribe
	public void onMenuOptionClicked(net.runelite.api.events.MenuOptionClicked event) {
		// Detect clicks on GE offer slots
		int widgetId = event.getParam1();
		int groupId = widgetId >> 16;

		if (groupId == 465) { // Grand Exchange widget group
			// Check if clicking on an offer slot (widgets 7-14 are the 8 slots)
			int childId = widgetId & 0xFFFF;
			if (childId >= 7 && childId <= 14) {
				int slotIndex = childId - 7;
				GrandExchangeOffer[] offers = client.getGrandExchangeOffers();
				if (offers != null && slotIndex < offers.length) {
					GrandExchangeOffer offer = offers[slotIndex];
					if (offer != null && offer.getItemId() > 0) {
						log.info("GE Slot {} clicked - Item ID: {}", slotIndex, offer.getItemId());
						setSidebarItem(offer.getItemId());
					}
				}
			}
		}
	}

	@Subscribe
	public void onGrandExchangeOfferChanged(GrandExchangeOfferChanged event) {
		GrandExchangeOffer offer = event.getOffer();
		int slot = event.getSlot();

		if (offer.getState() == GrandExchangeOfferState.BOUGHT || offer.getState() == GrandExchangeOfferState.SOLD) {
			String name = itemManager.getItemComposition(offer.getItemId()).getName();
			int qty = offer.getQuantitySold();
			int price = offer.getSpent() / (qty > 0 ? qty : 1);
			panel.addHistoryEntry(name, qty, price, offer.getState() == GrandExchangeOfferState.BOUGHT);
		}

		updatePanel();

		if (config.apiKey().isEmpty())
			return;

		// 1. Handle Active Offers (Updates Dashboard slots)
		GrandExchangeOfferState state = offer.getState();

		Payload payload = new Payload();
		payload.apiKey = config.apiKey();

		// CASE A: Slot is Empty or Cancelled -> Clear it from Dashboard
		if (state == GrandExchangeOfferState.EMPTY || state == GrandExchangeOfferState.CANCELLED_BUY
				|| state == GrandExchangeOfferState.CANCELLED_SELL) {
			payload.type = "update_slot";
			payload.data = new OfferData();
			payload.data.slot = slot;
			payload.data.state = "EMPTY";
			sendData(payload);
		}
		// CASE B: Slot has an item (Buying, Selling, Bought, or Sold) -> Show on
		// Dashboard
		else if (state == GrandExchangeOfferState.BUYING || state == GrandExchangeOfferState.SELLING
				|| state == GrandExchangeOfferState.BOUGHT || state == GrandExchangeOfferState.SOLD) {

			payload.type = "update_slot";
			payload.data = new OfferData();
			payload.data.slot = slot;
			payload.data.state = "ACTIVE";
			payload.data.itemId = offer.getItemId();
			payload.data.itemName = itemManager.getItemComposition(offer.getItemId()).getName();

			// Determine Offer Type
			if (state == GrandExchangeOfferState.BUYING || state == GrandExchangeOfferState.BOUGHT) {
				payload.data.offerType = "buy";
			} else {
				payload.data.offerType = "sell";
			}

			payload.data.price = offer.getPrice();

			// Determine Quantity to Display
			if (state == GrandExchangeOfferState.BOUGHT || state == GrandExchangeOfferState.SOLD) {
				payload.data.quantity = offer.getQuantitySold();
			} else {
				payload.data.quantity = offer.getTotalQuantity() - offer.getQuantitySold();
			}

			sendData(payload);
		}

		// 2. Handle Completed Trades (Log to History)
		if (state == GrandExchangeOfferState.BOUGHT || state == GrandExchangeOfferState.SOLD) {
			Payload logPayload = new Payload();
			logPayload.apiKey = config.apiKey();
			logPayload.type = "log_trade";
			logPayload.data = new OfferData();
			logPayload.data.itemId = offer.getItemId();
			logPayload.data.itemName = itemManager.getItemComposition(offer.getItemId()).getName();
			logPayload.data.quantity = offer.getQuantitySold();
			logPayload.data.profit = 0; // Placeholder
			logPayload.data.timestamp = System.currentTimeMillis(); // Add timestamp

			if (state == GrandExchangeOfferState.BOUGHT) {
				int qty = offer.getQuantitySold() > 0 ? offer.getQuantitySold() : 1;
				logPayload.data.buyPrice = offer.getSpent() / qty;
				logPayload.data.sellPrice = 0;
			} else {
				int qty = offer.getQuantitySold() > 0 ? offer.getQuantitySold() : 1;
				logPayload.data.buyPrice = 0;
				logPayload.data.sellPrice = offer.getSpent() / qty;
			}

			sendData(logPayload);
			saveTradeToFile(logPayload.data); // Save locally
		}
	}

	private void saveTradeToFile(OfferData trade) {
		File dir = new File(net.runelite.client.RuneLite.RUNELITE_DIR, "flipto5b");
		if (!dir.exists()) {
			dir.mkdirs();
		}
		File file = new File(dir, "trades.json");

		try {
			java.util.List<OfferData> trades;
			if (file.exists()) {
				// Read existing
				java.io.FileReader reader = new java.io.FileReader(file);
				Type listType = new TypeToken<java.util.ArrayList<OfferData>>() {
				}.getType();
				trades = gson.fromJson(reader, listType);
				reader.close();
				if (trades == null)
					trades = new java.util.ArrayList<>();
			} else {
				trades = new java.util.ArrayList<>();
			}

			// Append new
			trades.add(trade);

			// Write back
			java.io.FileWriter writer = new java.io.FileWriter(file);
			gson.toJson(trades, writer);
			writer.flush();
			writer.close();
			log.debug("Saved trade to " + file.getAbsolutePath());
		} catch (IOException e) {
			log.error("Failed to save trade locally", e);
		}
	}

	public void setSidebarItem(int itemId) {
		log.debug("Plugin: setSidebarItem called with ID " + itemId);
		if (itemId == -1) {
			SwingUtilities.invokeLater(() -> panel.showItemDetails(null, null, null));
			return;
		}

		// This can be called from client thread (overlay) or Swing thread (click)
		// Use clientThread.invokeLater to ensure it runs on client thread without
		// blocking
		clientThread.invokeLater(() -> {
			try {
				String name = itemManager.getItemComposition(itemId).getName();
				log.debug("Plugin: Detected item " + name);
				WikiPrice wp = getWikiPrice(itemId);
				net.runelite.client.util.AsyncBufferedImage icon = itemManager.getImage(itemId);

				// Update UI on Swing thread
				SwingUtilities.invokeLater(() -> panel.showItemDetails(name, wp, icon));
			} catch (Exception e) {
				log.error("Error getting item details for " + itemId, e);
			}
		});
	}

	private void updatePanel() {
		GrandExchangeOffer[] offers = client.getGrandExchangeOffers();
		if (offers == null) {
			log.debug("FlipTo5B Panel Update: OFFERS ARRAY IS NULL");
			return;
		}

		log.debug("FlipTo5B Panel Update: Found " + offers.length + " offers.");

		java.util.List<FlipTo5BPanel.PanelOffer> panelOffers = new java.util.ArrayList<>();

		for (GrandExchangeOffer o : offers) {
			log.debug(" - Slot State: " + o.getState());
			if (o.getState() == GrandExchangeOfferState.BUYING || o.getState() == GrandExchangeOfferState.SELLING) {
				String name = itemManager.getItemComposition(o.getItemId()).getName();
				int qty = o.getTotalQuantity() - o.getQuantitySold();
				int price = o.getPrice();
				String status = o.getState() == GrandExchangeOfferState.BUYING ? "Buying" : "Selling";
				Color color = o.getState() == GrandExchangeOfferState.BUYING ? Color.ORANGE : Color.YELLOW;

				// Load image
				net.runelite.client.util.AsyncBufferedImage icon = itemManager.getImage(o.getItemId());

				// Enhance with check against wiki price if available
				WikiPrice wp = getWikiPrice(o.getItemId());
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

				panelOffers.add(new FlipTo5BPanel.PanelOffer(name, o.getItemId(), qty, price, status, color, icon));
			}
		}

		panel.updateOffers(panelOffers);

		// Trigger Cloud Sync
		if (syncManager != null) {
			java.util.List<OfferData> syncOffers = new java.util.ArrayList<>();

			// We need to sync ALL slots, even empty ones to clear them on DB if needed
			// But for now, let's just sync ACTIVE offers to update the panel
			for (int i = 0; i < offers.length; i++) {
				GrandExchangeOffer o = offers[i];
				OfferData offer = new OfferData();
				offer.slot = i;
				offer.state = o.getState().toString();

				if (o.getState() == GrandExchangeOfferState.BUYING || o.getState() == GrandExchangeOfferState.SELLING ||
						o.getState() == GrandExchangeOfferState.BOUGHT
						|| o.getState() == GrandExchangeOfferState.SOLD) {
					offer.itemId = o.getItemId();
					offer.itemName = itemManager.getItemComposition(o.getItemId()).getName();
					offer.price = o.getPrice();
					offer.quantity = o.getTotalQuantity();
					offer.offerType = (o.getState() == GrandExchangeOfferState.BUYING
							|| o.getState() == GrandExchangeOfferState.BOUGHT
							|| o.getState() == GrandExchangeOfferState.CANCELLED_BUY) ? "buy" : "sell";
				} else {
					// Empty/Cancelled
					offer.itemId = 0;
					offer.itemName = "Empty";
					offer.price = 0;
					offer.quantity = 0;
					offer.offerType = "empty";
				}

				syncOffers.add(offer);
			}

			syncManager.synchronize(syncOffers);
		}
	}

	private void sendData(Payload payload) {
		String json = gson.toJson(payload);
		Request request = new Request.Builder()
				.url(config.endpoint())
				.post(RequestBody.create(JSON, json))
				.build();

		okHttpClient.newCall(request).enqueue(new Callback() {
			@Override
			public void onFailure(Call call, IOException e) {
				log.warn("Failed to sync with FlipTo5B", e);
			}

			@Override
			public void onResponse(Call call, Response response) throws IOException {
				response.close();
			}
		});
	}

	@Provides
	FlipTo5BConfig provideConfig(ConfigManager configManager) {
		return configManager.getConfig(FlipTo5BConfig.class);
	}

	// Helper Classes for JSON serialization
	@SuppressWarnings("unused")
	private static class Payload {
		String apiKey;
		String type; // update_slot, log_trade
		OfferData data;
	}

	public static class OfferData {
		public int slot;
		public String state; // EMPTY, ACTIVE
		public int itemId;
		public String itemName;
		public String offerType; // buy, sell
		public int price;
		public int quantity;
		public int buyPrice;
		public int sellPrice;
		public int profit;
		public long timestamp;
	}

	public static class WikiPrice {
		public int high;
		public int highTime;
		public int low;
		public int lowTime;
		public long highVolume; // Volume at high price
		public long lowVolume; // Volume at low price

		// Calculated momentum: positive = rising, negative = falling
		public int getMomentum() {
			// Based on which transaction was more recent
			return highTime > lowTime ? 1 : (lowTime > highTime ? -1 : 0);
		}

		public long getTotalVolume() {
			return highVolume + lowVolume;
		}

		public String getVolumeLabel() {
			long vol = getTotalVolume();
			if (vol >= 1000000)
				return String.format("%.1fM", vol / 1000000.0);
			if (vol >= 1000)
				return String.format("%.1fK", vol / 1000.0);
			return String.valueOf(vol);
		}

		public String getHighTimeLabel() {
			return getRelativeTime(highTime);
		}

		public String getLowTimeLabel() {
			return getRelativeTime(lowTime);
		}

		private String getRelativeTime(int time) {
			long now = System.currentTimeMillis() / 1000;
			long diff = now - time;

			if (diff < 60)
				return diff + "s ago";
			if (diff < 3600)
				return (diff / 60) + "m ago";
			if (diff < 86400)
				return (diff / 3600) + "h ago";
			return (diff / 86400) + "d ago";
		}
	}
}