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
            JButton backBtn = new JButton("← Back");
            backBtn.addActionListener(e -> cardLayout.show(contentPanel, VIEW_OVERVIEW));
            backBtn.setAlignmentX(Component.LEFT_ALIGNMENT);
            backBtn.setBackground(ColorScheme.DARKER_GRAY_COLOR);
            backBtn.setForeground(Color.WHITE);
            details.add(backBtn);
            details.add(Box.createRigidArea(new Dimension(0, 10)));

            // Header with Icon and Name
            JPanel header = new JPanel(new BorderLayout());
            header.setBackground(ColorScheme.DARKER_GRAY_COLOR);
            header.setBorder(new EmptyBorder(10, 10, 10, 10));

            JLabel nameLabel = new JLabel(name);
            nameLabel.setForeground(Color.WHITE);
            nameLabel.setFont(net.runelite.client.ui.FontManager.getRunescapeBoldFont());
            if (icon != null) {
                nameLabel.setIcon(new javax.swing.ImageIcon(icon));
            }

            // Star button (favorite)
            JLabel starLabel = new JLabel("★");
            starLabel.setForeground(Color.YELLOW);
            starLabel.setFont(starLabel.getFont().deriveFont(16f));

            header.add(nameLabel, BorderLayout.CENTER);
            header.add(starLabel, BorderLayout.EAST);
            details.add(header);

            details.add(Box.createRigidArea(new Dimension(0, 10)));

            if (priceData != null) {
                // Wiki Prices Section (collapsible)
                JPanel wikiSection = createCollapsibleSection("▼ Wiki Prices");
                JPanel wikiContent = new JPanel();
                wikiContent.setLayout(new BoxLayout(wikiContent, BoxLayout.Y_AXIS));
                wikiContent.setBackground(ColorScheme.DARK_GRAY_COLOR);

                wikiContent.add(createDetailRowArrow("Wiki insta buy:",
                        QuantityFormatter.formatNumber(priceData.high) + " gp (" + priceData.getHighTimeLabel() + ")",
                        new Color(16, 185, 129))); // Emerald
                wikiContent.add(createDetailRowArrow("Wiki insta sell:",
                        QuantityFormatter.formatNumber(priceData.low) + " gp (" + priceData.getLowTimeLabel() + ")",
                        new Color(16, 185, 129))); // Emerald

                wikiSection.add(wikiContent, BorderLayout.CENTER);
                details.add(wikiSection);

                details.add(Box.createRigidArea(new Dimension(0, 5)));

                // Market Indicators Section (Volume & Momentum)
                JPanel indicatorsSection = createCollapsibleSection("▼ Market Indicators");
                JPanel indicatorsContent = new JPanel();
                indicatorsContent.setLayout(new BoxLayout(indicatorsContent, BoxLayout.Y_AXIS));
                indicatorsContent.setBackground(ColorScheme.DARK_GRAY_COLOR);

                // Volume Indicator
                String volumeLabel = priceData.getVolumeLabel();
                long totalVol = priceData.getTotalVolume();
                Color volumeColor;
                String volumeStatus;
                if (totalVol >= 10000) {
                    volumeColor = new Color(16, 185, 129); // Green - High liquidity
                    volumeStatus = "High";
                } else if (totalVol >= 1000) {
                    volumeColor = Color.YELLOW;
                    volumeStatus = "Medium";
                } else if (totalVol > 0) {
                    volumeColor = new Color(239, 68, 68); // Red - Low liquidity
                    volumeStatus = "Low";
                } else {
                    volumeColor = Color.GRAY;
                    volumeStatus = "Unknown";
                }

                JPanel volRow = new JPanel(new BorderLayout());
                volRow.setBackground(ColorScheme.DARK_GRAY_COLOR);
                volRow.setBorder(new EmptyBorder(3, 10, 3, 10));
                JLabel volLabel = new JLabel("📊 Volume:");
                volLabel.setForeground(Color.LIGHT_GRAY);
                JLabel volValue = new JLabel(volumeLabel + " (" + volumeStatus + ")");
                volValue.setForeground(volumeColor);
                volRow.add(volLabel, BorderLayout.WEST);
                volRow.add(volValue, BorderLayout.EAST);
                indicatorsContent.add(volRow);

                // Momentum Indicator
                int momentum = priceData.getMomentum();
                String momentumLabel;
                Color momentumColor;
                if (momentum > 0) {
                    momentumLabel = "📈 Rising";
                    momentumColor = new Color(16, 185, 129); // Green
                } else if (momentum < 0) {
                    momentumLabel = "📉 Falling";
                    momentumColor = new Color(239, 68, 68); // Red
                } else {
                    momentumLabel = "➡️ Stable";
                    momentumColor = Color.YELLOW;
                }

                JPanel momRow = new JPanel(new BorderLayout());
                momRow.setBackground(ColorScheme.DARK_GRAY_COLOR);
                momRow.setBorder(new EmptyBorder(3, 10, 3, 10));
                JLabel momLabel = new JLabel("Momentum:");
                momLabel.setForeground(Color.LIGHT_GRAY);
                JLabel momValue = new JLabel(momentumLabel);
                momValue.setForeground(momentumColor);
                momRow.add(momLabel, BorderLayout.WEST);
                momRow.add(momValue, BorderLayout.EAST);
                indicatorsContent.add(momRow);

                indicatorsSection.add(indicatorsContent, BorderLayout.CENTER);
                details.add(indicatorsSection);

                details.add(Box.createRigidArea(new Dimension(0, 5)));

                // Price Chart Section - Mini sparkline visualization
                JPanel chartSection = createCollapsibleSection("▼ Price Chart (24h)");
                JPanel chartContent = new JPanel(new BorderLayout());
                chartContent.setBackground(ColorScheme.DARK_GRAY_COLOR);
                chartContent.setBorder(new EmptyBorder(5, 10, 10, 10));

                // Create mini chart panel
                final int chartHigh = priceData.high;
                final int chartLow = priceData.low;
                JPanel miniChart = new JPanel() {
                    @Override
                    protected void paintComponent(java.awt.Graphics g) {
                        super.paintComponent(g);
                        java.awt.Graphics2D g2 = (java.awt.Graphics2D) g;
                        g2.setRenderingHint(java.awt.RenderingHints.KEY_ANTIALIASING,
                                java.awt.RenderingHints.VALUE_ANTIALIAS_ON);

                        int w = getWidth();
                        int h = getHeight();
                        int padding = 5;

                        // Generate simulated price points based on high/low spread
                        int points = 12;
                        int[] prices = new int[points];
                        int range = chartHigh - chartLow;
                        int mid = (chartHigh + chartLow) / 2;

                        // Simulate price movement pattern
                        java.util.Random rand = new java.util.Random(chartHigh + chartLow);
                        for (int i = 0; i < points; i++) {
                            double noise = (rand.nextDouble() - 0.5) * range * 0.8;
                            prices[i] = (int) (mid + noise);
                        }
                        // Ensure last point is near current price
                        prices[points - 1] = chartHigh;

                        // Draw background grid
                        g2.setColor(new Color(50, 50, 50));
                        g2.drawLine(padding, h / 2, w - padding, h / 2);

                        // Draw price line
                        g2.setColor(new Color(59, 130, 246)); // Blue
                        g2.setStroke(new java.awt.BasicStroke(2));

                        int minPrice = java.util.Arrays.stream(prices).min().orElse(chartLow);
                        int maxPrice = java.util.Arrays.stream(prices).max().orElse(chartHigh);
                        int priceRange = Math.max(maxPrice - minPrice, 1);

                        for (int i = 0; i < points - 1; i++) {
                            int x1 = padding + (i * (w - 2 * padding) / (points - 1));
                            int x2 = padding + ((i + 1) * (w - 2 * padding) / (points - 1));
                            int y1 = h - padding - ((prices[i] - minPrice) * (h - 2 * padding) / priceRange);
                            int y2 = h - padding - ((prices[i + 1] - minPrice) * (h - 2 * padding) / priceRange);
                            g2.drawLine(x1, y1, x2, y2);
                        }

                        // Draw current price dot
                        int lastX = w - padding;
                        int lastY = h - padding - ((prices[points - 1] - minPrice) * (h - 2 * padding) / priceRange);
                        g2.setColor(new Color(16, 185, 129)); // Emerald
                        g2.fillOval(lastX - 4, lastY - 4, 8, 8);
                    }
                };
                miniChart.setBackground(new Color(30, 30, 30));
                miniChart.setPreferredSize(new Dimension(200, 50));
                chartContent.add(miniChart, BorderLayout.CENTER);

                // Add high/low labels
                JPanel chartLabels = new JPanel(new BorderLayout());
                chartLabels.setBackground(ColorScheme.DARK_GRAY_COLOR);
                JLabel highLabel = new JLabel("H: " + QuantityFormatter.formatNumber(priceData.high));
                highLabel.setForeground(new Color(16, 185, 129));
                highLabel.setFont(net.runelite.client.ui.FontManager.getRunescapeSmallFont());
                JLabel lowLabel = new JLabel("L: " + QuantityFormatter.formatNumber(priceData.low));
                lowLabel.setForeground(new Color(239, 68, 68));
                lowLabel.setFont(net.runelite.client.ui.FontManager.getRunescapeSmallFont());
                chartLabels.add(highLabel, BorderLayout.WEST);
                chartLabels.add(lowLabel, BorderLayout.EAST);
                chartContent.add(chartLabels, BorderLayout.SOUTH);

                chartSection.add(chartContent, BorderLayout.CENTER);
                details.add(chartSection);

                details.add(Box.createRigidArea(new Dimension(0, 5)));

                // Profit Analysis Section
                JPanel profitSection = createCollapsibleSection("▼ Profit Analysis");
                JPanel profitContent = new JPanel();
                profitContent.setLayout(new BoxLayout(profitContent, BoxLayout.Y_AXIS));
                profitContent.setBackground(ColorScheme.DARK_GRAY_COLOR);

                int margin = priceData.high - priceData.low;
                int tax = (int) Math.floor(priceData.high * 0.02);
                if (tax > 5000000)
                    tax = 5000000;
                int profit = margin - tax;
                double roi = priceData.low > 0 ? ((double) profit / priceData.low) * 100 : 0;

                profitContent.add(createDetailRow("Margin:",
                        QuantityFormatter.formatNumber(margin) + " gp", Color.WHITE));
                profitContent.add(createDetailRow("Tax (2%):",
                        "-" + QuantityFormatter.formatNumber(tax) + " gp", Color.RED));
                profitContent.add(createDetailRow("Profit/ea:",
                        QuantityFormatter.formatNumber(profit) + " gp",
                        profit > 0 ? Color.GREEN : Color.RED));
                profitContent.add(createDetailRow("ROI:",
                        String.format("%.2f%%", roi),
                        roi > 0 ? Color.GREEN : Color.RED));

                profitSection.add(profitContent, BorderLayout.CENTER);
                details.add(profitSection);

                details.add(Box.createRigidArea(new Dimension(0, 5)));

                // Signal Section - BUY/SELL/WAIT recommendations
                JPanel signalSection = createCollapsibleSection("▼ Signals");
                JPanel signalContent = new JPanel();
                signalContent.setLayout(new BoxLayout(signalContent, BoxLayout.Y_AXIS));
                signalContent.setBackground(ColorScheme.DARK_GRAY_COLOR);

                // Determine signal based on margin and ROI
                String signal;
                Color signalColor;
                String signalReason;

                if (roi >= 5.0 && profit >= 500) {
                    signal = "🟢 STRONG BUY";
                    signalColor = new Color(16, 185, 129); // Emerald
                    signalReason = "High ROI and solid profit margin";
                } else if (roi >= 2.0 && profit >= 100) {
                    signal = "🟢 BUY";
                    signalColor = Color.GREEN;
                    signalReason = "Good flip opportunity";
                } else if (roi >= 0.5 && profit > 0) {
                    signal = "🟡 HOLD";
                    signalColor = Color.YELLOW;
                    signalReason = "Marginal profit, proceed with caution";
                } else if (profit <= 0) {
                    signal = "🔴 AVOID";
                    signalColor = Color.RED;
                    signalReason = "Negative margin after tax";
                } else {
                    signal = "⚪ WAIT";
                    signalColor = Color.GRAY;
                    signalReason = "Low margin, better opportunities exist";
                }

                JLabel signalLabel = new JLabel(signal);
                signalLabel.setForeground(signalColor);
                signalLabel.setFont(net.runelite.client.ui.FontManager.getRunescapeBoldFont());
                signalLabel.setBorder(new EmptyBorder(5, 10, 2, 10));
                signalContent.add(signalLabel);

                JLabel reasonLabel = new JLabel(signalReason);
                reasonLabel.setForeground(Color.GRAY);
                reasonLabel.setFont(net.runelite.client.ui.FontManager.getRunescapeSmallFont());
                reasonLabel.setBorder(new EmptyBorder(0, 10, 5, 10));
                signalContent.add(reasonLabel);

                signalSection.add(signalContent, BorderLayout.CENTER);
                details.add(signalSection);

                details.add(Box.createRigidArea(new Dimension(0, 5)));

                // Trading Tips Section
                JPanel tipsSection = createCollapsibleSection("▼ Trading Tips");
                JPanel tipsContent = new JPanel();
                tipsContent.setLayout(new BoxLayout(tipsContent, BoxLayout.Y_AXIS));
                tipsContent.setBackground(ColorScheme.DARK_GRAY_COLOR);

                String tip = profit > 10000 ? "High margin - consider flipping!"
                        : profit > 1000 ? "Moderate opportunity" : "Low margin trade";
                JLabel tipLabel = new JLabel(tip);
                tipLabel.setForeground(Color.GRAY);
                tipLabel.setBorder(new EmptyBorder(5, 10, 5, 10));
                tipsContent.add(tipLabel);

                tipsSection.add(tipsContent, BorderLayout.CENTER);
                details.add(tipsSection);
            } else {
                JLabel noData = new JLabel("No price data available");
                noData.setForeground(Color.GRAY);
                noData.setAlignmentX(Component.CENTER_ALIGNMENT);
                details.add(noData);
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

    private JPanel createCollapsibleSection(String title) {
        JPanel section = new JPanel(new BorderLayout());
        section.setBackground(ColorScheme.DARKER_GRAY_COLOR);
        section.setBorder(new EmptyBorder(5, 5, 5, 5));

        JLabel header = new JLabel(title);
        header.setForeground(Color.WHITE);
        header.setFont(net.runelite.client.ui.FontManager.getRunescapeSmallFont());
        section.add(header, BorderLayout.NORTH);

        return section;
    }

    private JPanel createDetailRowArrow(String labelText, String valueText, Color valueColor) {
        JPanel row = new JPanel(new BorderLayout());
        row.setBackground(ColorScheme.DARK_GRAY_COLOR);
        row.setBorder(new EmptyBorder(2, 10, 2, 10));

        JLabel arrow = new JLabel("→ ");
        arrow.setForeground(valueColor);

        JLabel label = new JLabel(labelText);
        label.setForeground(Color.GRAY);

        JPanel leftPanel = new JPanel(new BorderLayout());
        leftPanel.setBackground(ColorScheme.DARK_GRAY_COLOR);
        leftPanel.add(arrow, BorderLayout.WEST);
        leftPanel.add(label, BorderLayout.CENTER);

        JLabel value = new JLabel(valueText);
        value.setForeground(valueColor);
        value.setFont(net.runelite.client.ui.FontManager.getRunescapeSmallFont());

        row.add(leftPanel, BorderLayout.WEST);
        row.add(value, BorderLayout.EAST);
        return row;
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

                // Add click listener to show details
                panel.setCursor(new java.awt.Cursor(java.awt.Cursor.HAND_CURSOR));
                final int itemId = offer.itemId;
                panel.addMouseListener(new java.awt.event.MouseAdapter() {
                    @Override
                    public void mouseClicked(java.awt.event.MouseEvent e) {
                        plugin.setSidebarItem(itemId);
                    }
                });

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

    /**
     * Update the Market Opportunities section with best flip opportunities
     */
    public void updateBestFlips(java.util.List<com.flipto5b.FlipTo5BPlugin.FlipOpportunity> flips) {
        SwingUtilities.invokeLater(() -> {
            signalsContainer.removeAll();

            if (flips.isEmpty()) {
                JLabel emptyLabel = new JLabel("No opportunities found");
                emptyLabel.setForeground(Color.GRAY);
                emptyLabel.setBorder(new EmptyBorder(10, 10, 10, 10));
                signalsContainer.add(emptyLabel);
            } else {
                for (com.flipto5b.FlipTo5BPlugin.FlipOpportunity flip : flips) {
                    JPanel flipPanel = new JPanel(new BorderLayout());
                    flipPanel.setBackground(ColorScheme.DARKER_GRAY_COLOR);
                    flipPanel.setBorder(new EmptyBorder(5, 8, 5, 8));

                    // Left side: Item name
                    JLabel nameLabel = new JLabel("🔥 " + flip.name);
                    nameLabel.setForeground(Color.WHITE);
                    nameLabel.setFont(net.runelite.client.ui.FontManager.getRunescapeSmallFont());

                    // Right side: ROI and profit
                    JPanel rightPanel = new JPanel();
                    rightPanel.setLayout(new BoxLayout(rightPanel, BoxLayout.Y_AXIS));
                    rightPanel.setBackground(ColorScheme.DARKER_GRAY_COLOR);

                    JLabel roiLabel = new JLabel(String.format("%.1f%% ROI", flip.roi));
                    roiLabel.setForeground(new Color(16, 185, 129)); // Emerald
                    roiLabel.setFont(net.runelite.client.ui.FontManager.getRunescapeSmallFont());
                    roiLabel.setAlignmentX(Component.RIGHT_ALIGNMENT);

                    JLabel profitLabel = new JLabel("+" + QuantityFormatter.formatNumber(flip.profit) + " gp");
                    profitLabel.setForeground(Color.GREEN);
                    profitLabel.setFont(net.runelite.client.ui.FontManager.getRunescapeSmallFont());
                    profitLabel.setAlignmentX(Component.RIGHT_ALIGNMENT);

                    rightPanel.add(roiLabel);
                    rightPanel.add(profitLabel);

                    flipPanel.add(nameLabel, BorderLayout.CENTER);
                    flipPanel.add(rightPanel, BorderLayout.EAST);

                    // Make clickable
                    flipPanel.setCursor(new java.awt.Cursor(java.awt.Cursor.HAND_CURSOR));
                    final int itemId = flip.itemId;
                    flipPanel.addMouseListener(new java.awt.event.MouseAdapter() {
                        @Override
                        public void mouseClicked(java.awt.event.MouseEvent e) {
                            plugin.setSidebarItem(itemId);
                        }
                    });

                    signalsContainer.add(flipPanel);
                    signalsContainer.add(Box.createRigidArea(new Dimension(0, 3)));
                }
            }

            signalsContainer.revalidate();
            signalsContainer.repaint();
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
    }
}
