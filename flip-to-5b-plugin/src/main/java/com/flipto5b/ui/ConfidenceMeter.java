package com.flipto5b.ui;

import javax.swing.*;
import java.awt.*;

/**
 * A visual confidence meter with dynamic label and color-coded progress bar.
 *
 * <h2>Features:</h2>
 * <ul>
 * <li>0-100% progress bar with gradient colors</li>
 * <li>Dynamic action text (Strong Buy, Moderate Hold, etc.)</li>
 * <li>Sentiment hints (Oversold, Overbought)</li>
 * </ul>
 *
 * @author FlipTo5B Team
 * @version 1.0
 */
public class ConfidenceMeter extends JPanel {

    // =========================================================================
    // COLORS
    // =========================================================================

    private static final Color BG_COLOR = new Color(30, 30, 30);
    private static final Color BAR_BG = new Color(50, 50, 50);

    private static final Color GREEN_500 = new Color(34, 197, 94);
    private static final Color YELLOW_500 = new Color(234, 179, 8);
    private static final Color ORANGE_500 = new Color(249, 115, 22);
    private static final Color RED_500 = new Color(239, 68, 68);
    private static final Color GRAY_500 = new Color(107, 114, 128);
    private static final Color BLUE_500 = new Color(59, 130, 246);

    // =========================================================================
    // STATE
    // =========================================================================

    private int confidence = 0;
    private String action = "HOLD";
    private String sentiment = "";

    // =========================================================================
    // COMPONENTS
    // =========================================================================

    private final JLabel actionLabel;
    private final JProgressBar progressBar;
    private final JLabel percentLabel;
    private final JLabel sentimentLabel;

    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================

    public ConfidenceMeter() {
        setLayout(new BorderLayout(5, 3));
        setBackground(BG_COLOR);
        setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(new Color(60, 60, 60), 1),
                BorderFactory.createEmptyBorder(8, 10, 8, 10)));

        // --- TOP: Action Label ---
        actionLabel = new JLabel("Analyzing...");
        actionLabel.setForeground(GRAY_500);
        actionLabel.setFont(new Font("Inter", Font.BOLD, 13));
        actionLabel.setHorizontalAlignment(SwingConstants.CENTER);

        // --- MIDDLE: Progress Bar with Percent ---
        JPanel barPanel = new JPanel(new BorderLayout(8, 0));
        barPanel.setOpaque(false);

        progressBar = new JProgressBar(0, 100) {
            @Override
            protected void paintComponent(Graphics g) {
                Graphics2D g2 = (Graphics2D) g.create();
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

                // Background
                g2.setColor(BAR_BG);
                g2.fillRoundRect(0, 0, getWidth(), getHeight(), 8, 8);

                // Foreground (progress)
                if (getValue() > 0) {
                    int fillWidth = (int) ((getWidth() - 4) * (getValue() / 100.0));
                    g2.setColor(getForeground());
                    g2.fillRoundRect(2, 2, fillWidth, getHeight() - 4, 6, 6);
                }

                g2.dispose();
            }
        };
        progressBar.setValue(0);
        progressBar.setStringPainted(false);
        progressBar.setPreferredSize(new Dimension(160, 18));
        progressBar.setOpaque(false);
        progressBar.setBorderPainted(false);
        progressBar.setForeground(GRAY_500);

        percentLabel = new JLabel("0%");
        percentLabel.setForeground(GRAY_500);
        percentLabel.setFont(new Font("JetBrains Mono", Font.BOLD, 12));
        percentLabel.setPreferredSize(new Dimension(40, 18));
        percentLabel.setHorizontalAlignment(SwingConstants.RIGHT);

        barPanel.add(progressBar, BorderLayout.CENTER);
        barPanel.add(percentLabel, BorderLayout.EAST);

        // --- BOTTOM: Sentiment Label ---
        sentimentLabel = new JLabel(" ");
        sentimentLabel.setForeground(GRAY_500);
        sentimentLabel.setFont(new Font("Inter", Font.ITALIC, 11));
        sentimentLabel.setHorizontalAlignment(SwingConstants.CENTER);

        // --- LAYOUT ---
        add(actionLabel, BorderLayout.NORTH);
        add(barPanel, BorderLayout.CENTER);
        add(sentimentLabel, BorderLayout.SOUTH);
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    /**
     * Updates the meter with new confidence and action values.
     *
     * @param confidence 0-100 confidence score
     * @param action     The trading action (BUY, SELL, HOLD, WAIT, ACCUMULATE)
     */
    public void update(int confidence, String action) {
        update(confidence, action, null);
    }

    /**
     * Updates the meter with confidence, action, and optional sentiment hint.
     *
     * @param confidence 0-100 confidence score
     * @param action     The trading action
     * @param sentiment  Optional sentiment (e.g., "Oversold", "Overbought")
     */
    public void update(int confidence, String action, String sentiment) {
        this.confidence = Math.max(0, Math.min(100, confidence));
        this.action = action != null ? action : "HOLD";
        this.sentiment = sentiment != null ? sentiment : "";

        // Determine color and display text
        Color color = determineColor(this.confidence, this.action);
        String displayText = formatActionText(this.confidence, this.action);

        // Update on EDT
        SwingUtilities.invokeLater(() -> {
            progressBar.setValue(this.confidence);
            progressBar.setForeground(color);

            actionLabel.setText(displayText);
            actionLabel.setForeground(color);

            percentLabel.setText(this.confidence + "%");
            percentLabel.setForeground(color);

            if (!this.sentiment.isEmpty()) {
                sentimentLabel.setText(this.sentiment);
                sentimentLabel.setForeground(blendColor(color, Color.WHITE, 0.3f));
            } else {
                sentimentLabel.setText(" ");
            }

            repaint();
        });
    }

    /**
     * Sets the meter to loading state.
     */
    public void setLoading() {
        SwingUtilities.invokeLater(() -> {
            actionLabel.setText("Analyzing...");
            actionLabel.setForeground(GRAY_500);
            progressBar.setValue(0);
            progressBar.setForeground(GRAY_500);
            percentLabel.setText("--");
            percentLabel.setForeground(GRAY_500);
            sentimentLabel.setText(" ");
        });
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private Color determineColor(int conf, String act) {
        // Action-based color selection
        switch (act.toUpperCase()) {
            case "BUY":
            case "ACCUMULATE":
                if (conf >= 80)
                    return GREEN_500;
                if (conf >= 60)
                    return BLUE_500;
                return YELLOW_500;

            case "SELL":
                if (conf >= 80)
                    return RED_500;
                if (conf >= 60)
                    return ORANGE_500;
                return YELLOW_500;

            case "WAIT":
                return ORANGE_500;

            case "HOLD":
            default:
                return GRAY_500;
        }
    }

    private String formatActionText(int conf, String act) {
        String strength;
        if (conf >= 80)
            strength = "Strong";
        else if (conf >= 60)
            strength = "Moderate";
        else if (conf >= 40)
            strength = "Weak";
        else
            strength = "Low";

        // Format action nicely
        String formatted;
        switch (act.toUpperCase()) {
            case "BUY":
                formatted = "Buy";
                break;
            case "SELL":
                formatted = "Sell";
                break;
            case "HOLD":
                formatted = "Hold";
                break;
            case "WAIT":
                formatted = "Wait";
                break;
            case "ACCUMULATE":
                formatted = "Accumulate";
                break;
            default:
                formatted = act;
        }

        return strength + " " + formatted;
    }

    private Color blendColor(Color c1, Color c2, float ratio) {
        float ir = 1.0f - ratio;
        return new Color(
                (int) (c1.getRed() * ir + c2.getRed() * ratio),
                (int) (c1.getGreen() * ir + c2.getGreen() * ratio),
                (int) (c1.getBlue() * ir + c2.getBlue() * ratio));
    }

    // =========================================================================
    // GETTERS
    // =========================================================================

    public int getConfidence() {
        return confidence;
    }

    public String getAction() {
        return action;
    }
}
