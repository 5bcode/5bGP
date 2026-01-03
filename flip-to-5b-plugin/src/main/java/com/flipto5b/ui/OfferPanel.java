package com.flipto5b.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.GridLayout;
import java.awt.image.BufferedImage;
import javax.swing.ImageIcon;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.border.EmptyBorder;
import net.runelite.client.ui.ColorScheme;
import net.runelite.client.util.AsyncBufferedImage;
import net.runelite.client.util.QuantityFormatter;

public class OfferPanel extends JPanel {
    private final JPanel container = new JPanel();
    private final JLabel itemNameLabel = new JLabel();
    private final JLabel priceLabel = new JLabel();
    private final JLabel quantityLabel = new JLabel();
    private final JLabel statusLabel = new JLabel();

    public OfferPanel() {
        setLayout(new BorderLayout());
        setBorder(new EmptyBorder(5, 5, 5, 5));
        setBackground(ColorScheme.DARKER_GRAY_COLOR);

        container.setLayout(new BorderLayout());
        container.setBackground(ColorScheme.DARKER_GRAY_COLOR);

        JPanel infoPanel = new JPanel(new GridLayout(3, 1));
        infoPanel.setBackground(ColorScheme.DARKER_GRAY_COLOR);
        infoPanel.setBorder(new EmptyBorder(0, 5, 0, 0));

        itemNameLabel.setForeground(Color.WHITE);
        priceLabel.setForeground(ColorScheme.LIGHT_GRAY_COLOR);
        quantityLabel.setForeground(ColorScheme.LIGHT_GRAY_COLOR);

        infoPanel.add(itemNameLabel);
        infoPanel.add(priceLabel);
        infoPanel.add(quantityLabel);

        container.add(infoPanel, BorderLayout.CENTER);
        container.add(statusLabel, BorderLayout.EAST);

        add(container, BorderLayout.NORTH);
    }

    public void update(String itemName, int price, int quantity, String status, Color statusColor,
            AsyncBufferedImage itemImage) {
        itemNameLabel.setText(itemName);
        priceLabel.setText(QuantityFormatter.formatNumber(price) + " gp");
        quantityLabel.setText("Qty: " + QuantityFormatter.formatNumber(quantity));

        statusLabel.setText(status);
        statusLabel.setForeground(statusColor);

        if (itemImage != null) {
            JLabel iconLabel = new JLabel();
            itemImage.addTo(iconLabel); // Helper triggers repaint on label when loaded
            // iconLabel.setIcon(new ImageIcon(itemImage)); // addTo does this internally
            // usually or similar
            container.add(iconLabel, BorderLayout.WEST);

            // Re-layout
            container.revalidate();
            container.repaint();
        }
    }

    // Simpler update for when we just have text/icon
    public void setItem(String name, int qty, int price, BufferedImage image) {
        itemNameLabel.setText(name);
        quantityLabel.setText("Qty: " + qty);
        priceLabel.setText(QuantityFormatter.formatNumber(price) + " gp");

        if (image != null) {
            JLabel iconLabel = new JLabel(new ImageIcon(image));
            container.add(iconLabel, BorderLayout.WEST);
        }
    }
}
