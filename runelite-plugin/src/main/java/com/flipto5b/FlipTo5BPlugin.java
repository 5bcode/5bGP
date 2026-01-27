package com.flipto5b;

import com.flipto5b.controller.TradeController;
import com.flipto5b.model.GELimitTracker;
import com.flipto5b.model.MarketSignal;
import com.flipto5b.sync.SyncManager;
import com.flipto5b.ui.FlipTo5BPanel;
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
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import javax.inject.Inject;
import javax.swing.SwingUtilities;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import net.runelite.api.*;
import net.runelite.api.events.GameStateChanged;
import net.runelite.api.events.GrandExchangeOfferChanged;
import net.runelite.api.events.VarClientIntChanged;
import net.runelite.client.callback.ClientThread;
import net.runelite.client.config.ConfigManager;
import net.runelite.client.eventbus.Subscribe;
import net.runelite.client.game.ItemManager;
import net.runelite.client.input.KeyManager;
import net.runelite.client.plugins.Plugin;
import net.runelite.client.plugins.PluginDescriptor;
import net.runelite.client.ui.ClientToolbar;
import net.runelite.client.ui.NavigationButton;
import net.runelite.client.ui.overlay.OverlayManager;
import okhttp3.*;

@Slf4j
@PluginDescriptor(name = "FlipTo5B Sync", description = "Enhanced flipping tool with GE overlays, auto-fill hotkeys, and real-time syncing.", tags = {
		"grand exchange", "flipping", "trading", "money making", "overlay" })
public class FlipTo5BPlugin extends Plugin {
	private static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");
	private static final String WIKI_API_URL = "https://prices.runescape.wiki/api/v1/osrs/latest";
	private static final String USER_AGENT = "FlipTo5B-Client/2.0";

	@Inject
	private Client client;

	@Inject
	private FlipTo5BConfig config;

	@Inject
	private OverlayManager overlayManager;

	@Inject
	private GrandExchangeOverlay geOverlay;

	@Inject
	private GrandExchangeSlotOverlay geSlotOverlay;

	@Inject
	private FlipAssistOverlay flipAssistOverlay;

	@Inject
	private FlipSmartApiClient apiClient;

	@Inject
	private KeyManager keyManager;

	@Inject
	private ClientThread clientThread;

	@Inject
	private ClientToolbar clientToolbar;

	@Inject
	private ItemManager itemManager;

	@Inject
	private ConfigManager configManager;

	@Inject
	private Gson gson;

	@Inject
	private DumpAlertService dumpAlertService;

	@Inject
	private OkHttpClient okHttpClient;

	@Inject
	@Getter
	private ScheduledExecutorService executor;

	// Legacy/Original Sidebar Items
	private FlipTo5BPanel panel;
	private NavigationButton navButton;
	private int sidebarItemId = -1;

	// Engines & Sync
	private SyncManager syncManager;
	private TradeController tradeController;

	// Cache prices: ItemID -> PriceData
	private Map<Integer, WikiPrice> priceCache = new HashMap<>();

	// GE Limit Trackers: ItemID -> Tracker
	private Map<Integer, GELimitTracker> limitTrackers = new HashMap<>();

	// Flip Smart Tracking
	private final Map<Integer, TrackedOffer> trackedOffers = new ConcurrentHashMap<>();
	private final java.util.Set<Integer> collectedItemIds = ConcurrentHashMap.newKeySet();
	private FlipAssistInputListener flipAssistInputListener;

	@Getter
	private int currentCashStack = 0;
	@Getter
	private String currentRsn = null;
	@Getter
	private boolean loggedIntoRunescape = false;

	// --- ENUMS & HELPER CLASSES ---

	public enum OfferCompetitiveness {
		COMPETITIVE, UNCOMPETITIVE, UNKNOWN
	}

	public static class TrackedOffer {
		int itemId;
		String itemName;
		boolean isBuy;
		int totalQuantity;
		int price;
		int previousQuantitySold;
		long createdAtMillis;

		TrackedOffer() {
		}

		TrackedOffer(int itemId, String itemName, boolean isBuy, int totalQuantity, int price, int quantitySold) {
			this.itemId = itemId;
			this.itemName = itemName;
			this.isBuy = isBuy;
			this.totalQuantity = totalQuantity;
			this.price = price;
			this.previousQuantitySold = quantitySold;
			this.createdAtMillis = System.currentTimeMillis();
		}
	}

	// --- PLUGIN LIFECYCLE ---

	@Override
	protected void startUp() throws Exception {
		log.info("FlipTo5B Sync Enhanced starting...");

		// Initialize Engines
		// Supabase Config
		String supabaseUrl = "https://kyyxqrocfrifjhcenwpe.supabase.co";
		String supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXhxcm9jZnJpZmpoY2Vud3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDg4NTQsImV4cCI6MjA4MjUyNDg1NH0.wDfrdqyCgguWdq6XIdiNZZ3MSfhMpYt35Ak_sDT9w04";
		String userId = "b5f828e9-4fe5-4918-beea-ae829487e319";
		syncManager = new SyncManager(okHttpClient, gson, supabaseUrl, supabaseKey, userId);

		// Initialize Controller
		tradeController = new TradeController(client, config, itemManager, syncManager, gson, this);

		// Initialize UI
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

		// Overlays
		overlayManager.add(geOverlay);
		overlayManager.add(geSlotOverlay);
		overlayManager.add(flipAssistOverlay);

		// Listeners
		flipAssistInputListener = new FlipAssistInputListener(client, clientThread, config, flipAssistOverlay);
		keyManager.registerKeyListener(flipAssistInputListener);

		// Load Persistent Data
		loadLimitTrackers();

		// Background Tasks
		executor.scheduleAtFixedRate(this::fetchPrices, 0, 1, TimeUnit.MINUTES);
		executor.scheduleAtFixedRate(this::fetchSuggestion, 2, 10, TimeUnit.SECONDS);

		// Pulse for Panel updates
		executor.scheduleAtFixedRate(() -> {
			if (client.getGameState() == GameState.LOGGED_IN) {
				clientThread.invoke(this::updatePanel);
			}
		}, 0, 2, TimeUnit.SECONDS);

		dumpAlertService.start();
	}

	@Override
	protected void shutDown() throws Exception {
		log.info("FlipTo5B Sync Enhanced stopping...");

		overlayManager.remove(geOverlay);
		overlayManager.remove(geSlotOverlay);
		overlayManager.remove(flipAssistOverlay);

		if (navButton != null) {
			clientToolbar.removeNavigation(navButton);
		}

		if (flipAssistInputListener != null) {
			keyManager.unregisterKeyListener(flipAssistInputListener);
			flipAssistInputListener = null;
		}

		dumpAlertService.stop();
		apiClient.clearCache();
		priceCache.clear();
	}

	// --- EVENT HANDLERS ---

	@Subscribe
	public void onGameStateChanged(GameStateChanged event) {
		GameState gameState = event.getGameState();
		if (gameState == GameState.LOGGED_IN) {
			loggedIntoRunescape = true;
			updateCashStack();
			updatePanel();
		} else if (gameState == GameState.LOGIN_SCREEN) {
			loggedIntoRunescape = false;
		}
	}

	@Subscribe
	public void onGrandExchangeOfferChanged(GrandExchangeOfferChanged event) {
		GrandExchangeOffer offer = event.getOffer();
		int slot = event.getSlot();

		// Original Sync Logic
		tradeController.onGrandExchangeOfferChanged(offer, slot);

		// Flip Smart Tracking Logic
		if (offer.getState() != GrandExchangeOfferState.EMPTY) {
			String itemName = itemManager.getItemComposition(offer.getItemId()).getName();
			trackedOffers.put(slot, new TrackedOffer(
					offer.getItemId(),
					itemName,
					offer.getState() == GrandExchangeOfferState.BUYING
							|| offer.getState() == GrandExchangeOfferState.BOUGHT,
					offer.getTotalQuantity(),
					offer.getPrice(),
					offer.getQuantitySold()));
		} else {
			trackedOffers.remove(slot);
		}

		updatePanel();
	}

	@Subscribe
	public void onVarClientIntChanged(VarClientIntChanged event) {
		if (event.getIndex() == 1151) {
			int itemId = client.getVarcIntValue(1151);
			if (itemId > 0 && itemId != sidebarItemId) {
				String name = itemManager.getItemComposition(itemId).getName();
				if (name != null)
					setSidebarItem(itemId);
			}
		}
	}

	// --- API & DATA METHODS ---

	public void fetchPrices() {
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
					JsonObject json = gson.fromJson(body.string(), JsonObject.class);
					JsonObject data = json.getAsJsonObject("data");
					Type type = new TypeToken<Map<Integer, WikiPrice>>() {
					}.getType();
					Map<Integer, WikiPrice> parsed = gson.fromJson(data, type);
					if (parsed != null) {
						long now = System.currentTimeMillis();
						for (WikiPrice p : parsed.values())
							p.timestamp = now;
						priceCache = parsed;
					}
				} finally {
					response.close();
				}
			}
		});
	}

	@SuppressWarnings("deprecation")
	private void fetchSuggestion() {
		if (client.getGameState() != GameState.LOGGED_IN)
			return;
		try {
			JsonObject payload = new JsonObject();
			ItemContainer inventory = client.getItemContainer(InventoryID.INVENTORY);
			com.google.gson.JsonArray invArray = new com.google.gson.JsonArray();
			long gp = 0;
			if (inventory != null) {
				for (Item item : inventory.getItems()) {
					if (item.getId() == ItemID.COINS_995)
						gp += item.getQuantity();
					JsonObject itemJson = new JsonObject();
					itemJson.addProperty("id", item.getId());
					itemJson.addProperty("amount", item.getQuantity());
					invArray.add(itemJson);
				}
			}
			payload.add("inventory", invArray);
			payload.addProperty("gp", gp);

			Request request = new Request.Builder()
					.url("https://kyyxqrocfrifjhcenwpe.supabase.co/functions/v1/suggestion")
					.header("Authorization", "Bearer "
							+ "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXhxcm9jZnJpZmpoY2Vud3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDg4NTQsImV4cCI6MjA4MjUyNDg1NH0.wDfrdqyCgguWdq6XIdiNZZ3MSfhMpYt35Ak_sDT9w04")
					.post(RequestBody.create(JSON, gson.toJson(payload)))
					.build();

			try (Response response = okHttpClient.newCall(request).execute()) {
				ResponseBody responseBody = response.body();
				if (response.isSuccessful() && responseBody != null) {
					Suggestion suggestion = gson.fromJson(responseBody.string(), Suggestion.class);
					SwingUtilities.invokeLater(() -> {
						if (panel != null)
							panel.updateSuggestion(suggestion);
					});
				}
			}
		} catch (Exception e) {
			log.error("Error fetching suggestion", e);
		}
	}

	public void updatePanel() {
		if (panel != null && tradeController != null) {
			panel.updateOffers(tradeController.getActiveOffers());
		}
	}

	public WikiPrice getWikiPrice(int itemId) {
		return priceCache.get(itemId);
	}

	public void setSidebarItem(int itemId) {
		if (itemId <= 0)
			return;
		this.sidebarItemId = itemId;
		if (panel != null)
			panel.showItemDetails(itemId);
	}

	public void updateGELimit(int itemId, int qtyBought) {
		GELimitTracker tracker = limitTrackers.computeIfAbsent(itemId, k -> new GELimitTracker());
		tracker.recordPurchase(qtyBought);
		saveLimitTrackers();
	}

	private void loadLimitTrackers() {
		try {
			String json = config.limitData();
			if (json != null && !json.equals("{}")) {
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

	/**
	 * Calculate competitiveness of an offer compared to real-time wiki prices.
	 */
	public OfferCompetitiveness calculateCompetitiveness(TrackedOffer offer) {
		if (offer == null)
			return OfferCompetitiveness.UNKNOWN;
		WikiPrice wp = getWikiPrice(offer.itemId);
		if (wp == null || wp.high <= 0 || wp.low <= 0)
			return OfferCompetitiveness.UNKNOWN;

		boolean isCompetitive = offer.isBuy ? offer.price >= wp.low : offer.price <= wp.high;
		return isCompetitive ? OfferCompetitiveness.COMPETITIVE : OfferCompetitiveness.UNCOMPETITIVE;
	}

	public TrackedOffer getTrackedOffer(int slot) {
		return trackedOffers.get(slot);
	}

	public void fetch6hTimeseries(int itemId, Callback callback) {
		String url = "https://prices.runescape.wiki/api/v1/osrs/timeseries?timestep=5m&id=" + itemId;
		Request request = new Request.Builder().url(url).header("User-Agent", USER_AGENT).build();
		okHttpClient.newCall(request).enqueue(callback);
	}

	@SuppressWarnings("deprecation")
	private void updateCashStack() {
		ItemContainer inventory = client.getItemContainer(InventoryID.INVENTORY);
		if (inventory != null) {
			Item coins = inventory.getItem(ItemID.COINS_995);
			currentCashStack = coins != null ? coins.getQuantity() : 0;
		}
	}

	@Provides
	FlipTo5BConfig provideConfig(ConfigManager configManager) {
		return configManager.getConfig(FlipTo5BConfig.class);
	}

	// --- DATA CLASSES ---

	public static class WikiPrice {
		public int high;
		public int highTime;
		public int low;
		public int lowTime;
		public long highVolume;
		public long lowVolume;
		public transient long timestamp;

		public long getTotalVolume() {
			return highVolume + lowVolume;
		}
	}

	public static class Suggestion {
		public String type;
		public String message;
		public int item_id;
		public String name;
		public int price;
		public int quantity;
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

	public static class FlipOpportunity {
		public int itemId;
		public String itemName;
		public int buyPrice;
		public int sellPrice;
		public int profit;
		public double roi;
	}

	// Simplified PendingOrder structure matching usage
	public static class PendingOrder {
		public Integer itemId;
		public String itemName;
		public Integer quantity;
		public Integer quantityFilled;
		public Integer pricePerItem;
		public Integer recommendedSellPrice;
	}

	public ClientThread getClientThread() {
		return clientThread;
	}

	public boolean isFavorite(int itemId) {
		String favs = config.favorites();
		if (favs == null || favs.isEmpty())
			return false;
		for (String s : favs.split(",")) {
			if (s.equals(String.valueOf(itemId)))
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
			for (String s : favs.split(",")) {
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

	public GELimitTracker getLimitTracker(int itemId) {
		return limitTrackers.get(itemId);
	}

	public MarketSignal getMarketSignal(int itemId) {
		return null;
	}

	public String getCancellationAdvice() {
		return null;
	}

	public void refreshWikiPrices() {
		fetchPrices();
	}

	public boolean isFlipAssistActive() {
		return flipAssistOverlay != null && flipAssistOverlay.isActive();
	}

	public FlipAssistOverlay.FlipAssistStep getFlipAssistStep() {
		return flipAssistOverlay != null ? flipAssistOverlay.getCurrentStep()
				: FlipAssistOverlay.FlipAssistStep.IDLE;
	}

	public void setRecommendedSellPrice(int itemId, int price) {
	}

	public java.util.Optional<String> getCurrentRsnSafe() {
		return java.util.Optional.ofNullable(currentRsn);
	}

	public java.util.Set<Integer> getActiveFlipItemIds() {
		return collectedItemIds;
	}

	public List<PendingOrder> getPendingBuyOrders() {
		return java.util.Collections.emptyList();
	}

	public List<FlipOpportunity> getBestFlips() {
		return java.util.Collections.emptyList();
	}

	public java.util.Set<Integer> getCollectedItemIds() {
		return collectedItemIds;
	}
}
