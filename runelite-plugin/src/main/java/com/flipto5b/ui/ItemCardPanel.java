package com.flipto5b.ui;

import com.flipto5b.FlipTo5BPlugin;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import javax.swing.BorderFactory;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.SwingConstants;
import javax.swing.border.EmptyBorder;
import net.runelite.client.ui.ColorScheme;
import net.runelite.client.ui.FontManager;
import net.runelite.client.util.AsyncBufferedImage;
import net.runelite.client.util.QuantityFormatter;

public class ItemCardPanel extends JPanel {

    private final FlipTo5BPlugin plugin;
    private final int itemId;

    private boolean expanded = false;
    private final JPanel detailsPanel = new JPanel();
    private final JLabel expandIcon = new JLabel("▶"); // or ▼
    private final SparklinePanel sparkline = new SparklinePanel();

    public ItemCardPanel(FlipTo5BPlugin plugin, int itemId, String itemName, AsyncBufferedImage icon) {
        this.plugin = plugin;
        this.itemId = itemId;

        setLayout(new BorderLayout());
        setBackground(ColorScheme.DARKER_GRAY_COLOR);
        setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createMatteBorder(0, 0, 1, 0, ColorScheme.DARK_GRAY_COLOR),
                new EmptyBorder(8, 8, 8, 8)));

        JPanel topRow = new JPanel(new BorderLayout(10, 0));
        topRow.setBackground(ColorScheme.DARKER_GRAY_COLOR);

        // Icon
        JLabel iconLabel = new JLabel();
        if (icon != null) {
            icon.addTo(iconLabel);
        }
        topRow.add(iconLabel, BorderLayout.WEST);

        // Name & Star
        JPanel namePanel = new JPanel(new BorderLayout());
        namePanel.setBackground(ColorScheme.DARKER_GRAY_COLOR);

        JLabel nameLbl = new JLabel(itemName);
        nameLbl.setForeground(Color.WHITE);
        nameLbl.setFont(FontManager.getRunescapeBoldFont());

        JLabel starLabel = new JLabel(plugin.isFavorite(itemId) ? "★" : "☆");
        starLabel.setForeground(Color.YELLOW);
        starLabel.setCursor(new java.awt.Cursor(java.awt.Cursor.HAND_CURSOR));
        starLabel.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent e) {
                plugin.toggleFavorite(itemId);
                starLabel.setText(plugin.isFavorite(itemId) ? "★" : "☆");
            }
        });

        namePanel.add(nameLbl, BorderLayout.CENTER);
        namePanel.add(starLabel, BorderLayout.EAST);

        // Wrapper for name to holding "customize look" subtitle if needed
        JPanel centerWrapper = new JPanel(new BorderLayout());
        centerWrapper.setBackground(ColorScheme.DARKER_GRAY_COLOR);
        centerWrapper.add(namePanel, BorderLayout.NORTH);

        JLabel subTitle = new JLabel("customize look");
        subTitle.setFont(FontManager.getRunescapeSmallFont());
        subTitle.setForeground(Color.GRAY);
        centerWrapper.add(subTitle, BorderLayout.SOUTH);

        topRow.add(centerWrapper, BorderLayout.CENTER);

        // Expand Button
        expandIcon.setForeground(Color.GRAY);
        expandIcon.setCursor(new java.awt.Cursor(java.awt.Cursor.HAND_CURSOR));
        expandIcon.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent e) {
                toggleExpand();
            }
        });
        topRow.add(expandIcon, BorderLayout.EAST);

        add(topRow, BorderLayout.NORTH);

        // Details Panel (Hidden by default or shown?)
        // The reference shows prices immediately visible.
        // Let's mimic the reference: Prices are visible, "Other" is collapsible?
        // Actually reference shows "Wiki insta buy: ... " lines.

        detailsPanel.setLayout(new GridBagLayout());
        detailsPanel.setBackground(ColorScheme.DARKER_GRAY_COLOR);
        detailsPanel.setBorder(new EmptyBorder(10, 0, 0, 0));

        // Load Price Data
        updatePriceData();

        add(detailsPanel, BorderLayout.CENTER);
    }

    private void updatePriceData() {
        detailsPanel.removeAll();
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.fill = GridBagConstraints.HORIZONTAL;
        gbc.weightx = 1;
        gbc.gridx = 0;
        gbc.gridy = 0;
        gbc.insets = new java.awt.Insets(2, 0, 2, 0);

        FlipTo5BPlugin.WikiPrice price = plugin.getWikiPrice(itemId);
        if (price != null) {
            addPriceRow(detailsPanel, gbc, "Wiki Insta Buy:", price.high);
            addInfoRow(detailsPanel, gbc, "Wiki Buy Age:", formatAge(price.highTime), new Color(16, 185, 129));

            addPriceRow(detailsPanel, gbc, "Wiki Insta Sell:", price.low);
            addInfoRow(detailsPanel, gbc, "Wiki Sell Age:", formatAge(price.lowTime), new Color(16, 185, 129));

            gbc.insets = new java.awt.Insets(8, 0, 2, 0);

            addPriceRow(detailsPanel, gbc, "Target Buy:", price.low + 1); // Simple undercut logic
            addPriceRow(detailsPanel, gbc, "Target Sell:", price.high - 1);

            // Separator or spacing
            gbc.insets = new java.awt.Insets(8, 0, 2, 0);

            // Validating margins
            int margin = price.high - price.low;
            int tax = (int) Math.floor(price.high * 0.01);
            if (tax > 5000000)
                tax = 5000000;
            int profit = margin - tax;

            addInfoRow(detailsPanel, gbc, "Potential Profit:", QuantityFormatter.formatNumber(profit) + " gp",
                    profit > 0 ? Color.GREEN : Color.RED);

            // GE Limit Info
            com.flipto5b.model.GELimitTracker tracker = plugin.getLimitTracker(itemId);
            if (tracker != null) {
                // Determine max limit (hardcoded or from wiki data if available in future)
                // For now, we only know what we bought. If we had a static map of limits we
                // could show x/Limit.
                // Assuming we just show "Bought recently" for now, or if we had limit data.
                // NOTE: We don't have max limits in WikiPrice yet.
                // Let's just show "Bought 4h: X"
                int bought = tracker.getBoughtInLast4Hours();
                long resetTime = tracker.getNextResetTime();
                String resetStr = "";
                if (resetTime > 0) {
                    long diff = resetTime - System.currentTimeMillis();
                    if (diff > 0) {
                        long mins = java.util.concurrent.TimeUnit.MILLISECONDS.toMinutes(diff);
                        resetStr = " (Reset: " + mins + "m)";
                    }
                }

                addInfoRow(detailsPanel, gbc, "GE Limit (4h):", bought + " bought" + resetStr, Color.ORANGE);
            }

            // Trend & Sparkline
            gbc.insets = new java.awt.Insets(10, 0, 5, 0);
            JLabel trendValLabel = addInfoRowWithRef(detailsPanel, gbc, "Trend (6h):", "fetching...", Color.GRAY);

            gbc.insets = new java.awt.Insets(0, 0, 0, 0);
            detailsPanel.add(sparkline, gbc);
            gbc.gridy++;

            fetchTrends(trendValLabel);

        } else {
            JLabel loading = new JLabel("Loading prices...");
            loading.setForeground(Color.GRAY);
            loading.setFont(FontManager.getRunescapeSmallFont());
            detailsPanel.add(loading, gbc);
        }

        detailsPanel.revalidate();
        detailsPanel.repaint();
    }

    private void fetchTrends(JLabel trendLabel) {
        plugin.fetch6hTimeseries(itemId, new okhttp3.Callback() {
            @Override
            public void onFailure(okhttp3.Call call, java.io.IOException e) {
            }

            @Override
            public void onResponse(okhttp3.Call call, okhttp3.Response response) throws java.io.IOException {
                if (!response.isSuccessful()) {
                    response.close();
                    return;
                }
                okhttp3.ResponseBody responseBody = response.body();
                if (responseBody == null) {
                    response.close();
                    return;
                }
                String body = responseBody.string();
                com.google.gson.JsonObject json = new com.google.gson.Gson().fromJson(body,
                        com.google.gson.JsonObject.class);
                com.google.gson.JsonArray data = json.getAsJsonArray("data");
                if (data == null || data.size() < 2)
                    return;

                java.util.List<Integer> prices = new java.util.ArrayList<>();
                for (com.google.gson.JsonElement el : data) {
                    com.google.gson.JsonObject obj = el.getAsJsonObject();
                    int p = 0;
                    if (!obj.get("avgHighPrice").isJsonNull()) {
                        p = obj.get("avgHighPrice").getAsInt();
                    } else if (!obj.get("avgLowPrice").isJsonNull()) {
                        p = obj.get("avgLowPrice").getAsInt();
                    }
                    if (p > 0)
                        prices.add(p);
                }

                if (prices.size() < 2)
                    return;

                int first = prices.get(0);
                int last = prices.get(prices.size() - 1);
                double change = ((double) (last - first) / first) * 100;
                String trendText = String.format("%s%.2f%%", (change >= 0 ? "+" : ""), change);
                Color trendColor = change >= 0 ? new Color(34, 197, 94) : new Color(239, 68, 68);

                javax.swing.SwingUtilities.invokeLater(() -> {
                    sparkline.updateData(prices);
                    trendLabel.setText(trendText);
                    trendLabel.setForeground(trendColor);
                });
            }
        });
    }

    private JLabel addInfoRowWithRef(JPanel panel, GridBagConstraints gbc, String label, String value,
            Color valueColor) {
        JPanel row = new JPanel(new BorderLayout());
        row.setBackground(ColorScheme.DARKER_GRAY_COLOR);

        JLabel l = new JLabel(label);
        l.setForeground(Color.LIGHT_GRAY);
        l.setFont(FontManager.getRunescapeSmallFont());

        JLabel v = new JLabel(value);
        v.setForeground(valueColor);
        v.setFont(FontManager.getRunescapeSmallFont());
        v.setHorizontalAlignment(SwingConstants.RIGHT);

        row.add(l, BorderLayout.WEST);
        row.add(v, BorderLayout.EAST);

        panel.add(row, gbc);
        gbc.gridy++;
        return v;
    }

    private void addPriceRow(JPanel panel, GridBagConstraints gbc, String label, int price) {
        JPanel row = new JPanel(new BorderLayout());
        row.setBackground(ColorScheme.DARKER_GRAY_COLOR);

        JLabel l = new JLabel(label);
        l.setForeground(new Color(16, 185, 129)); // Greenish
        l.setFont(FontManager.getRunescapeSmallFont());

        JLabel v = new JLabel(QuantityFormatter.formatNumber(price) + " gp");
        v.setForeground(Color.WHITE);
        v.setFont(FontManager.getRunescapeSmallFont());
        v.setHorizontalAlignment(SwingConstants.RIGHT);

        row.add(l, BorderLayout.WEST);
        row.add(v, BorderLayout.EAST);

        panel.add(row, gbc);
        gbc.gridy++;
    }

    private void addInfoRow(JPanel panel, GridBagConstraints gbc, String label, String value, Color valueColor) {
        JPanel row = new JPanel(new BorderLayout());
        row.setBackground(ColorScheme.DARKER_GRAY_COLOR);

        JLabel l = new JLabel(label);
        l.setForeground(Color.LIGHT_GRAY);
        l.setFont(FontManager.getRunescapeSmallFont());

        JLabel v = new JLabel(value);
        v.setForeground(valueColor);
        v.setFont(FontManager.getRunescapeSmallFont());
        v.setHorizontalAlignment(SwingConstants.RIGHT);

        row.add(l, BorderLayout.WEST);
        row.add(v, BorderLayout.EAST);

        panel.add(row, gbc);
        gbc.gridy++;
    }

    private String formatAge(int timestamp) {
        if (timestamp <= 0)
            return "N/A";
        long diff = (System.currentTimeMillis() / 1000) - timestamp;
        if (diff < 0)
            diff = 0;
        long hours = diff / 3600;
        long minutes = (diff % 3600) / 60;
        long seconds = diff % 60;
        return String.format("%02d:%02d:%02d", hours, minutes, seconds);
    }

    private void toggleExpand() {
        expanded = !expanded;
        expandIcon.setText(expanded ? "▼" : "▶");
        // logic to show more details would go here if we hid them
    }
}
