package com.flipto5b.ui;

import com.flipto5b.model.MarketSignal;
import net.runelite.client.ui.ColorScheme;
import net.runelite.client.ui.FontManager;
import net.runelite.client.util.AsyncBufferedImage;
import net.runelite.client.util.QuantityFormatter;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;

/**
 * A card UI component representing a single market signal.
 */
public class SignalPanel extends JPanel {

    private final JLabel iconLabel = new JLabel();
    private final JLabel nameLabel = new JLabel();
    private final JLabel scoreLabel = new JLabel();
    private final JLabel actionLabel = new JLabel();
    private final JLabel pricesLabel = new JLabel();
    private final JLabel profitLabel = new JLabel();

    public SignalPanel(MarketSignal signal, AsyncBufferedImage icon) {
        setLayout(new BorderLayout());
        setBackground(ColorScheme.DARKER_GRAY_COLOR);
        setBorder(new EmptyBorder(3, 3, 3, 3));

        // Top Row: Icon + Name + Score
        JPanel topRow = new JPanel(new BorderLayout(5, 0));
        topRow.setOpaque(false);

        if (icon != null) {
            iconLabel.setIcon(new ImageIcon(icon));
        }
        nameLabel.setText(signal.getItemName());
        nameLabel.setForeground(Color.WHITE);
        nameLabel.setFont(FontManager.getRunescapeSmallFont());

        scoreLabel.setText("Sc: " + (int) signal.getOpportunityScore());
        scoreLabel.setForeground(getScoreColor(signal.getOpportunityScore()));
        scoreLabel.setFont(FontManager.getRunescapeSmallFont());

        JPanel namePanel = new JPanel(new BorderLayout());
        namePanel.setOpaque(false);
        namePanel.add(nameLabel, BorderLayout.CENTER);
        namePanel.add(scoreLabel, BorderLayout.EAST);

        topRow.add(iconLabel, BorderLayout.WEST);
        topRow.add(namePanel, BorderLayout.CENTER);

        add(topRow, BorderLayout.NORTH);

        // Middle Row: Price | Profit
        JPanel midRow = new JPanel(new BorderLayout());
        midRow.setOpaque(false);
        midRow.setBorder(new EmptyBorder(3, 0, 3, 0));

        String ageText = formatAge(signal.getTimestamp());
        String prices = "Buy: " + QuantityFormatter.formatNumber(signal.getTargetBuyPrice()) +
                " | Sell: " + QuantityFormatter.formatNumber(signal.getTargetSellPrice()) +
                " [" + ageText + "]";
        pricesLabel.setText(prices);
        pricesLabel.setForeground(Color.LIGHT_GRAY);
        pricesLabel.setFont(FontManager.getRunescapeSmallFont());

        String profit = QuantityFormatter.formatNumber((long) signal.getMarginAfterTax()) + " gp";
        profitLabel.setText(profit);
        profitLabel.setForeground(signal.getMarginAfterTax() > 0 ? Color.GREEN : Color.RED);
        profitLabel.setFont(FontManager.getRunescapeSmallFont());

        midRow.add(pricesLabel, BorderLayout.WEST);
        midRow.add(profitLabel, BorderLayout.EAST);
        add(midRow, BorderLayout.CENTER);

        // Bottom Row: Action
        actionLabel.setText(signal.getAction().toString());
        actionLabel.setForeground(getColorForAction(signal.getAction()));
        actionLabel.setFont(FontManager.getRunescapeBoldFont());
        actionLabel.setHorizontalAlignment(SwingConstants.CENTER);

        add(actionLabel, BorderLayout.SOUTH);

        // Tooltip
        setToolTipText("Confidence: " + (int) signal.getConfidence() + "% | ROI: "
                + String.format("%.2f", signal.getRoiPercent()) + "%");
    }

    private Color getScoreColor(double score) {
        if (score >= 80)
            return Color.GREEN;
        if (score >= 50)
            return Color.YELLOW;
        return Color.RED;
    }

    private Color getColorForAction(MarketSignal.SignalAction action) {
        switch (action) {
            case BUY:
                return Color.GREEN;
            case SELL:
                return Color.RED;
            case ACCUMULATE:
                return Color.CYAN;
            case WAIT:
                return Color.ORANGE;
            default:
                return Color.GRAY;
        }
    }

    private String formatAge(long timestamp) {
        if (timestamp <= 0)
            return "N/A";
        long diff = (System.currentTimeMillis() - timestamp) / 1000;
        if (diff < 0)
            diff = 0;
        long h = diff / 3600;
        long m = (diff % 3600) / 60;
        long s = diff % 60;
        return String.format("%02d:%02d:%02d", h, m, s);
    }
}
