package com.flipto5b.ui;

import java.awt.Color;
import java.awt.Dimension;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.util.ArrayList;
import java.util.List;
import javax.swing.JPanel;

public class SparklinePanel extends JPanel {
    private List<Integer> data = new ArrayList<>();
    private Color lineColor = new Color(34, 197, 94); // Modern Green

    public SparklinePanel() {
        setPreferredSize(new Dimension(160, 30));
        setOpaque(false);
    }

    public void updateData(List<Integer> newData) {
        this.data = newData;
        // Determine color based on trend
        if (!data.isEmpty() && data.size() >= 2) {
            if (data.get(data.size() - 1) < data.get(0)) {
                lineColor = new Color(239, 68, 68); // Red
            } else {
                lineColor = new Color(34, 197, 94); // Green
            }
        }
        repaint();
    }

    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);
        if (data == null || data.size() < 2) {
            return;
        }

        Graphics2D g2 = (Graphics2D) g;
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        int w = getWidth();
        int h = getHeight();

        int min = Integer.MAX_VALUE;
        int max = Integer.MIN_VALUE;
        for (int v : data) {
            if (v < min)
                min = v;
            if (v > max)
                max = v;
        }

        if (max == min) {
            g2.setColor(lineColor);
            g2.drawLine(0, h / 2, w, h / 2);
            return;
        }

        double xStep = (double) w / (data.size() - 1);
        double range = max - min;

        g2.setColor(lineColor);
        g2.setStroke(new java.awt.BasicStroke(1.5f));

        for (int i = 0; i < data.size() - 1; i++) {
            int x1 = (int) (i * xStep);
            int y1 = h - (int) ((data.get(i) - min) / range * h);
            int x2 = (int) ((i + 1) * xStep);
            int y2 = h - (int) ((data.get(i + 1) - min) / range * h);
            g2.drawLine(x1, y1, x2, y2);
        }
    }
}
