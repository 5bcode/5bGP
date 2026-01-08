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
		
		// CASE A: Slot is Empty or Cancelled -> Clear it from Dashboard
		if (state == GrandExchangeOfferState.EMPTY || state == GrandExchangeOfferState.CANCELLED_BUY || state == GrandExchangeOfferState.CANCELLED_SELL) {
			payload.type = "update_slot";
			payload.data = new OfferData();
			payload.data.slot = slot;
			payload.data.state = "EMPTY";
			sendData(payload);
		} 
		// CASE B: Slot has an item (Buying, Selling, Bought, or Sold) -> Show on Dashboard
		else if (state == GrandExchangeOfferState.BUYING || state == GrandExchangeOfferState.SELLING || state == GrandExchangeOfferState.BOUGHT || state == GrandExchangeOfferState.SOLD) {
			
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