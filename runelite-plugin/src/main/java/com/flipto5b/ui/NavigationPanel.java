package com.flipto5b.ui;

import java.awt.Color;
import java.awt.Dimension;
import java.awt.GridLayout;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.SwingConstants;

import net.runelite.client.ui.ColorScheme;
import net.runelite.client.ui.FontManager;

public class NavigationPanel extends JPanel {

    private final FlipTo5BPanel parent;
    private final JLabel slotsBtn;
    private final JLabel flippingBtn;
    private final JLabel statsBtn;

    public NavigationPanel(FlipTo5BPanel parent) {
        this.parent = parent;
        setLayout(new GridLayout(1, 3));
        setBackground(ColorScheme.DARK_GRAY_COLOR);
        setPreferredSize(new Dimension(0, 40));

        slotsBtn = createNavButton("Slots", FlipTo5BPanel.VIEW_SLOTS);
        flippingBtn = createNavButton("Flipping", FlipTo5BPanel.VIEW_FLIPPING);
        statsBtn = createNavButton("Stats", FlipTo5BPanel.VIEW_STATS);

        add(slotsBtn);
        add(flippingBtn);
        add(statsBtn);

        // Default selection
        selectButton(slotsBtn);
    }

    private JLabel createNavButton(String text, String viewName) {
        JLabel btn = new JLabel(text);
        btn.setForeground(Color.GRAY);
        btn.setFont(FontManager.getRunescapeBoldFont());
        btn.setHorizontalAlignment(SwingConstants.CENTER);
        btn.setCursor(new java.awt.Cursor(java.awt.Cursor.HAND_CURSOR));

        btn.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent e) {
                parent.showView(viewName);
                selectButton(btn);
            }

            @Override
            public void mouseEntered(MouseEvent e) {
                if (btn.getForeground() != Color.ORANGE) // if not selected
                    btn.setForeground(Color.WHITE);
            }

            @Override
            public void mouseExited(MouseEvent e) {
                if (btn.getForeground() != Color.ORANGE)
                    btn.setForeground(Color.GRAY);
            }
        });

        return btn;
    }

    private void selectButton(JLabel selected) {
        slotsBtn.setForeground(Color.GRAY);
        flippingBtn.setForeground(Color.GRAY);
        statsBtn.setForeground(Color.GRAY);

        // Add "active" indicator (underline or color)
        selected.setForeground(Color.ORANGE);
    }
}
