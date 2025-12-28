package com.flipto5b;

import com.google.gson.Gson;
import com.google.inject.Provides;
import javax.inject.Inject;
import lombok.extern.slf4j.Slf4j;
import net.runelite.api.*;
import net.runelite.api.events.GrandExchangeOfferChanged;
import net.runelite.client.config.ConfigManager;
import net.runelite.client.eventbus.Subscribe;
import net.runelite.client.plugins.Plugin;
import net.runelite.client.plugins.PluginDescriptor;
import net.runelite.client.game.ItemManager;
import okhttp3.*;
import java.io.IOException;

@Slf4j
@PluginDescriptor(
	name = "FlipTo5B Sync"
)
public class FlipTo5BPlugin extends Plugin
{
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

	private static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");

	@Override
	protected void startUp() throws Exception
	{
		log.info("FlipTo5B Sync started!");
	}

	@Subscribe
	public void onGrandExchangeOfferChanged(GrandExchangeOfferChanged event)
	{
		GrandExchangeOffer offer = event.getOffer();
		int slot = event.getSlot();
		
		if (config.apiKey().isEmpty()) return;

		// 1. Handle Active Offers (Updates Dashboard slots)
		GrandExchangeOfferState state = offer.getState();
		
		Payload payload = new Payload();
		payload.apiKey = config.apiKey();
		
		if (state == GrandExchangeOfferState.EMPTY || state == GrandExchangeOfferState.CANCELLED_BUY || state == GrandExchangeOfferState.CANCELLED_SELL) {
			// Clear slot
			payload.type = "update_slot";
			payload.data = new OfferData();
			payload.data.slot = slot;
			payload.data.state = "EMPTY";
			sendData(payload);
		} 
		else if (state == GrandExchangeOfferState.BUYING || state == GrandExchangeOfferState.SELLING) {
			// Update slot
			payload.type = "update_slot";
			payload.data = new OfferData();
			payload.data.slot = slot;
			payload.data.state = "ACTIVE";
			payload.data.itemId = offer.getItemId();
			payload.data.itemName = itemManager.getItemComposition(offer.getItemId()).getName();
			payload.data.offerType = (state == GrandExchangeOfferState.BUYING) ? "buy" : "sell";
			payload.data.price = offer.getPrice();
			payload.data.quantity = offer.getTotalQuantity() - offer.getQuantitySold(); // Remaining qty
			sendData(payload);
		}
		
		// 2. Handle Completed Trades (History)
		// Note: This logic is simplified. Real GE logic needs to track state transitions to avoid dupes.
		if (state == GrandExchangeOfferState.BOUGHT || state == GrandExchangeOfferState.SOLD) {
			// Remove from Active
			Payload clearPayload = new Payload();
			clearPayload.apiKey = config.apiKey();
			clearPayload.type = "update_slot";
			clearPayload.data = new OfferData();
			clearPayload.data.slot = slot;
			clearPayload.data.state = "EMPTY";
			sendData(clearPayload);

			// Log History
			// NOTE: Calculating profit automatically is hard without knowing original buy price for sells.
			// This basic version just logs the raw transaction. The web app can calculate profit if you match buy/sells.
			// For now, we will log it with 0 profit and let user edit, or you store local history to match.
			
			Payload logPayload = new Payload();
			logPayload.apiKey = config.apiKey();
			logPayload.type = "log_trade";
			logPayload.data = new OfferData();
			logPayload.data.itemId = offer.getItemId();
			logPayload.data.itemName = itemManager.getItemComposition(offer.getItemId()).getName();
			logPayload.data.quantity = offer.getQuantitySold();
			logPayload.data.profit = 0; // Placeholder
			
			if (state == GrandExchangeOfferState.BOUGHT) {
				logPayload.data.buyPrice = offer.getSpent() / offer.getQuantitySold();
				logPayload.data.sellPrice = 0;
			} else {
				logPayload.data.buyPrice = 0;
				logPayload.data.sellPrice = offer.getSpent() / offer.getQuantitySold();
			}
			
			sendData(logPayload);
		}
	}

	private void sendData(Payload payload)
	{
		String json = gson.toJson(payload);
		Request request = new Request.Builder()
			.url(config.endpoint())
			.post(RequestBody.create(JSON, json))
			.build();

		okHttpClient.newCall(request).enqueue(new Callback()
		{
			@Override
			public void onFailure(Call call, IOException e)
			{
				log.warn("Failed to sync with FlipTo5B", e);
			}

			@Override
			public void onResponse(Call call, Response response) throws IOException
			{
				response.close();
			}
		});
	}

	@Provides
	FlipTo5BConfig provideConfig(ConfigManager configManager)
	{
		return configManager.getConfig(FlipTo5BConfig.class);
	}

	// Helper Classes for JSON serialization
	private static class Payload {
		String apiKey;
		String type; // update_slot, log_trade
		OfferData data;
	}

	private static class OfferData {
		int slot;
		String state; // EMPTY, ACTIVE
		int itemId;
		String itemName;
		String offerType; // buy, sell
		int price;
		int quantity;
		int buyPrice;
		int sellPrice;
		int profit;
	}
}