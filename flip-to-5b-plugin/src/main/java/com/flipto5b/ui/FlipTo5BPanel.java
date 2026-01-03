package com.flipto5b.ui;

import com.flipto5b.FlipTo5BPlugin;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.Component;
import java.awt.Container;
import java.awt.CardLayout;
import javax.inject.Inject;
import javax.swing.*;
import javax.swing.border.EmptyBorder;
import net.runelite.client.ui.ColorScheme;
import net.runelite.client.ui.PluginPanel;
import net.runelite.client.util.QuantityFormatter;
import net.runelite.client.game.ItemManager;

public class FlipTo5BPanel extends PluginPanel {
    @SuppressWarnings("unused")
    private final FlipTo5BPlugin plugin;
    @SuppressWarnings("unused")
    private final ItemManager itemManager;

    private final JPanel activeOffersContainer = new JPanel();
    private final JPanel historyContainer = new JPanel();
    private final JPanel signalsContainer = new JPanel();
    private final JLabel sessionProfitLabel = new JLabel();

    private long sessionProfit = 0;

    private final JPanel contentPanel = new JPanel();
    private final CardLayout cardLayout = new CardLayout();

    // View Names
    private static final String VIEW_OVERVIEW = "OVERVIEW";
    private static final String VIEW_DETAILS = "DETAILS";

    @Inject
    public FlipTo5BPanel(FlipTo5BPlugin plugin, ItemManager itemManager) {
        super();
        this.plugin = plugin;
        this.itemManager = itemManager;

        setBorder(new EmptyBorder(10, 10, 10, 10));
        setBackground(ColorScheme.DARK_GRAY_COLOR);
        setLayout(new BorderLayout());

        // Header: Session Profit
        JPanel profitPanel = new JPanel(new BorderLayout());
        profitPanel.setBorder(new EmptyBorder(0, 0, 10, 0));
        profitPanel.setBackground(ColorScheme.DARKER_GRAY_COLOR);

        JLabel title = new JLabel("Session Profit:");
        title.setForeground(Color.WHITE);

        sessionProfitLabel.setText("DEBUG ACTIVE");
        sessionProfitLabel.setForeground(Color.CYAN);

        profitPanel.add(title, BorderLayout.WEST);
        profitPanel.add(sessionProfitLabel, BorderLayout.EAST);
        add(profitPanel, BorderLayout.NORTH);

        // Search Bar Panel
        JPanel searchPanel = new JPanel(new BorderLayout());
        searchPanel.setBackground(ColorScheme.DARK_GRAY_COLOR);
        searchPanel.setBorder(new EmptyBorder(5, 5, 5, 5));

        net.runelite.client.ui.components.IconTextField searchBar = new net.runelite.client.ui.components.IconTextField();
        searchBar.setIcon(net.runelite.client.ui.components.IconTextField.Icon.SEARCH);
        searchBar.setPreferredSize(new Dimension(100, 30));
        searchBar.setBackground(ColorScheme.DARKER_GRAY_COLOR);
        searchBar.setHoverBackgroundColor(ColorScheme.DARK_GRAY_HOVER_COLOR);
        searchBar.setMinimumSize(new Dimension(0, 30));
        searchBar.addActionListener(e -> {
            String query = searchBar.getText();
            if (query != null && !query.isEmpty()) {
                // Execute search on background thread to avoid UI freeze
                plugin.getExecutor().submit(() -> {
                    var results = itemManager.search(query);
                    if (!results.isEmpty()) {
                        // Pick first match
                        int itemId = results.get(0).getId();
                        plugin.setSidebarItem(itemId);
                        SwingUtilities.invokeLater(() -> searchBar.setText(""));
                    }
                });
            }
        });

        searchPanel.add(searchBar, BorderLayout.CENTER);

        // Container for Top Elements (Profit + Search)
        JPanel topContainer = new JPanel();
        topContainer.setLayout(new BoxLayout(topContainer, BoxLayout.Y_AXIS));
        topContainer.add(profitPanel);
        topContainer.add(searchPanel);

        add(topContainer, BorderLayout.NORTH);

        // Main Content Area with CardLayout
        contentPanel.setLayout(cardLayout);
        contentPanel.setBackground(ColorScheme.DARK_GRAY_COLOR);
        add(contentPanel, BorderLayout.CENTER);

        // 1. OVERVIEW PANEL
        JPanel overviewPanel = new JPanel();
        overviewPanel.setLayout(new BoxLayout(overviewPanel, BoxLayout.Y_AXIS));
        overviewPanel.setBackground(ColorScheme.DARK_GRAY_COLOR);

        overviewPanel.add(createHeader("Active Offers"));
        activeOffersContainer.setLayout(new BoxLayout(activeOffersContainer, BoxLayout.Y_AXIS));
        activeOffersContainer.setBackground(ColorScheme.DARK_GRAY_COLOR);
        overviewPanel.add(activeOffersContainer);

        overviewPanel.add(Box.createRigidArea(new Dimension(0, 10)));

        overviewPanel.add(createHeader("Market Opportunities"));
        signalsContainer.setLayout(new BoxLayout(signalsContainer, BoxLayout.Y_AXIS));
        signalsContainer.setBackground(ColorScheme.DARK_GRAY_COLOR);
        overviewPanel.add(signalsContainer);

        overviewPanel.add(new JPanel() {
            {
                setPreferredSize(new Dimension(0, 10));
                setBackground(ColorScheme.DARK_GRAY_COLOR);
            }
        });

        overviewPanel.add(createHeader("Recent History"));
        historyContainer.setLayout(new BoxLayout(historyContainer, BoxLayout.Y_AXIS));
        historyContainer.setBackground(ColorScheme.DARK_GRAY_COLOR);
        overviewPanel.add(historyContainer);

        contentPanel.add(overviewPanel, VIEW_OVERVIEW);

        // 2. DETAILS PANEL (Placeholder, updated dynamically)
        JPanel detailsPanelHolder = new JPanel(new BorderLayout());
        detailsPanelHolder.setBackground(ColorScheme.DARK_GRAY_COLOR);
        contentPanel.add(detailsPanelHolder, VIEW_DETAILS);

        // Show Overview by default
        cardLayout.show(contentPanel, VIEW_OVERVIEW);
    }

    public void showItemDetails(String name, FlipTo5BPlugin.WikiPrice priceData,
            net.runelite.client.util.AsyncBufferedImage icon) {
        SwingUtilities.invokeLater(() -> {
            if (name == null) {
                cardLayout.show(contentPanel, VIEW_OVERVIEW);
                return;
            }

            JPanel details = new JPanel();
            details.setLayout(new BoxLayout(details, BoxLayout.Y_AXIS));
            details.setBackground(ColorScheme.DARK_GRAY_COLOR);

            // Back Button
            JButton backBtn = new JButton("Back to Overview");
            backBtn.addActionListener(e -> cardLayout.show(contentPanel, VIEW_OVERVIEW));
            backBtn.setAlignmentX(Component.CENTER_ALIGNMENT);
            details.add(backBtn);
            details.add(Box.createRigidArea(new Dimension(0, 10)));

            // Header
            JPanel header = new JPanel(new BorderLayout());
            header.setBackground(ColorScheme.DARKER_GRAY_COLOR);
            header.setBorder(new EmptyBorder(10, 10, 10, 10));
            JLabel nameLabel = new JLabel(name);
            nameLabel.setForeground(Color.WHITE);
            nameLabel.setFont(net.runelite.client.ui.FontManager.getRunescapeBoldFont());
            if (icon != null) {
                nameLabel.setIcon(new javax.swing.ImageIcon(icon));
            }
            header.add(nameLabel, BorderLayout.CENTER);
            details.add(header);

            details.add(Box.createRigidArea(new Dimension(0, 15)));

            if (priceData != null) {
                // Prices
                details.add(createDetailRow("Wiki Buy:", QuantityFormatter.formatNumber(priceData.high),
                        ColorScheme.GRAND_EXCHANGE_PRICE));
                details.add(createDetailRow("Wiki Sell:", QuantityFormatter.formatNumber(priceData.low),
                        ColorScheme.GRAND_EXCHANGE_PRICE));

                details.add(Box.createRigidArea(new Dimension(0, 10)));

                // Confidence Meter
                ConfidenceMeter meter = new ConfidenceMeter();
                // Mock confidence for now or pass via update
                meter.update(75, "BUY", "Strong Momentum");
                details.add(meter);

                details.add(Box.createRigidArea(new Dimension(0, 10)));

                // Analysis
                int margin = priceData.high - priceData.low;
                int tax = (int) Math.floor(priceData.high * 0.01); // 1% tax for calculation
                if (tax > 5000000)
                    tax = 5000000;

                int profit = margin - tax;
                double roi = ((double) profit / priceData.low) * 100;

                details.add(createDetailRow("Margin:", QuantityFormatter.formatNumber(margin), Color.WHITE));
                details.add(createDetailRow("Tax (1%):", QuantityFormatter.formatNumber(tax), Color.RED));
                details.add(Box.createRigidArea(new Dimension(0, 5)));

                details.add(createDetailRow("Profit/Ea:", QuantityFormatter.formatNumber(profit),
                        profit > 0 ? Color.GREEN : Color.RED));
                details.add(
                        createDetailRow("ROI:", String.format("%.2f%%", roi), profit > 0 ? Color.GREEN : Color.RED));
            }

            // Update content
            JPanel container = (JPanel) findComponent(contentPanel, VIEW_DETAILS);
            container.removeAll();
            container.add(details, BorderLayout.NORTH);
            container.revalidate();
            container.repaint();

            cardLayout.show(contentPanel, VIEW_DETAILS);
        });
    }

    private Component findComponent(Container container, String name) {
        for (Component c : container.getComponents()) {
            if (name.equals(c.getName()))
                return c; // Standard card layout naming
        }
        // Fallback since CardLayout adds with constraints, assume we render into the
        // second slot for now
        return container.getComponent(1);
    }

    private JPanel createDetailRow(String labelText, String valueText, Color valueColor) {
        JPanel row = new JPanel(new BorderLayout());
        row.setBackground(ColorScheme.DARK_GRAY_COLOR);
        row.setBorder(new EmptyBorder(2, 5, 2, 5));

        JLabel label = new JLabel(labelText);
        label.setForeground(Color.GRAY);

        JLabel value = new JLabel(valueText);
        value.setForeground(valueColor);
        value.setFont(net.runelite.client.ui.FontManager.getRunescapeSmallFont());

        row.add(label, BorderLayout.WEST);
        row.add(value, BorderLayout.EAST);
        return row;
    }

    private JPanel createHeader(String text) {
        JPanel header = new JPanel(new BorderLayout());
        header.setBackground(ColorScheme.DARK_GRAY_COLOR);
        header.setBorder(new EmptyBorder(5, 0, 5, 0));

        JLabel label = new JLabel(text);
        label.setForeground(Color.WHITE);

        header.add(label, BorderLayout.CENTER);
        return header;
    }

    public void updateSessionProfit(long profit) {
        sessionProfit += profit;
        SwingUtilities.invokeLater(() -> {
            sessionProfitLabel.setText(QuantityFormatter.formatNumber(sessionProfit) + " gp");
            if (sessionProfit > 0)
                sessionProfitLabel.setForeground(Color.GREEN);
            else if (sessionProfit < 0)
                sessionProfitLabel.setForeground(Color.RED);
            else
                sessionProfitLabel.setForeground(ColorScheme.GRAND_EXCHANGE_PRICE);
        });
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
        SwingUtilities.invokeLater(() -> {
            activeOffersContainer.removeAll();
            for (PanelOffer offer : offers) {
                OfferPanel panel = new OfferPanel();
                panel.update(offer.name, offer.price, offer.qty, offer.status, offer.color, offer.icon);
                activeOffersContainer.add(panel);
            }
            activeOffersContainer.revalidate();
            activeOffersContainer.repaint();
        });
    }

    public void addHistoryEntry(String name, int qty, int price, boolean purchased) {
        SwingUtilities.invokeLater(() -> {
            OfferPanel panel = new OfferPanel();
            panel.update(name, price, qty, purchased ? "BOUGHT" : "SOLD", purchased ? Color.GREEN : Color.RED, null);
            historyContainer.add(panel, 0);
            historyContainer.revalidate();
            historyContainer.repaint();
        });
    }

    public void updateSignals(java.util.List<com.flipto5b.model.MarketSignal> signals) {
        SwingUtilities.invokeLater(() -> {
            signalsContainer.removeAll();
            for (com.flipto5b.model.MarketSignal signal : signals) {
                // Determine color based on action
                Color actionColor = Color.GRAY;
                switch (signal.getAction()) {
                    case BUY:
                        actionColor = Color.GREEN;
                        break;
                    case SELL:
                        actionColor = Color.RED;
                        break;
                    case WAIT:
                        actionColor = Color.ORANGE;
                        break;
                    default:
                        actionColor = Color.GRAY;
                        break;
                }

                OfferPanel panel = new OfferPanel();
                panel.update(
                        signal.getItemName(),
                        (int) signal.getMarginAfterTax(),
                        (int) signal.getOpportunityScore(),
                        signal.getAction().toString(),
                        actionColor,
                        itemManager.getImage(signal.getItemId()));
                // Override label to match Signal format (hacky reuse of OfferPanel, ideally use
                // SignalPanel)
                // For now, let's stick to reusing OfferPanel as in the screenshot for
                // consistency
                // Or better, use our new SignalPanel

                // Actually, let's use the new SignalPanel I just created!
                // SignalPanel signalCard = new SignalPanel(signal,
                // itemManager.getImage(signal.getItemId()));
                // signalsContainer.add(signalCard);
            }

            // Re-using OfferPanel logic for now to ensure it compiles safely with verified
            // file
            for (com.flipto5b.model.MarketSignal signal : signals) {
                OfferPanel panel = new OfferPanel();
                panel.update(signal.getItemName(),
                        signal.getWikiLow(), // Show price
                        (int) signal.getMarginAfterTax(), // Reuse qty slot for margin
                        signal.getAction().toString(),
                        signal.getAction() == com.flipto5b.model.MarketSignal.SignalAction.BUY ? Color.GREEN
                                : Color.YELLOW,
                        itemManager.getImage(signal.getItemId()));
                signalsContainer.add(panel);
            }

            signalsContainer.revalidate();
            signalsContainer.repaint();
        });
    }

    public static class PanelOffer {
        public String name;
        public int qty;
        public int price;
        public String status;
        public Color color;
        public net.runelite.client.util.AsyncBufferedImage icon;

        public PanelOffer(String name, int qty, int price, String status, Color color,
                net.runelite.client.util.AsyncBufferedImage icon) {
            this.name = name;
            this.qty = qty;
            this.price = price;
            this.status = status;
            this.color = color;
            this.icon = icon;
        }
    }
}
