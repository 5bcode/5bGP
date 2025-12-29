package com.flipto5b;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.Graphics2D;
import java.awt.Rectangle;

import javax.inject.Inject;
import net.runelite.api.Client;
import net.runelite.api.GrandExchangeOffer;
import net.runelite.api.GrandExchangeOfferState;
import net.runelite.api.widgets.Widget;
import net.runelite.api.widgets.WidgetInfo;
import net.runelite.client.ui.overlay.Overlay;
import net.runelite.client.ui.overlay.OverlayLayer;
import net.runelite.client.ui.overlay.OverlayPosition;
import net.runelite.client.ui.overlay.tooltip.Tooltip;
import net.runelite.client.ui.overlay.tooltip.TooltipManager;
import net.runelite.client.util.ColorUtil;
import net.runelite.client.util.QuantityFormatter;

public class FlipTo5BOverlay extends Overlay {
	private final Client client;
	private final FlipTo5BPlugin plugin;
	private final TooltipManager tooltipManager;
	private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(FlipTo5BOverlay.class);

	private static final Color COLOR_BETTER = new Color(16, 185, 129); // Emerald-500
	private static final Color COLOR_WITHIN = new Color(59, 130, 246); // Blue-500
	private static final Color COLOR_WORSE = new Color(244, 63, 94); // Rose-500

	@Inject
	private FlipTo5BOverlay(Client client, FlipTo5BPlugin plugin, TooltipManager tooltipManager) {
		this.client = client;
		this.plugin = plugin;
		this.tooltipManager = tooltipManager;
		setPosition(OverlayPosition.DYNAMIC);
		setLayer(OverlayLayer.ABOVE_WIDGETS);
	}

	@Override
	@SuppressWarnings("deprecation")
	public Dimension render(Graphics2D graphics) {
		Widget geContainer = client.getWidget(WidgetInfo.GRAND_EXCHANGE_OFFER_CONTAINER);
		if (geContainer == null || geContainer.isHidden()) {
			return null;
		}

		GrandExchangeOffer[] offers = client.getGrandExchangeOffers();
		if (offers == null)
			return null;

		// DIAGNOSTIC LOGGING (Every ~6 seconds)
		if (client.getTickCount() % 300 == 0) {
			log.info("Overlay Debug: Checking GE Overlay...");
			// geContainer checks are redundant here due to earlier return
			log.info(" - GE Container is VISIBLE");
		}

		for (int i = 0; i < offers.length; i++) {
			GrandExchangeOffer offer = offers[i];
			GrandExchangeOfferState state = offer.getState();

			// Only render for active offers (Buying/Selling)
			if (state != GrandExchangeOfferState.BUYING && state != GrandExchangeOfferState.SELLING) {
				continue;
			}

			// Map slot index to widget info
			// GE Slots are usually children of the container, or specific WidgetInfos
			// WidgetInfo.GRAND_EXCHANGE_OFFER_BOX_1 starts at index 0
			Widget slotWidget = getOfferWidget(i);

			if (slotWidget == null) {
				if (client.getTickCount() % 300 == 0)
					log.info(" - Slot " + i + ": Widget is NULL");
				continue;
			}
			if (slotWidget.isHidden()) {
				if (client.getTickCount() % 300 == 0)
					log.info(" - Slot " + i + ": Widget is HIDDEN");
				continue;
			}

			if (client.getTickCount() % 300 == 0)
				log.info(" - Slot " + i + ": Ready to render. State=" + state);

			FlipTo5BPlugin.WikiPrice priceData = plugin.getWikiPrice(offer.getItemId());

			// DEBUG: Log if we are skipping
			if (priceData == null) {
				// render with null data to verify widget placement
				renderSlotOverlay(graphics, slotWidget, offer, null);
				continue;
			}

			renderSlotOverlay(graphics, slotWidget, offer, priceData);
		}

		return null;
	}

	private Widget getOfferWidget(int slot) {
		switch (slot) {
			case 0:
				return client.getWidget(465, 7);
			case 1:
				return client.getWidget(465, 8);
			case 2:
				return client.getWidget(465, 9);
			case 3:
				return client.getWidget(465, 10);
			case 4:
				return client.getWidget(465, 11);
			case 5:
				return client.getWidget(465, 12);
			case 6:
				return client.getWidget(465, 13);
			case 7:
				return client.getWidget(465, 14);
			default:
				return null;
		}
	}

	private void renderSlotOverlay(Graphics2D graphics, Widget widget, GrandExchangeOffer offer,
			FlipTo5BPlugin.WikiPrice priceData) {
		boolean isBuy = offer.getState() == GrandExchangeOfferState.BUYING;
		int price = offer.getPrice();

		Color color = COLOR_WORSE;
		String statusMsg = "";

		// Logic matching the web app
		if (priceData != null) {
			if (isBuy) {
				if (price >= priceData.high) {
					color = COLOR_BETTER;
					statusMsg = "Insta Buy";
				} else if (price >= priceData.low) {
					color = COLOR_WITHIN;
					statusMsg = "Competitive";
				} else {
					color = COLOR_WORSE;
					statusMsg = "Too Low";
				}
			} else {
				if (price <= priceData.low) {
					color = COLOR_BETTER;
					statusMsg = "Insta Sell";
				} else if (price <= priceData.high) {
					color = COLOR_WITHIN;
					statusMsg = "Competitive";
				} else {
					color = COLOR_WORSE;
					statusMsg = "Too High";
				}
			}
		} else {
			// Fallback for missing data - visual debug
			color = Color.GRAY;
			statusMsg = "No Wiki Data";
		}

		// Draw Border
		Rectangle bounds = widget.getBounds();
		graphics.setColor(color);
		graphics.setStroke(new BasicStroke(2));
		graphics.drawRect(bounds.x, bounds.y, bounds.width, bounds.height);

		// Handle Hover
		if (bounds.contains(client.getMouseCanvasPosition().getX(), client.getMouseCanvasPosition().getY())) {
			StringBuilder sb = new StringBuilder();
			sb.append(ColorUtil.wrapWithColorTag("FlipTo5B Analysis", Color.WHITE)).append("</br>");
			sb.append("Status: ").append(ColorUtil.wrapWithColorTag(statusMsg, color)).append("</br>");
			sb.append("Your Price: ").append(QuantityFormatter.formatNumber(price)).append(" gp</br>");

			sb.append("</br>");

			if (priceData != null) {
				sb.append("Wiki High (InstaBuy): ").append(
						ColorUtil.wrapWithColorTag(QuantityFormatter.formatNumber(priceData.high), COLOR_BETTER))
						.append("</br>");
				sb.append("Wiki Low (InstaSell): ")
						.append(ColorUtil.wrapWithColorTag(QuantityFormatter.formatNumber(priceData.low), COLOR_WITHIN))
						.append("</br>");
			}

			// Suggestion logic
			if (color == COLOR_WORSE && priceData != null) {
				sb.append("</br>");
				sb.append(ColorUtil.wrapWithColorTag("Suggestion:", Color.ORANGE)).append("</br>");
				if (isBuy) {
					sb.append("Set >= ").append(QuantityFormatter.formatNumber(priceData.low));
				} else {
					sb.append("Set <= ").append(QuantityFormatter.formatNumber(priceData.high));
				}
			}

			tooltipManager.add(new Tooltip(sb.toString()));
		}
	}
}