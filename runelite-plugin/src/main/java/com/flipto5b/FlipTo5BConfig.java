package com.flipto5b;

import net.runelite.client.config.Config;
import net.runelite.client.config.ConfigGroup;
import net.runelite.client.config.ConfigItem;
import net.runelite.client.config.ConfigSection;
import net.runelite.client.config.Keybind;
import java.awt.event.KeyEvent;

@ConfigGroup("flipto5b")
public interface FlipTo5BConfig extends Config {
	@ConfigItem(keyName = "apiUrl", name = "API URL", description = "The FlipSmart API URL", hidden = true)
	default String apiUrl() {
		return "https://api.flipsm.art";
	}

	@ConfigItem(keyName = "apiKey", name = "API Key", description = "Paste the API Key generated in the FlipTo5B Tools page", secret = true, position = -10)
	default String apiKey() {
		return "";
	}

	@ConfigItem(keyName = "endpoint", name = "API Endpoint", description = "The Supabase Edge Function URL", hidden = true)
	default String endpoint() {
		return "https://kyyxqrocfrifjhcenwpe.supabase.co/functions/v1/ingest-runelite-data";
	}

	@ConfigItem(keyName = "favorites", name = "Favorite Items", description = "Stored favorite item IDs", hidden = true)
	default String favorites() {
		return "";
	}

	@ConfigItem(keyName = "limitData", name = "GE Limit Data", description = "Stored GE limit tracking data", hidden = true)
	default String limitData() {
		return "{}";
	}

	// ============================================
	// Flip Finder Section
	// ============================================
	@ConfigSection(name = "Flip Finder", description = "Settings for flip recommendations", position = 1, closedByDefault = false)
	String flipFinderSection = "flipFinder";

	@ConfigItem(keyName = "showFlipFinder", name = "Enable Flip Finder", description = "Show the Flip Finder panel in the sidebar", section = flipFinderSection, position = 0)
	default boolean showFlipFinder() {
		return true;
	}

	@ConfigItem(keyName = "flipFinderLimit", name = "Number of Recommendations", description = "Number of flip recommendations to show (1-50)", section = flipFinderSection, position = 1)
	default int flipFinderLimit() {
		return 10;
	}

	@ConfigItem(keyName = "flipStyle", name = "Flip Style", description = "Your preferred flipping style: Conservative, Balanced, or Aggressive", section = flipFinderSection, position = 2)
	default FlipStyle flipStyle() {
		return FlipStyle.BALANCED;
	}

	@ConfigItem(keyName = "flipFinderRefreshMinutes", name = "Refresh Interval (minutes)", description = "How often to refresh flip recommendations (1-60 minutes)", section = flipFinderSection, position = 4)
	default int flipFinderRefreshMinutes() {
		return 5;
	}

	// ============================================
	// Flip Assistant Section (the 'E' key feature)
	// ============================================
	@ConfigSection(name = "Flip Assistant", description = "Guided step-by-step flip workflow with hotkey support", position = 3, closedByDefault = false)
	String flipAssistantSection = "flipAssistant";

	@ConfigItem(keyName = "enableFlipAssistant", name = "Enable Flip Assistant", description = "Show the guided flip assistant panel when focusing on a flip", section = flipAssistantSection, position = 0)
	default boolean enableFlipAssistant() {
		return true;
	}

	@ConfigItem(keyName = "easyFlipHotkey", name = "Auto-Fill Hotkey", description = "Hotkey to auto-fill price/quantity in GE (default: E)", section = flipAssistantSection, position = 1)
	default Keybind flipAssistHotkey() {
		return new Keybind(KeyEvent.VK_E, 0);
	}

	@ConfigItem(keyName = "highlightGEWidgets", name = "Highlight GE Buttons", description = "Highlight buy/sell buttons and input fields in the GE", section = flipAssistantSection, position = 2)
	default boolean highlightGEWidgets() {
		return true;
	}

	@ConfigItem(keyName = "priceOffset", name = "Price Offset (GP)", description = "Adjust buy/sell prices to fill faster. Positive = buy higher and sell lower by this amount.", section = flipAssistantSection, position = 4)
	default int priceOffset() {
		return 0;
	}

	// For persistence/legacy
	@ConfigItem(keyName = "email", name = "", description = "", hidden = true)
	default String email() {
		return "";
	}

	@ConfigItem(keyName = "password", name = "", description = "", hidden = true, secret = true)
	default String password() {
		return "";
	}

	enum FlipStyle {
		CONSERVATIVE("conservative"),
		BALANCED("balanced"),
		AGGRESSIVE("aggressive");

		private final String apiValue;

		FlipStyle(String apiValue) {
			this.apiValue = apiValue;
		}

		public String getApiValue() {
			return apiValue;
		}

		@Override
		public String toString() {
			return name().charAt(0) + name().substring(1).toLowerCase();
		}
	}

	// ============================================
	// Dump Alerts Section
	// ============================================
	@ConfigSection(name = "Dump Alerts", description = "Settings for high-volume dump notifications", position = 4, closedByDefault = false)
	String dumpAlertsSection = "dumpAlerts";

	@ConfigItem(keyName = "enableDumpAlerts", name = "Enable Dump Alerts", description = "Enable desktop notifications for item dumps", section = dumpAlertsSection, position = 0)
	default boolean enableDumpAlerts() {
		return false;
	}

	@ConfigItem(keyName = "dumpAlertInterval", name = "Check Interval (s)", description = "Seconds between checking for new dumps", section = dumpAlertsSection, position = 1)
	default int dumpAlertInterval() {
		return 30;
	}

	@ConfigItem(keyName = "dumpAlertMinProfit", name = "Min Potential Profit", description = "Minimum single-item profit to trigger alert", section = dumpAlertsSection, position = 2)
	default int dumpAlertMinProfit() {
		return 50000;
	}

	@ConfigItem(keyName = "dumpAlertMaxCount", name = "Max Alerts per Check", description = "Maximum number of alerts to show at once", section = dumpAlertsSection, position = 3)
	default int dumpAlertMaxCount() {
		return 3;
	}

	@ConfigItem(keyName = "dumpAlertCooldown", name = "Alert Cooldown (mins)", description = "Minutes to wait before alerting on the same item again", section = dumpAlertsSection, position = 4)
	default int dumpAlertCooldownMinutes() {
		return 15;
	}

	@ConfigItem(keyName = "dumpAlertSortByProfit", name = "Sort by Profit", description = "Sort alerts by highest potential total profit", section = dumpAlertsSection, position = 5)
	default boolean dumpAlertSortByProfit() {
		return true;
	}

	@ConfigItem(keyName = "priceAlertType", name = "Price Alert Type", description = "Criteria for triggering price alerts", section = dumpAlertsSection, position = 6)
	default PriceAlertType priceAlertType() {
		return PriceAlertType.BOTH;
	}

	enum PriceAlertType {
		DUMPS_ONLY("Dumps Only"),
		PUMPS_ONLY("Pumps Only"),
		BOTH("Both");

		private final String name;

		PriceAlertType(String name) {
			this.name = name;
		}

		@Override
		public String toString() {
			return name;
		}
	}

	// ============================================
	// Overlay & UI Settings
	// ============================================
	@ConfigSection(name = "Overlays", description = "Display settings for GE overlays", position = 5, closedByDefault = true)
	String overlaySection = "overlays";

	@ConfigItem(keyName = "showAssistantAlways", name = "Always Show Assistant", description = "Show flip assistant overlay even when no flip is active", section = overlaySection, position = 0)
	default boolean showAssistantAlways() {
		return false;
	}

	@ConfigItem(keyName = "showGEOverlay", name = "Show GE Overlay", description = "Show the main GE dashboard overlay", section = overlaySection, position = 1)
	default boolean showGEOverlay() {
		return true;
	}

	@ConfigItem(keyName = "exchangeViewerSize", name = "Exchange Viewer Size", description = "Size of the GE offer list (Compact/Full)", section = overlaySection, position = 2)
	default ExchangeViewerSize exchangeViewerSize() {
		return ExchangeViewerSize.COMPACT;
	}

	enum ExchangeViewerSize {
		COMPACT, FULL
	}

	@ConfigItem(keyName = "showGEItemNames", name = "Show Item Names", description = "Show names of items in GE slots", section = overlaySection, position = 3)
	default boolean showGEItemNames() {
		return true;
	}

	@ConfigItem(keyName = "highlightSlotBorders", name = "Highlight Slot Borders", description = "Color code slot borders based on status", section = overlaySection, position = 4)
	default boolean highlightSlotBorders() {
		return true;
	}

	@ConfigItem(keyName = "showOfferTimers", name = "Show Offer Timers", description = "Display time since offer update", section = overlaySection, position = 5)
	default boolean showOfferTimers() {
		return true;
	}

	@ConfigItem(keyName = "showCompetitiveness", name = "Show Competitiveness", description = "Indicate if offer price is competitive", section = overlaySection, position = 6)
	default boolean showCompetitivenessIndicators() {
		return true;
	}

	@ConfigItem(keyName = "showGEItemIcons", name = "Show Item Icons", description = "Render item icons in the overlay", section = overlaySection, position = 7)
	default boolean showGEItemIcons() {
		return true;
	}
}
