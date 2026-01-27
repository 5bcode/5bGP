package com.flipto5b;

import net.runelite.client.config.Config;
import net.runelite.client.config.ConfigGroup;
import net.runelite.client.config.ConfigItem;

@ConfigGroup("flipto5b")
public interface FlipTo5BConfig extends Config {
	@ConfigItem(keyName = "apiKey", name = "API Key", description = "Paste the API Key generated in the FlipTo5B Tools page", secret = true)
	default String apiKey() {
		return "";
	}

	@ConfigItem(keyName = "endpoint", name = "API Endpoint", description = "The Supabase Edge Function URL (usually ends in /ingest-runelite-data)", hidden = true)
	default String endpoint() {
		// Replace this with your actual Project URL found in Supabase Dashboard
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
}
