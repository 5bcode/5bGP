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
import net.runelite.client.input.MouseListener;
import java.awt.event.MouseEvent;
import java.awt.Point;

import net.runelite.client.ui.overlay.Overlay;
import net.runelite.client.ui.overlay.OverlayLayer;
import net.runelite.client.ui.overlay.OverlayPanel;
import net.runelite.client.ui.overlay.OverlayPosition;
import net.runelite.client.ui.overlay.tooltip.Tooltip;
import net.runelite.client.ui.overlay.tooltip.TooltipManager;
import net.runelite.client.util.ColorUtil;
import net.runelite.client.util.QuantityFormatter;
import net.runelite.client.ui.overlay.components.PanelComponent;
import net.runelite.client.ui.overlay.components.TitleComponent;
import net.runelite.client.ui.overlay.components.LineComponent;

public class FlipTo5BOverlay extends OverlayPanel implements MouseListener {
	private final Client client;
	private final FlipTo5BPlugin plugin;
	private final TooltipManager tooltipManager;
	private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(FlipTo5BOverlay.class);

	private static final Color COLOR_BETTER = new Color(16, 185, 129);
	private static final Color COLOR_WITHIN = new Color(59, 130, 246);
	private static final Color COLOR_WORSE = new Color(244, 63, 94);
	private int lastSidebarItemId = -1;

	// Bounds for click detection
	private Rectangle highBounds;
	private Rectangle lowBounds;
	private Integer currentHighPrice;
	private Integer currentLowPrice;

	private final PanelComponent targetPricePanel = new PanelComponent();

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
		// Clear click bounds at start of frame to prevent stale clicks
		highBounds = null;
		lowBounds = null;
		currentHighPrice = null;
		currentLowPrice = null;

		panelComponent.getChildren().clear();

		Widget geWindow = client.getWidget(465, 0);
		if (geWindow == null || geWindow.isHidden()) {
			return null; // Don't show panel when GE is closed
		}

		// Draw Border around GE window
		graphics.setColor(Color.CYAN);
		graphics.setStroke(new BasicStroke(2));
		Rectangle b = geWindow.getBounds();
		graphics.drawRect(b.x, b.y, b.width, b.height);

		// Render active offer slots
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

		// Render cancellation advice if available (Co-pilot style)
		String cancelAdvice = plugin.getCancellationAdvice();
		if (cancelAdvice != null && !cancelAdvice.isEmpty()) {
			renderCancellationAdvice(graphics, b, cancelAdvice);
		}

		detectAndShowItem(graphics);

		return super.render(graphics);
	}

	@Override
	public MouseEvent mousePressed(MouseEvent e) {
		// Do NOT check widgets here on EDT. Rely on bounds checks.
		Point p = e.getPoint();
		if (highBounds != null && highBounds.contains(p) && currentHighPrice != null) {
			setPrice(currentHighPrice);
			e.consume();
			return e;
		}
		if (lowBounds != null && lowBounds.contains(p) && currentLowPrice != null) {
			setPrice(currentLowPrice);
			e.consume();
			return e;
		}
		return e;
	}

	private void setPrice(int price) {
		// Move ALL widget interactions to Client Thread
		plugin.getClientThread().invokeLater(() -> {
			Widget priceInput = client.getWidget(465, 33);
			if (priceInput != null && !priceInput.isHidden()) {
				// Try setting text on the container or finding a child that accepts it
				priceInput.setText(String.valueOf(price));
			}
		});
	}

	/**
	 * Renders a cancellation advice banner at the top of the GE window.
	 */
	private void renderCancellationAdvice(Graphics2D graphics, Rectangle geBounds, String advice) {
		int bannerHeight = 24;
		int x = geBounds.x;
		int y = geBounds.y - bannerHeight - 5;
		int width = geBounds.width;

		// Background
		graphics.setColor(new Color(244, 63, 94, 200)); // Rose with alpha
		graphics.fillRoundRect(x, y, width, bannerHeight, 6, 6);

		// Border
		graphics.setColor(new Color(244, 63, 94));
		graphics.setStroke(new BasicStroke(2));
		graphics.drawRoundRect(x, y, width, bannerHeight, 6, 6);

		// Text
		graphics.setColor(Color.WHITE);
		graphics.setFont(graphics.getFont().deriveFont(java.awt.Font.BOLD, 11f));
		java.awt.FontMetrics fm = graphics.getFontMetrics();
		String text = "⚠ " + advice;
		int textX = x + (width - fm.stringWidth(text)) / 2;
		int textY = y + (bannerHeight + fm.getAscent() - fm.getDescent()) / 2;
		graphics.drawString(text, textX, textY);
	}

	private void detectAndShowItem(Graphics2D graphics) {
		Widget geMainWindow = client.getWidget(465, 0);
		boolean geOpen = geMainWindow != null && !geMainWindow.isHidden();

		if (!geOpen) {
			if (lastSidebarItemId != -1) {
				plugin.setSidebarItem(-1);
				lastSidebarItemId = -1;
			}
			return;
		}

		// Check if we're on the MAIN OVERVIEW (not viewing a specific item
		// setup/status)
		boolean isOnSetupScreen = false;

		// Check for quantity input widget (appears in setup screen)
		Widget quantityWidget = client.getWidget(465, 28); // Quantity input
		if (quantityWidget != null && !quantityWidget.isHidden()) {
			isOnSetupScreen = true;
		}

		// Check for price input widget (appears in setup screen)
		Widget priceWidget = client.getWidget(465, 33); // Price per item
		if (priceWidget != null && !priceWidget.isHidden()) {
			isOnSetupScreen = true;
		}

		// Check for confirm button (appears in setup screen)
		Widget confirmWidget = client.getWidget(465, 30);
		if (confirmWidget != null && !confirmWidget.isHidden()) {
			isOnSetupScreen = true;
		}

		// Fallback: check if any item widget is visible
		if (!isOnSetupScreen) {
			for (int widgetId = 0; widgetId < 30; widgetId++) {
				Widget w = client.getWidget(465, widgetId);
				if (w != null && !w.isHidden()) {
					int itemId = w.getItemId();
					if (itemId > 0) {
						isOnSetupScreen = true;
						break;
					}
					// Check children
					Widget[] children = w.getDynamicChildren();
					if (children != null) {
						for (Widget child : children) {
							if (child != null && child.getItemId() > 0) {
								isOnSetupScreen = true;
								break;
							}
						}
					}
					if (isOnSetupScreen)
						break;
				}
			}
		}

		boolean isOnMainOverview = !isOnSetupScreen;

		// If on main overview, clear the item detail and show Active Offers list
		// instead
		if (isOnMainOverview) {
			if (lastSidebarItemId != -1) {
				plugin.setSidebarItem(-1);
				lastSidebarItemId = -1;
			}
			return;
		}

		int itemId = -1;

		// Only scan for items when viewing a specific setup/status screen
		for (int widgetId = 0; widgetId < 60 && itemId <= 0; widgetId++) {
			Widget w = client.getWidget(465, widgetId);
			if (w == null || w.isHidden())
				continue;

			// Check widget itself
			int id = w.getItemId();
			if (id > 0) {
				itemId = id;
				break;
			}

			// Check static children
			Widget[] children = w.getChildren();
			if (children != null) {
				for (Widget child : children) {
					if (child != null && child.getItemId() > 0) {
						itemId = child.getItemId();
						break;
					}
				}
			}
			if (itemId > 0)
				break;

			// Check dynamic children
			Widget[] dynChildren = w.getDynamicChildren();
			if (dynChildren != null) {
				for (Widget child : dynChildren) {
					if (child != null && child.getItemId() > 0) {
						itemId = child.getItemId();
						break;
					}
				}
			}
			if (itemId > 0)
				break;

			// Check nested children
			Widget[] nestedChildren = w.getNestedChildren();
			if (nestedChildren != null) {
				for (Widget child : nestedChildren) {
					if (child != null && child.getItemId() > 0) {
						itemId = child.getItemId();
						break;
					}
				}
			}
		}

		// Try GE search results (chatbox widget 162)
		if (itemId <= 0) {
			Widget searchResults = client.getWidget(162, 43);
			if (searchResults != null && !searchResults.isHidden()) {
				Widget[] children = searchResults.getDynamicChildren();
				if (children != null) {
					for (Widget child : children) {
						if (child != null && child.getItemId() > 0) {
							Rectangle bounds = child.getBounds();
							if (bounds != null && bounds.contains(
									client.getMouseCanvasPosition().getX(),
									client.getMouseCanvasPosition().getY())) {
								itemId = child.getItemId();
								break;
							}
						}
					}
				}
			}
		}

		if (itemId <= 0) {
			if (lastSidebarItemId != -1) {
				plugin.setSidebarItem(-1);
				lastSidebarItemId = -1;
			}
			return;
		}

		// Update Sidebar if changed
		if (itemId != lastSidebarItemId) {
			log.debug("FlipTo5B: Found Item ID: " + itemId);
			plugin.setSidebarItem(itemId);
			lastSidebarItemId = itemId;
		}

		FlipTo5BPlugin.WikiPrice priceData = plugin.getWikiPrice(itemId);
		if (priceData == null) {
			return;
		}

		Widget priceInput = client.getWidget(465, 33);
		if (priceInput == null || priceInput.isHidden()) {
			return;
		}

		targetPricePanel.getChildren().clear();
		targetPricePanel.setPreferredSize(new Dimension(200, 0));

		Rectangle bounds = priceInput.getBounds();
		// Position BELOW the price input
		targetPricePanel.setPreferredLocation(new Point(bounds.x, bounds.y + bounds.height + 10));

		long ageSecs = (System.currentTimeMillis() - priceData.timestamp) / 1000;
		String ageText = ageSecs < 60 ? ageSecs + "s ago" : (ageSecs / 60) + "m ago";

		targetPricePanel.getChildren().add(TitleComponent.builder()
				.text("FlipTo5B Targets (" + ageText + ")")
				.color(Color.YELLOW)
				.build());

		targetPricePanel.getChildren().add(LineComponent.builder()
				.left("Target Buy:")
				.right(QuantityFormatter.formatNumber(priceData.high) + " gp")
				.rightColor(COLOR_BETTER)
				.build());

		targetPricePanel.getChildren().add(LineComponent.builder()
				.left("Target Sell:")
				.right(QuantityFormatter.formatNumber(priceData.low) + " gp")
				.rightColor(COLOR_WITHIN)
				.build());

		targetPricePanel.render(graphics);

		// Update click bounds (approximation based on panel location)
		// We can't easily get exact bounds of children components without more logic,
		// so we'll just set them to the whole area for now or refine if strict clicking
		// needed.
		// For now, disabling the explicit click-to-fill features from the overlay logic
		// to rely on standard Panel interactions if desired, OR we recover them:

		// Let's re-enable basic click zones for "Buy" and "Sell" rows
		// assuming standard PanelComponent layout:
		int panelX = bounds.x + bounds.width + 10;
		int panelY = bounds.y;
		// Title (approx 16px) + Padding
		int rowHeight = 16;
		int yOffset = panelY + 20; // Skip title

		// High click bound
		highBounds = new Rectangle(panelX, yOffset, 200, rowHeight);
		currentHighPrice = priceData.high;

		// Low click bound
		yOffset += rowHeight;
		lowBounds = new Rectangle(panelX, yOffset, 200, rowHeight);
		currentLowPrice = priceData.low;
	}

	@Override
	public MouseEvent mouseClicked(MouseEvent e) {
		return e;
	}

	@Override
	public MouseEvent mouseReleased(MouseEvent e) {
		return e;
	}

	@Override
	public MouseEvent mouseEntered(MouseEvent e) {
		return e;
	}

	@Override
	public MouseEvent mouseExited(MouseEvent e) {
		return e;
	}

	@Override
	public MouseEvent mouseDragged(MouseEvent e) {
		return e;
	}

	@Override
	public MouseEvent mouseMoved(MouseEvent e) {
		return e;
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

				int potentialProfit = 0;
				if (isBuy) {
					int sellParams = priceData.high;
					int tax = calculateTax(sellParams);
					int afterTax = sellParams - tax;
					potentialProfit = afterTax - price;
				} else {
					int tax = calculateTax(price);
					int afterTax = price - tax;
					sb.append("After Tax: ").append(QuantityFormatter.formatNumber(afterTax)).append(" gp</br>");
				}

				if (isBuy && potentialProfit != 0) {
					Color profitColor = potentialProfit > 0 ? Color.GREEN : Color.RED;
					sb.append("Est. Profit: ").append(
							ColorUtil.wrapWithColorTag(QuantityFormatter.formatNumber(potentialProfit), profitColor))
							.append(" gp/ea</br>");
				}
			}
			tooltipManager.add(new Tooltip(sb.toString()));
		}
	}

	private int calculateTax(int price) {
		if (price < 100)
			return 0;
		int tax = (int) Math.floor(price * 0.02);
		if (tax > 5000000)
			tax = 5000000;
		return tax;
	}
}