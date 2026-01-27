package com.flipto5b;

import com.flipto5b.controller.TradeController;
import com.flipto5b.ui.FlipTo5BPanel;
import com.flipto5b.engine.SignalEngine;
import com.flipto5b.engine.PricingEngine;

import com.flipto5b.model.MarketSignal;
import com.flipto5b.model.GELimitTracker;
import com.flipto5b.sync.SyncManager;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;
import com.google.inject.Provides;
import java.awt.image.BufferedImage;

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
import net.runelite.api.events.VarClientIntChanged;
import net.runelite.client.config.ConfigManager;
import net.runelite.client.eventbus.Subscribe;
import net.runelite.client.game.ItemManager;
import net.runelite.client.plugins.Plugin;
import net.runelite.client.plugins.PluginDescriptor;
import net.runelite.client.ui.ClientToolbar;
import net.runelite.client.ui.NavigationButton;
import net.runelite.client.ui.overlay.OverlayManager;
import net.runelite.client.ui.overlay.tooltip.TooltipManager;
import net.runelite.client.input.MouseManager;
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
	private ConfigManager configManager;

	@Inject
	private TooltipManager tooltipManager;

	@Inject
	private MouseManager mouseManager;

	@Inject
	private ClientThread clientThread;

	private FlipTo5BPanel panel;
	private NavigationButton navButton;
	private int sidebarItemId = -1;

	// Controller
	private TradeController tradeController;

	// --- ENGINES ---
	private SignalEngine signalEngine;
	private PricingEngine pricingEngine;

	private SyncManager syncManager;

	@Inject
	@lombok.Getter
	private ScheduledExecutorService executor;

	public ClientThread getClientThread() {
		return clientThread;
	}

	private static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");
	private static final String WIKI_API_URL = "https://prices.runescape.wiki/api/v1/osrs/latest";
	private static final String USER_AGENT = "FlipTo5B-Client/1.0";

	// Supabase configuration
	private String supabaseUrl;
	private String supabaseKey;

	// Cache prices: ItemID -> PriceData
	private Map<Integer, WikiPrice> priceCache = new HashMap<>();

	// GE Limit Trackers: ItemID -> Tracker
	private Map<Integer, GELimitTracker> limitTrackers = new HashMap<>();

	// Cached Quick Picks and Cancellation Advice (updated by background thread)
	private volatile List<MarketSignal> cachedQuickPicks = java.util.Collections.emptyList();
	private volatile String cachedCancellationAdvice = null;
	// private volatile Suggestion cachedSuggestion = null; // Unused

	@Override
	protected void startUp() throws Exception {
		log.info("!!! FLIPTO5B SYNC INITIALIZED !!!");

		// Initialize Engines
		signalEngine = new SignalEngine(okHttpClient, gson, itemManager);
		pricingEngine = new PricingEngine();

		// Supabase Config
		this.supabaseUrl = "https://kyyxqrocfrifjhcenwpe.supabase.co";
		this.supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXhxcm9jZnJpZmpoY2Vud3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDg4NTQsImV4cCI6MjA4MjUyNDg1NH0.wDfrdqyCgguWdq6XIdiNZZ3MSfhMpYt35Ak_sDT9w04";
		String userId = "b5f828e9-4fe5-4918-beea-ae829487e319";

		syncManager = new SyncManager(okHttpClient, gson, supabaseUrl, supabaseKey, userId);

		// Initialize Controller
		tradeController = new TradeController(client, config, itemManager, syncManager, gson, this);

		overlay = new FlipTo5BOverlay(client, this, tooltipManager);
		overlayManager.add(overlay);
		mouseManager.registerMouseListener(overlay);
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

		// Load Limit Trackers
		loadLimitTrackers();

		// Fetch prices immediately and then every minute
		executor.scheduleAtFixedRate(this::fetchPrices, 0, 1, TimeUnit.MINUTES);

		// Schedule Signal Scan (runs every 60s) - also updates Quick Picks cache
		executor.scheduleAtFixedRate(this::runSignalScan, 5, 60, TimeUnit.SECONDS);

		// Schedule Quick Picks update (runs every 30s on background thread)
		executor.scheduleAtFixedRate(this::updateQuickPicksCache, 10, 30, TimeUnit.SECONDS);

		// Schedule Backend Suggestion (runs every 10s)
		executor.scheduleAtFixedRate(this::fetchSuggestion, 2, 10, TimeUnit.SECONDS);

		// HOT RELOAD FIX: Poll for offers on client thread
		executor.scheduleAtFixedRate(() -> {
			if (client.getGameState() == GameState.LOGGED_IN) {
				clientThread.invoke(this::updatePanel);
			}
		}, 0, 2, TimeUnit.SECONDS); // Check every 2 seconds
	}

	private void updateQuickPicksCache() {
		// Run on background thread (executor) - NO clientThread here for network calls!
		if (client.getGameState() != GameState.LOGGED_IN)
			return;
		if (priceCache.isEmpty())
			return;

		try {
			// Use SignalEngine to find raw candidates (Network Call)
			SignalEngine.SignalConfig scanConfig = SignalEngine.SignalConfig.builder()
					.timeHorizonMinutes(30)
					.riskTolerance(SignalEngine.SignalConfig.RiskTolerance.MEDIUM)
					.minScore(40.0)
					.maxResults(10)
					.build();
			java.util.List<MarketSignal> rawSignals = signalEngine.scan(scanConfig);

			java.util.List<MarketSignal> picks = new java.util.ArrayList<>();
			long dummyInventory = 10_000_000; // Assume 10M cash for calculation if unknown

			for (MarketSignal raw : rawSignals) {
				// Enrich with PricingEngine
				PricingEngine.PriceRecommendation rec = pricingEngine.calculate(
						raw,
						dummyInventory,
						1, // Medium risk
						raw.getWikiLow(), // Support (simplified)
						raw.getWikiHigh() // Resistance (simplified)
				);

				MarketSignal enriched = MarketSignal.builder()
						.itemId(raw.getItemId())
						.itemName(raw.getItemName())
						.wikiLow(raw.getWikiLow())
						.wikiHigh(raw.getWikiHigh())
						// Copy technicals
						.volume24h(raw.getVolume24h())
						.buyLimit(raw.getBuyLimit())
						.spreadPercent(raw.getSpreadPercent())
						.rsi(raw.getRsi())
						.momentum(raw.getMomentum())
						.baselineDeviation(raw.getBaselineDeviation())
						.avgRecoveryTime(raw.getAvgRecoveryTime())
						// Metrics
						.opportunityScore(raw.getOpportunityScore())
						.confidence(raw.getConfidence())
						.isAnomaly(raw.isAnomaly())
						.isSafeForTimeframe(raw.isSafeForTimeframe())
						// Pricing enrichments
						.roiPercent(rec.getEffectiveRoi())
						.marginAfterTax(rec.getNetProfit())
						.action(raw.getAction())
						.timestamp(System.currentTimeMillis())
						.targetBuyPrice(rec.getBuyAt())
						.targetSellPrice(rec.getSellAt())
						.potentialProfit(rec.getNetProfit())
						.stopLoss(rec.getStopLoss())
						.build();
				picks.add(enriched);
			}

			cachedQuickPicks = picks;
			SwingUtilities.invokeLater(() -> {
				if (panel != null) {
					panel.updateQuickPicks(picks);
				}
			});
		} catch (Exception e) {
			log.error("Error updating Quick Picks cache", e);
		}
	}

	private void runSignalScan() {
		if (client.getGameState() != GameState.LOGGED_IN)
			return;
		try {
			SignalEngine.SignalConfig scanConfig = SignalEngine.SignalConfig.builder()
					.timeHorizonMinutes(30)
					.riskTolerance(SignalEngine.SignalConfig.RiskTolerance.MEDIUM)
					.minScore(40.0)
					.maxResults(10)
					.build();
			signalEngine.scan(scanConfig);
		} catch (Exception e) {
			log.error("Signal Scan Error", e);
		}
	}

	@SuppressWarnings("deprecation")
	private void fetchSuggestion() {
		if (client.getGameState() != GameState.LOGGED_IN)
			return;

		try {
			// Build Request Payload
			JsonObject payload = new JsonObject();

			// 1. Inventory and GP
			ItemContainer inventory = client.getItemContainer(InventoryID.INVENTORY);
			com.google.gson.JsonArray invArray = new com.google.gson.JsonArray();
			long gp = 0;
			if (inventory != null) {
				for (Item item : inventory.getItems()) {
					if (item.getId() == ItemID.COINS_995) {
						gp += item.getQuantity();
					}
					JsonObject itemJson = new JsonObject();
					itemJson.addProperty("id", item.getId());
					itemJson.addProperty("amount", item.getQuantity());
					invArray.add(itemJson);
				}
			}
			payload.add("inventory", invArray);
			payload.addProperty("gp", gp);

			// 2. Offers
			com.google.gson.JsonArray offersArray = new com.google.gson.JsonArray();
			GrandExchangeOffer[] offers = client.getGrandExchangeOffers();
			if (offers != null) {
				for (int i = 0; i < offers.length; i++) {
					GrandExchangeOffer offer = offers[i];
					JsonObject offerJson = new JsonObject();
					offerJson.addProperty("slot", i);
					offerJson.addProperty("itemId", offer.getItemId());
					offerJson.addProperty("status", offer.getState().name());
					offerJson.addProperty("type", offer.getState() == GrandExchangeOfferState.BUYING ? "buy" : "sell");
					offersArray.add(offerJson);
				}
			}
			payload.add("offers", offersArray);

			// Execute Request
			Request request = new Request.Builder()
					.url(supabaseUrl + "/functions/v1/suggestion")
					.header("Authorization", "Bearer " + supabaseKey)
					.post(RequestBody.create(JSON, gson.toJson(payload)))
					.build();

			// Executing sync on background thread (scheduled executor)
			try (Response response = okHttpClient.newCall(request).execute()) {
				ResponseBody body = response.body();
				if (response.isSuccessful() && body != null) {
					String respStr = body.string();
					Suggestion suggestion = gson.fromJson(respStr, Suggestion.class);
					log.info("Received backend suggestion: {} - {}", suggestion.type, suggestion.message);

					// Update UI
					SwingUtilities.invokeLater(() -> {
						if (panel != null) {
							panel.updateSuggestion(suggestion);
						}
					});

				} else {
					log.warn("Suggestion fetch failed: {}", response.code());
				}
			}

		} catch (Exception e) {
			log.error("Error fetching suggestion from backend", e);
		}
	}

	@Override
	protected void shutDown() throws Exception {
		if (overlay != null) {
			overlayManager.remove(overlay);
			mouseManager.unregisterMouseListener(overlay);
		}
		if (navButton != null) {
			clientToolbar.removeNavigation(navButton);
		}
		priceCache.clear();
	}

	public WikiPrice getWikiPrice(int itemId) {
		return priceCache.get(itemId);
	}

	public String getCancellationAdvice() {
		return cachedCancellationAdvice;
	}

	public List<MarketSignal> getQuickPicks() {
		return cachedQuickPicks;
	}

	public java.util.List<FlipOpportunity> getBestFlips() {
		java.util.List<FlipOpportunity> opportunities = new java.util.ArrayList<>();
		for (java.util.Map.Entry<Integer, WikiPrice> entry : priceCache.entrySet()) {
			int itemId = entry.getKey();
			WikiPrice price = entry.getValue();
			if (price.high <= 0 || price.low <= 0)
				continue;
			int margin = price.high - price.low;
			int tax = (int) Math.floor(price.high * 0.01);
			if (tax > 5000000)
				tax = 5000000;
			int profit = margin - tax;
			double roi = price.low > 0 ? ((double) profit / price.low) * 100 : 0;
			if (profit > 0 && roi >= 1.0 && roi < 200) {
				String name = itemManager.getItemComposition(itemId).getName();
				opportunities.add(new FlipOpportunity(itemId, name, price.low, price.high, profit, roi));
			}
		}
		opportunities.sort((a, b) -> Double.compare(b.roi, a.roi));
		return opportunities.subList(0, Math.min(10, opportunities.size()));
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

	public static class Suggestion {
		public String type;
		public String message;
		public int item_id;
		public String name;
		public int price;
		public int quantity;
		public double score;
	}

	private void fetchPrices() {
		Request request = new Request.Builder().url(WIKI_API_URL).header("User-Agent", USER_AGENT).build();
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
						log.info("DEBUG: Prices fetched successfully. Total items: " + priceCache.size());
						// Debug specific item (Gold Bar: 2357, but image shows 2357? no wait,
						// screenshot says Gold bar)
						// If user clicked note, might be different.
						clientThread.invokeLater(() -> {
							java.util.List<FlipOpportunity> bestFlips = getBestFlips();
							panel.updateBestFlips(bestFlips);
						});
						updateQuickPicksCache();
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
		if (event.getGroupId() == 465) {
			clientThread.invoke(this::updatePanel);
		}
	}

	@Subscribe
	public void onMenuOptionClicked(net.runelite.api.events.MenuOptionClicked event) {
		int widgetId = event.getParam1();
		int groupId = widgetId >> 16;
		if (groupId == 465) {
			int childId = widgetId & 0xFFFF;
			if (childId >= 7 && childId <= 14) {
				int slotIndex = childId - 7;
				GrandExchangeOffer[] offers = client.getGrandExchangeOffers();
				if (offers != null && slotIndex < offers.length) {
					GrandExchangeOffer offer = offers[slotIndex];
					if (offer != null && offer.getItemId() > 0) {
						setSidebarItem(offer.getItemId());
					}
				}
			}
		}
		if (event.getMenuOption().equals("Offer")) {
			int itemId = event.getItemId();
			if (itemId > -1 && itemId != 65535) {
				ItemComposition comp = itemManager.getItemComposition(itemId);
				if (comp.getNote() != -1) {
					itemId = comp.getLinkedNoteId();
				}
				setSidebarItem(itemId);
			}
		}
	}

	@Subscribe
	public void onVarClientIntChanged(VarClientIntChanged event) {
		if (event.getIndex() == 1151) {
			int itemId = client.getVarcIntValue(1151);
			if (itemId > 0 && itemId != sidebarItemId) {
				// Check for null name
				String name = itemManager.getItemComposition(itemId).getName();
				if (name != null)
					setSidebarItem(itemId);
			}
		}
	}

	@Subscribe
	public void onGrandExchangeOfferChanged(GrandExchangeOfferChanged event) {
		tradeController.onGrandExchangeOfferChanged(event.getOffer(), event.getSlot());
		updatePanel();
	}

	private void updatePanel() {
		if (client.getGameState() != GameState.LOGGED_IN)
			return;
		if (panel != null && tradeController != null) {
			panel.updateOffers(tradeController.getActiveOffers());
		}
	}

	@Provides
	FlipTo5BConfig provideConfig(ConfigManager configManager) {
		return configManager.getConfig(FlipTo5BConfig.class);
	}

	public static class OfferData {
		public int slot;
		public String state;
		public int itemId;
		public String itemName;
		public String offerType;
		public int price;
		public int quantity;
		public int buyPrice;
		public int sellPrice;
		public int profit;
		public int quantityFilled;
		public long timestamp;
	}

	public static class WikiPrice {
		public int high;
		public int highTime;
		public int low;
		public int lowTime;
		public long highVolume;
		public long lowVolume;

		public int getMomentum() {
			return highTime > lowTime ? 1 : (lowTime > highTime ? -1 : 0);
		}

		public long getTotalVolume() {
			return highVolume + lowVolume;
		}
		// Simplified labels omitted but fields present
	}

	public void setSidebarItem(int itemId) {
		if (itemId <= 0)
			return;
		this.sidebarItemId = itemId;
		if (panel != null) {
			panel.showItemDetails(itemId);
		}
	}

	public GELimitTracker getLimitTracker(int itemId) {
		return limitTrackers.get(itemId);
	}

	public int getSidebarItemId() {
		return sidebarItemId;
	}

	public MarketSignal getMarketSignal(int itemId) {
		WikiPrice price = getWikiPrice(itemId);
		if (price == null || signalEngine == null)
			return null;
		com.flipto5b.engine.SignalEngine.VolumeData volData = new com.flipto5b.engine.SignalEngine.VolumeData();
		volData.highVolume = (int) price.highVolume;
		volData.lowVolume = (int) price.lowVolume;
		volData.totalVolume = (int) price.getTotalVolume();
		com.flipto5b.engine.SignalEngine.SignalConfig scanConfig = com.flipto5b.engine.SignalEngine.SignalConfig
				.builder()
				.timeHorizonMinutes(30)
				.riskTolerance(com.flipto5b.engine.SignalEngine.SignalConfig.RiskTolerance.MEDIUM)
				.build();
		com.flipto5b.engine.SignalEngine.WeightProfile weights = signalEngine.calculateWeights(30);
		return signalEngine.calculateSignal(itemId, price, volData, weights, scanConfig);
	}

	private void loadLimitTrackers() {
		try {
			String json = config.limitData();
			if (json != null && !json.isEmpty() && !json.equals("{}")) {
				Type type = new TypeToken<Map<Integer, GELimitTracker>>() {
				}.getType();
				Map<Integer, GELimitTracker> loaded = gson.fromJson(json, type);
				if (loaded != null)
					limitTrackers = loaded;
			}
		} catch (Exception e) {
			log.error("Failed to load GE limit trackers", e);
		}
	}

	private void saveLimitTrackers() {
		try {
			String json = gson.toJson(limitTrackers);
			configManager.setConfiguration("flipto5b", "limitData", json);
		} catch (Exception e) {
			log.error("Failed to save GE limit trackers", e);
		}
	}

	public void updateGELimit(int itemId, int qtyBought) {
		GELimitTracker tracker = limitTrackers.computeIfAbsent(itemId, k -> new GELimitTracker());
		tracker.recordPurchase(qtyBought);
		saveLimitTrackers();
	}

	public boolean isFavorite(int itemId) {
		String favs = config.favorites();
		if (favs == null || favs.isEmpty())
			return false;
		String idStr = String.valueOf(itemId);
		for (String s : favs.split(",")) {
			if (s.equals(idStr))
				return true;
		}
		return false;
	}

	public void toggleFavorite(int itemId) {
		String favs = config.favorites();
		String idStr = String.valueOf(itemId);
		StringBuilder sb = new StringBuilder();
		boolean removed = false;
		if (favs != null && !favs.isEmpty()) {
			String[] split = favs.split(",");
			for (String s : split) {
				if (s.equals(idStr)) {
					removed = true;
					continue;
				}
				if (sb.length() > 0)
					sb.append(",");
				sb.append(s);
			}
		}
		if (!removed) {
			if (sb.length() > 0)
				sb.append(",");
			sb.append(idStr);
		}
		configManager.setConfiguration("flipto5b", "favorites", sb.toString());
	}
}