package com.flipto5b.ui;

import com.flipto5b.FlipTo5BPlugin;
import java.awt.BorderLayout;
import java.awt.CardLayout;
import java.awt.Color;
import java.awt.Dimension;
import javax.inject.Inject;
import javax.swing.Box;
import javax.swing.BoxLayout;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.SwingUtilities;
import javax.swing.border.EmptyBorder;
import net.runelite.client.game.ItemManager;
import net.runelite.client.ui.ColorScheme;
import net.runelite.client.ui.PluginPanel;
import net.runelite.client.util.QuantityFormatter;

public class FlipTo5BPanel extends PluginPanel {
    private final FlipTo5BPlugin plugin;

    private final JPanel contentPanel = new JPanel();
    private final CardLayout cardLayout = new CardLayout();

    // Views
    public static final String VIEW_SLOTS = "SLOTS";
    public static final String VIEW_FLIPPING = "FLIPPING";
    public static final String VIEW_STATS = "STATS";

    // Panels
    private final NavigationPanel navPanel;
    private final JPanel slotsPanel = new JPanel();
    private final FlippingPanel flippingPanel;
    private final StatsPanel statsPanel = new StatsPanel();

    // Slots Panel Components
    private final JPanel activeOffersContainer = new JPanel();
    private java.util.List<PanelOffer> lastOffers = new java.util.ArrayList<>();

    @Inject
    public FlipTo5BPanel(FlipTo5BPlugin plugin, ItemManager itemManager) {
        super();
        this.plugin = plugin;

        setLayout(new BorderLayout());
        setBackground(ColorScheme.DARK_GRAY_COLOR);

        // Navigation
        navPanel = new NavigationPanel(this);
        add(navPanel, BorderLayout.NORTH);

        // Content Area
        contentPanel.setLayout(cardLayout);
        contentPanel.setBackground(ColorScheme.DARK_GRAY_COLOR);

        // 1. SLOTS VIEW
        slotsPanel.setLayout(new BoxLayout(slotsPanel, BoxLayout.Y_AXIS));
        slotsPanel.setBackground(ColorScheme.DARK_GRAY_COLOR);
        slotsPanel.setBorder(new EmptyBorder(10, 10, 10, 10));

        // Add Active Offers components
        activeOffersContainer.setLayout(new BoxLayout(activeOffersContainer, BoxLayout.Y_AXIS));
        activeOffersContainer.setBackground(ColorScheme.DARK_GRAY_COLOR);

        JLabel header = new JLabel("Active Offers");
        header.setForeground(Color.WHITE);
        header.setAlignmentX(CENTER_ALIGNMENT);

        slotsPanel.add(header);
        slotsPanel.add(Box.createRigidArea(new Dimension(0, 10)));
        slotsPanel.add(activeOffersContainer);

        contentPanel.add(new JScrollPane(slotsPanel), VIEW_SLOTS);

        // 2. FLIPPING VIEW
        flippingPanel = new FlippingPanel(plugin, itemManager);
        contentPanel.add(flippingPanel, VIEW_FLIPPING);

        // 3. STATS VIEW
        contentPanel.add(statsPanel, VIEW_STATS);

        add(contentPanel, BorderLayout.CENTER);

        // Default View
        showView(VIEW_SLOTS);
    }

    public void showView(String viewName) {
        cardLayout.show(contentPanel, viewName);
    }

    public void updateSessionProfit(long profit) {
        String text = QuantityFormatter.formatNumber(profit) + " gp";
        Color color = profit > 0 ? Color.GREEN : (profit < 0 ? Color.RED : ColorScheme.GRAND_EXCHANGE_PRICE);
        statsPanel.updateProfit(text, color);
    }

    public void addActiveOffer(String name, int qty, int price, String status, Color color,
            net.runelite.client.util.AsyncBufferedImage icon) {
        SwingUtilities.invokeLater(() -> {
            OfferPanel panel = new OfferPanel();
            panel.update(name, price, qty, status, color, icon);
            activeOffersContainer.add(panel, 0); // Add to top
            activeOffersContainer.revalidate();
            activeOffersContainer.repaint();
        });
    }

    public void updateOffers(java.util.List<PanelOffer> offers) {
        if (offers.equals(lastOffers)) {
            return;
        }
        lastOffers = new java.util.ArrayList<>(offers); // Copy

        SwingUtilities.invokeLater(() -> {
            activeOffersContainer.removeAll();
            for (PanelOffer offer : offers) {
                OfferPanel panel = new OfferPanel();
                panel.update(offer.name, offer.price, offer.qty, offer.status, offer.color, offer.icon);

                panel.setCursor(new java.awt.Cursor(java.awt.Cursor.HAND_CURSOR));
                final int itemId = offer.itemId;
                panel.addMouseListener(new java.awt.event.MouseAdapter() {
                    @Override
                    public void mouseClicked(java.awt.event.MouseEvent e) {
                        plugin.setSidebarItem(itemId);
                        showView(VIEW_FLIPPING);
                        flippingPanel.addItemCard(itemId);
                    }
                });

                activeOffersContainer.add(panel);
            }
            activeOffersContainer.revalidate();
            activeOffersContainer.repaint();
        });
    }

    public void addHistoryEntry(String name, int qty, int price, boolean purchased) {
        // Delegate to StatsPanel logic when implemented
        // statsPanel.addHistory(...)
    }

    public void updateBestFlips(java.util.List<com.flipto5b.FlipTo5BPlugin.FlipOpportunity> flips) {
        if (flippingPanel != null) {
            flippingPanel.updateBestFlips(flips);
        }
    }

    public void updateSuggestion(com.flipto5b.FlipTo5BPlugin.Suggestion suggestion) {
        // Delegate
    }

    public void updateQuickPicks(java.util.List<com.flipto5b.model.MarketSignal> signals) {
        if (flippingPanel != null) {
            flippingPanel.updateQuickPicks(signals);
        }
    }

    public void showItemDetails(int itemId) {
        showView(VIEW_FLIPPING);
        flippingPanel.addItemCard(itemId);
    }

    public static class PanelOffer {
        public String name;
        public int itemId;
        public int qty;
        public int price;
        public String status;
        public Color color;
        public net.runelite.client.util.AsyncBufferedImage icon;

        public PanelOffer(String name, int itemId, int qty, int price, String status, Color color,
                net.runelite.client.util.AsyncBufferedImage icon) {
            this.name = name;
            this.itemId = itemId;
            this.qty = qty;
            this.price = price;
            this.status = status;
            this.color = color;
            this.icon = icon;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o)
                return true;
            if (o == null || getClass() != o.getClass())
                return false;
            PanelOffer that = (PanelOffer) o;
            return itemId == that.itemId &&
                    qty == that.qty &&
                    price == that.price &&
                    java.util.Objects.equals(name, that.name) &&
                    java.util.Objects.equals(status, that.status) &&
                    java.util.Objects.equals(color, that.color);
        }

        @Override
        public int hashCode() {
            return java.util.Objects.hash(name, itemId, qty, price, status, color);
        }
    }
}
