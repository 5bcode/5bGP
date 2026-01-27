package com.flipto5b.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.GridLayout;
import java.awt.image.BufferedImage;
import javax.swing.ImageIcon;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.SwingConstants;
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
        setBorder(new EmptyBorder(2, 2, 2, 2));
        setBackground(ColorScheme.DARKER_GRAY_COLOR);

        container.setLayout(new BorderLayout(5, 0));
        container.setBackground(ColorScheme.DARKER_GRAY_COLOR);
        container.setBorder(new EmptyBorder(4, 4, 4, 4));

        JPanel infoPanel = new JPanel(new GridLayout(2, 1));
        infoPanel.setBackground(ColorScheme.DARKER_GRAY_COLOR);

        itemNameLabel.setForeground(Color.WHITE);
        itemNameLabel.setFont(net.runelite.client.ui.FontManager.getRunescapeSmallFont());

        JPanel detailsRow = new JPanel(new BorderLayout());
        detailsRow.setBackground(ColorScheme.DARKER_GRAY_COLOR);

        priceLabel.setForeground(ColorScheme.LIGHT_GRAY_COLOR);
        priceLabel.setFont(net.runelite.client.ui.FontManager.getRunescapeSmallFont());

        quantityLabel.setForeground(ColorScheme.LIGHT_GRAY_COLOR);
        quantityLabel.setFont(net.runelite.client.ui.FontManager.getRunescapeSmallFont());

        detailsRow.add(priceLabel, BorderLayout.WEST);
        detailsRow.add(quantityLabel, BorderLayout.EAST);

        infoPanel.add(itemNameLabel);
        infoPanel.add(detailsRow);

        statusLabel.setPreferredSize(new Dimension(80, 0));
        statusLabel.setHorizontalAlignment(SwingConstants.RIGHT);
        statusLabel.setFont(net.runelite.client.ui.FontManager.getRunescapeSmallFont());

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
