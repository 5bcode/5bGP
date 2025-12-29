package com.flipto5b.ui;

import com.flipto5b.FlipTo5BPlugin;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import javax.inject.Inject;
import javax.swing.BoxLayout;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.SwingUtilities;
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
    private final JLabel sessionProfitLabel = new JLabel();

    private long sessionProfit = 0;

    @Inject
    public FlipTo5BPanel(FlipTo5BPlugin plugin, ItemManager itemManager) {
        super();
        this.plugin = plugin;
        this.itemManager = itemManager;

        setBorder(new EmptyBorder(10, 10, 10, 10));
        setBackground(ColorScheme.DARK_GRAY_COLOR);
        setLayout(new BorderLayout());

        JPanel layoutPanel = new JPanel();
        layoutPanel.setLayout(new BoxLayout(layoutPanel, BoxLayout.Y_AXIS));
        layoutPanel.setBackground(ColorScheme.DARK_GRAY_COLOR);
        add(layoutPanel, BorderLayout.NORTH);

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
        layoutPanel.add(profitPanel);

        // Active Offers Section
        layoutPanel.add(createHeader("Active Offers"));
        activeOffersContainer.setLayout(new BoxLayout(activeOffersContainer, BoxLayout.Y_AXIS));
        activeOffersContainer.setBackground(ColorScheme.DARK_GRAY_COLOR);
        layoutPanel.add(activeOffersContainer);

        // Spacer
        layoutPanel.add(new JPanel() {
            {
                setPreferredSize(new Dimension(0, 10));
                setBackground(ColorScheme.DARK_GRAY_COLOR);
            }
        });

        // Recent History Section
        layoutPanel.add(createHeader("Recent History"));
        historyContainer.setLayout(new BoxLayout(historyContainer, BoxLayout.Y_AXIS));
        historyContainer.setBackground(ColorScheme.DARK_GRAY_COLOR);
        layoutPanel.add(historyContainer);
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

    public void clearActiveOffers() {
        SwingUtilities.invokeLater(() -> {
            activeOffersContainer.removeAll();
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
}
