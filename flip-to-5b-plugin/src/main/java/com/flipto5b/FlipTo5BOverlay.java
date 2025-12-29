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
import net.runelite.client.ui.overlay.OverlayPanel;
import net.runelite.client.ui.overlay.OverlayPosition;
import net.runelite.client.ui.overlay.components.LineComponent;
import net.runelite.client.ui.overlay.components.TitleComponent;
import net.runelite.client.ui.overlay.tooltip.Tooltip;
import net.runelite.client.ui.overlay.tooltip.TooltipManager;
import net.runelite.client.util.ColorUtil;
import net.runelite.client.util.QuantityFormatter;

public class FlipTo5BOverlay extends OverlayPanel {
	private final Client client;
	private final FlipTo5BPlugin plugin;
	private final TooltipManager tooltipManager;
	private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(FlipTo5BOverlay.class);

	private static final Color COLOR_BETTER = new Color(16, 185, 129); // Emerald-500
	private static final Color COLOR_WITHIN = new Color(59, 130, 246); // Blue-500
	private static final Color COLOR_WORSE = new Color(244, 63, 94); // Rose-500

	@Inject
	public FlipTo5BOverlay(Client client, FlipTo5BPlugin plugin, TooltipManager tooltipManager) {
		super(plugin);
		log.info("FlipTo5BOverlay: Constructor called!");
		this.client = client;
		this.plugin = plugin;
		this.tooltipManager = tooltipManager;
		setPosition(OverlayPosition.DYNAMIC);
		setLayer(OverlayLayer.ABOVE_WIDGETS);
		setPriority(Overlay.PRIORITY_HIGH);
	}

	@Override
	public Dimension render(Graphics2D graphics) {
		panelComponent.getChildren().clear();
		panelComponent.getChildren().add(TitleComponent.builder()
				.text("FlipTo5B Debug")
				.color(Color.GREEN)
				.build());
		panelComponent.getChildren().add(LineComponent.builder()
				.left("Tick:")
				.right(String.valueOf(client.getTickCount()))
				.build());

		Widget geWindow = client.getWidget(465, 0); // Main GE Window
		if (geWindow == null || geWindow.isHidden()) {
			return super.render(graphics);
		}

		// Draw Border around GE window
		graphics.setColor(Color.CYAN);
		graphics.setStroke(new BasicStroke(2));
		Rectangle b = geWindow.getBounds();
		graphics.drawRect(b.x, b.y, b.width, b.height);

		// Render active offer slots (1-8)
		GrandExchangeOffer[] offers = client.getGrandExchangeOffers();
		if (offers != null) {
			for (int i = 0; i < offers.length; i++) {
				GrandExchangeOffer offer = offers[i];
				if (offer.getState() == GrandExchangeOfferState.BUYING
						|| offer.getState() == GrandExchangeOfferState.SELLING) {
					Widget slotWidget = getOfferWidget(i);
					if (slotWidget != null && !slotWidget.isHidden()) {
						renderSlotOverlay(graphics, slotWidget, offer, plugin.getWikiPrice(offer.getItemId()));
					}
				}
			}
		}

		renderOfferSetupOverlay(graphics);

		return super.render(graphics);
	}

	private void renderOfferSetupOverlay(Graphics2D graphics) {
		Widget setupContainer = client.getWidget(465, 23); // Better ID for setup window
		if (setupContainer == null || setupContainer.isHidden()) {
			return;
		}

		Widget itemIcon = client.getWidget(465, 21); // Item icon widget usually holds the ID
		if (itemIcon == null) {
			return;
		}

		int itemId = itemIcon.getItemId();
		if (itemId <= 0) {
			return;
		}

		FlipTo5BPlugin.WikiPrice priceData = plugin.getWikiPrice(itemId);

		// Add to debug panel for visibility
		panelComponent.getChildren().add(LineComponent.builder()
				.left("Setup Item:")
				.right(String.valueOf(itemId))
				.build());

		if (priceData == null) {
			return;
		}

		Widget priceInput = client.getWidget(465, 52); // Price per item input
		if (priceInput == null || priceInput.isHidden()) {
			return;
		}

		Rectangle bounds = priceInput.getBounds();
		int x = bounds.x + bounds.width + 10;
		int y = bounds.y + 15;

		graphics.setFont(client.getCanvas().getFont());

		// Render High
		graphics.setColor(COLOR_BETTER);
		graphics.drawString("Target High: " + QuantityFormatter.formatNumber(priceData.high), x, y);

		// Render Low
		graphics.setColor(COLOR_WITHIN);
		graphics.drawString("Target Low:  " + QuantityFormatter.formatNumber(priceData.low), x, y + 15);
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
		String statusMsg = "Too Low/High";

		if (priceData != null) {
			if (isBuy) {
				if (price >= priceData.high) {
					color = COLOR_BETTER;
					statusMsg = "Insta Buy";
				} else if (price >= priceData.low) {
					color = COLOR_WITHIN;
					statusMsg = "Competitive";
				}
			} else {
				if (price <= priceData.low) {
					color = COLOR_BETTER;
					statusMsg = "Insta Sell";
				} else if (price <= priceData.high) {
					color = COLOR_WITHIN;
					statusMsg = "Competitive";
				}
			}
		} else {
			color = Color.GRAY;
			statusMsg = "No Wiki Data";
		}

		Rectangle bounds = widget.getBounds();
		graphics.setColor(color);
		graphics.setStroke(new BasicStroke(3));
		graphics.drawRect(bounds.x, bounds.y, bounds.width, bounds.height);

		if (bounds.contains(client.getMouseCanvasPosition().getX(), client.getMouseCanvasPosition().getY())) {
			StringBuilder sb = new StringBuilder();
			sb.append(ColorUtil.wrapWithColorTag("FlipTo5B Analysis", Color.WHITE)).append("</br>");
			sb.append("Status: ").append(ColorUtil.wrapWithColorTag(statusMsg, color)).append("</br>");
			sb.append("Your Price: ").append(QuantityFormatter.formatNumber(price)).append(" gp</br>");
			if (priceData != null) {
				sb.append("Wiki High: ").append(QuantityFormatter.formatNumber(priceData.high)).append("</br>");
				sb.append("Wiki Low: ").append(QuantityFormatter.formatNumber(priceData.low)).append("</br>");
			}
			tooltipManager.add(new Tooltip(sb.toString()));
		}
	}
}