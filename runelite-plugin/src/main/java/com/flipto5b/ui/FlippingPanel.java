package com.flipto5b.ui;

import com.flipto5b.FlipTo5BPlugin;
import com.flipto5b.model.MarketSignal;
import java.awt.BorderLayout;
import java.awt.Dimension;
import javax.swing.Box;
import javax.swing.BoxLayout;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.border.EmptyBorder;
import net.runelite.client.game.ItemManager;
import net.runelite.client.ui.ColorScheme;
import net.runelite.client.ui.components.IconTextField;

public class FlippingPanel extends JPanel {

    private final FlipTo5BPlugin plugin;
    private final ItemManager itemManager;

    private final JPanel cardsContainer = new JPanel();
    private final IconTextField searchBar = new IconTextField();
    private java.util.List<MarketSignal> lastSignals = new java.util.ArrayList<>();

    public FlippingPanel(FlipTo5BPlugin plugin, ItemManager itemManager) {
        this.plugin = plugin;
        this.itemManager = itemManager;

        setLayout(new BorderLayout());
        setBackground(ColorScheme.DARK_GRAY_COLOR);

        // Search Bar
        JPanel searchPanel = new JPanel(new BorderLayout());
        searchPanel.setBackground(ColorScheme.DARK_GRAY_COLOR);
        searchPanel.setBorder(new EmptyBorder(10, 10, 10, 10));

        searchBar.setIcon(IconTextField.Icon.SEARCH);
        searchBar.setPreferredSize(new Dimension(100, 30));
        searchBar.setBackground(ColorScheme.DARKER_GRAY_COLOR);
        searchBar.setHoverBackgroundColor(ColorScheme.DARK_GRAY_HOVER_COLOR);
        searchBar.addActionListener(e -> {
            String query = searchBar.getText();
            if (query != null && !query.isEmpty()) {
                plugin.getExecutor().submit(() -> {
                    var results = itemManager.search(query);
                    if (!results.isEmpty()) {
                        int itemId = results.get(0).getId();
                        plugin.getClientThread().invokeLater(() -> addItemCard(itemId));
                    }
                });
            }
        });

        searchPanel.add(searchBar, BorderLayout.CENTER);
        add(searchPanel, BorderLayout.NORTH);

        // Cards Container
        cardsContainer.setLayout(new BoxLayout(cardsContainer, BoxLayout.Y_AXIS));
        cardsContainer.setBackground(ColorScheme.DARK_GRAY_COLOR);

        // Add some default items (favorites) or empty state
        // For now, let's add an empty state or sample if favorites exist

        JScrollPane scrollPane = new JScrollPane(cardsContainer);
        scrollPane.setBackground(ColorScheme.DARK_GRAY_COLOR);
        scrollPane.setBorder(null);

        add(scrollPane, BorderLayout.CENTER);

        rebuild();
    }

    public void rebuild() {
        javax.swing.SwingUtilities.invokeLater(() -> {
            cardsContainer.removeAll();
            cardsContainer.revalidate();
            cardsContainer.repaint();
        });

        if (plugin.getClientThread() != null) {
            plugin.getClientThread().invokeLater(() -> {
                addItemCard(12934); // Zulrah Scales
                addItemCard(383); // Shark
            });
        }
    }

    public void addItemCard(int itemId) {
        String rawName = itemManager.getItemComposition(itemId).getName();
        final String name = rawName != null ? rawName : "Item " + itemId;
        final net.runelite.client.util.AsyncBufferedImage icon = itemManager.getImage(itemId);

        javax.swing.SwingUtilities.invokeLater(() -> {
            ItemCardPanel card = new ItemCardPanel(plugin, itemId, name, icon);
            // Add to top
            cardsContainer.add(card, 0);
            cardsContainer.add(Box.createRigidArea(new Dimension(0, 5)), 0);

            cardsContainer.revalidate();
            cardsContainer.repaint();
        });
    }

    public void updateBestFlips(java.util.List<FlipTo5BPlugin.FlipOpportunity> flips) {
        // Only update if search bar is empty (user is not searching)
        if (!searchBar.getText().trim().isEmpty()) {
            return;
        }

        javax.swing.SwingUtilities.invokeLater(() -> {
            cardsContainer.removeAll();
            for (FlipTo5BPlugin.FlipOpportunity flip : flips) {
                addItemCard(flip.itemId);
            }
            cardsContainer.revalidate();
            cardsContainer.repaint();
        });
    }

    public void updateQuickPicks(java.util.List<MarketSignal> signals) {
        // Only update if search bar is empty
        if (!searchBar.getText().trim().isEmpty()) {
            return;
        }

        if (signals.equals(lastSignals)) {
            return;
        }
        lastSignals = new java.util.ArrayList<>(signals);

        javax.swing.SwingUtilities.invokeLater(() -> {
            cardsContainer.removeAll();
            for (MarketSignal signal : signals) {
                addSignalCard(signal);
            }
            cardsContainer.revalidate();
            cardsContainer.repaint();
        });
    }

    private void addSignalCard(MarketSignal signal) {
        final net.runelite.client.util.AsyncBufferedImage icon = itemManager.getImage(signal.getItemId());

        // SignalPanel handles the layout for the signal
        SignalPanel card = new SignalPanel(signal, icon);

        cardsContainer.add(card);
        cardsContainer.add(Box.createRigidArea(new Dimension(0, 5)));
    }
}
