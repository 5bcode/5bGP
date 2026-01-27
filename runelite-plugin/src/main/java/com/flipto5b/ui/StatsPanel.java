package com.flipto5b.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import javax.swing.Box;
import javax.swing.BoxLayout;
import javax.swing.JLabel;
import javax.swing.JPanel;

import javax.swing.border.EmptyBorder;
import net.runelite.client.ui.ColorScheme;
import net.runelite.client.ui.FontManager;

public class StatsPanel extends JPanel {

    private final JLabel profitLabel = new JLabel();

    public StatsPanel() {
        setLayout(new BorderLayout());
        setBackground(ColorScheme.DARK_GRAY_COLOR);
        setBorder(new EmptyBorder(10, 10, 10, 10));

        JPanel content = new JPanel();
        content.setLayout(new BoxLayout(content, BoxLayout.Y_AXIS));
        content.setBackground(ColorScheme.DARK_GRAY_COLOR);

        JLabel title = new JLabel("Session Statistics");
        title.setForeground(Color.WHITE);
        title.setFont(FontManager.getRunescapeBoldFont());
        title.setAlignmentX(CENTER_ALIGNMENT);
        content.add(title);

        content.add(Box.createRigidArea(new Dimension(0, 20)));

        JLabel subtitle = new JLabel("Total Profit:");
        subtitle.setForeground(Color.GRAY);
        subtitle.setAlignmentX(CENTER_ALIGNMENT);
        content.add(subtitle);

        profitLabel.setText("0 gp");
        profitLabel.setForeground(Color.GREEN);
        profitLabel.setFont(FontManager.getRunescapeBoldFont());
        profitLabel.setAlignmentX(CENTER_ALIGNMENT);
        content.add(profitLabel);

        add(content, BorderLayout.NORTH);

        // Placeholder for History List
        JPanel historyPlaceholder = new JPanel();
        historyPlaceholder.setBackground(ColorScheme.DARKER_GRAY_COLOR);
        historyPlaceholder.add(new JLabel("History data coming soon..."));

        add(historyPlaceholder, BorderLayout.CENTER);
    }

    public void updateProfit(String profitText, Color color) {
        profitLabel.setText(profitText);
        profitLabel.setForeground(color);
    }
}
