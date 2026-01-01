package com.flipto5b.ui;

import lombok.AllArgsConstructor;
import lombok.Getter;

import javax.swing.*;
import java.awt.*;
import java.awt.geom.Path2D;
import java.util.ArrayList;
import java.util.List;

/**
 * Custom paint layer for drawing price prediction bands on charts.
 *
 * <h2>Renders:</h2>
 * <ul>
 * <li>Filled "cloud" showing prediction uncertainty range</li>
 * <li>Upper bound line (green) - optimistic projection</li>
 * <li>Lower bound line (red) - pessimistic projection</li>
 * <li>Midline (dashed white) - expected value</li>
 * </ul>
 *
 * <h2>Usage:</h2>
 * 
 * <pre>
 * PredictionOverlay overlay = new PredictionOverlay();
 * overlay.setPredictions(points, priceMin, priceMax, timeMin, timeMax);
 * chartPanel.add(overlay);
 * </pre>
 *
 * @author FlipTo5B Team
 * @version 1.0
 */
public class PredictionOverlay extends JPanel {

    // =========================================================================
    // COLORS
    // =========================================================================

    /** Cloud fill: Blue @ 24% opacity */
    private static final Color BAND_COLOR = new Color(59, 130, 246, 60);

    /** Upper bound: Green @ 70% opacity */
    private static final Color UPPER_LINE = new Color(34, 197, 94, 180);

    /** Lower bound: Red @ 70% opacity */
    private static final Color LOWER_LINE = new Color(239, 68, 68, 180);

    /** Midline: White @ 47% opacity */
    private static final Color MID_LINE = new Color(255, 255, 255, 120);

    /** Highlight color for current price marker */
    private static final Color MARKER_COLOR = new Color(251, 191, 36, 200);

    // =========================================================================
    // DATA MODEL
    // =========================================================================

    /**
     * A single point in the prediction series.
     */
    @Getter
    @AllArgsConstructor
    public static class PredictionPoint {
        /** Unix timestamp for this point */
        private final long timestamp;

        /** Upper bound of prediction (optimistic) */
        private final double upperBound;

        /** Lower bound of prediction (pessimistic) */
        private final double lowerBound;

        /** Expected midline value */
        private final double midline;

        /** Optional: confidence at this point (0-1) */
        private final double confidence;

        /**
         * Convenience constructor without confidence.
         */
        public PredictionPoint(long timestamp, double upper, double lower, double mid) {
            this(timestamp, upper, lower, mid, 1.0);
        }
    }

    // =========================================================================
    // STATE
    // =========================================================================

    private List<PredictionPoint> predictions = new ArrayList<>();
    private double priceMin;
    private double priceMax;
    private long timeMin;
    private long timeMax;

    /** Optional: current price to draw marker */
    private Double currentPrice = null;

    /** Whether to show confidence shading */
    private boolean showConfidence = true;

    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================

    public PredictionOverlay() {
        setOpaque(false);
        setPreferredSize(new Dimension(300, 150));
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    /**
     * Sets prediction data and chart bounds for rendering.
     *
     * @param predictions List of prediction points
     * @param priceMin    Minimum Y-axis value
     * @param priceMax    Maximum Y-axis value
     * @param timeMin     Minimum X-axis value (timestamp)
     * @param timeMax     Maximum X-axis value (timestamp)
     */
    public void setPredictions(
            List<PredictionPoint> predictions,
            double priceMin,
            double priceMax,
            long timeMin,
            long timeMax) {
        this.predictions = predictions != null ? predictions : new ArrayList<>();
        this.priceMin = priceMin;
        this.priceMax = priceMax;
        this.timeMin = timeMin;
        this.timeMax = timeMax;
        repaint();
    }

    /**
     * Sets the current price marker.
     *
     * @param price The current price, or null to hide marker
     */
    public void setCurrentPrice(Double price) {
        this.currentPrice = price;
        repaint();
    }

    /**
     * Enables/disables confidence-based opacity shading.
     */
    public void setShowConfidence(boolean show) {
        this.showConfidence = show;
        repaint();
    }

    /**
     * Clears all prediction data.
     */
    public void clear() {
        this.predictions.clear();
        this.currentPrice = null;
        repaint();
    }

    // =========================================================================
    // PAINTING
    // =========================================================================

    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);

        if (predictions == null || predictions.isEmpty()) {
            return;
        }

        Graphics2D g2d = (Graphics2D) g.create();
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g2d.setRenderingHint(RenderingHints.KEY_STROKE_CONTROL, RenderingHints.VALUE_STROKE_PURE);

        int w = getWidth();
        int h = getHeight();

        // Build paths
        Path2D.Double upperPath = new Path2D.Double();
        Path2D.Double lowerPath = new Path2D.Double();
        Path2D.Double midPath = new Path2D.Double();
        Path2D.Double bandPath = new Path2D.Double();

        boolean first = true;
        for (PredictionPoint p : predictions) {
            double x = mapX(p.getTimestamp(), w);
            double yUpper = mapY(p.getUpperBound(), h);
            double yLower = mapY(p.getLowerBound(), h);
            double yMid = mapY(p.getMidline(), h);

            if (first) {
                upperPath.moveTo(x, yUpper);
                lowerPath.moveTo(x, yLower);
                midPath.moveTo(x, yMid);
                bandPath.moveTo(x, yUpper);
                first = false;
            } else {
                upperPath.lineTo(x, yUpper);
                lowerPath.lineTo(x, yLower);
                midPath.lineTo(x, yMid);
                bandPath.lineTo(x, yUpper);
            }
        }

        // Complete band polygon: upper line -> reverse lower line -> close
        for (int i = predictions.size() - 1; i >= 0; i--) {
            PredictionPoint p = predictions.get(i);
            double x = mapX(p.getTimestamp(), w);
            double yLower = mapY(p.getLowerBound(), h);
            bandPath.lineTo(x, yLower);
        }
        bandPath.closePath();

        // --- Draw band fill ---
        if (showConfidence && predictions.size() > 1) {
            // Gradient based on confidence
            drawConfidenceGradient(g2d, bandPath);
        } else {
            g2d.setColor(BAND_COLOR);
            g2d.fill(bandPath);
        }

        // --- Draw upper line ---
        g2d.setStroke(new BasicStroke(1.5f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
        g2d.setColor(UPPER_LINE);
        g2d.draw(upperPath);

        // --- Draw lower line ---
        g2d.setColor(LOWER_LINE);
        g2d.draw(lowerPath);

        // --- Draw midline (dashed) ---
        float[] dash = { 6.0f, 4.0f };
        g2d.setStroke(new BasicStroke(1.0f, BasicStroke.CAP_BUTT, BasicStroke.JOIN_MITER, 10.0f, dash, 0.0f));
        g2d.setColor(MID_LINE);
        g2d.draw(midPath);

        // --- Draw current price marker ---
        if (currentPrice != null) {
            drawCurrentPriceMarker(g2d, w, h);
        }

        g2d.dispose();
    }

    private void drawConfidenceGradient(Graphics2D g2d, Path2D.Double bandPath) {
        // Create gradient based on average confidence
        double avgConf = predictions.stream()
                .mapToDouble(PredictionPoint::getConfidence)
                .average()
                .orElse(1.0);

        int alpha = (int) (60 * avgConf); // 0-60 based on confidence
        g2d.setColor(new Color(59, 130, 246, alpha));
        g2d.fill(bandPath);
    }

    private void drawCurrentPriceMarker(Graphics2D g2d, int w, int h) {
        double y = mapY(currentPrice, h);

        // Horizontal dashed line
        g2d.setColor(MARKER_COLOR);
        float[] dash = { 4.0f, 2.0f };
        g2d.setStroke(new BasicStroke(1.0f, BasicStroke.CAP_BUTT, BasicStroke.JOIN_MITER, 10.0f, dash, 0.0f));
        g2d.drawLine(0, (int) y, w, (int) y);

        // Price label on right side
        String priceText = formatPrice(currentPrice);
        FontMetrics fm = g2d.getFontMetrics();
        int textWidth = fm.stringWidth(priceText);

        g2d.setColor(new Color(30, 30, 30, 200));
        g2d.fillRoundRect(w - textWidth - 10, (int) y - 8, textWidth + 8, 16, 4, 4);

        g2d.setColor(MARKER_COLOR);
        g2d.setFont(new Font("JetBrains Mono", Font.PLAIN, 10));
        g2d.drawString(priceText, w - textWidth - 6, (int) y + 4);
    }

    // =========================================================================
    // COORDINATE MAPPING
    // =========================================================================

    private double mapX(long time, int width) {
        if (timeMax == timeMin)
            return 0;
        return ((double) (time - timeMin) / (timeMax - timeMin)) * width;
    }

    private double mapY(double price, int height) {
        if (priceMax == priceMin)
            return height / 2.0;
        // Invert Y: higher price = lower Y coordinate
        return height - ((price - priceMin) / (priceMax - priceMin)) * height;
    }

    // =========================================================================
    // UTILITY
    // =========================================================================

    private String formatPrice(double price) {
        if (price >= 1_000_000) {
            return String.format("%.2fM", price / 1_000_000);
        } else if (price >= 1_000) {
            return String.format("%.1fK", price / 1_000);
        }
        return String.format("%.0f", price);
    }

    // =========================================================================
    // STATIC FACTORY
    // =========================================================================

    /**
     * Creates prediction points using WEMA (Weighted Exponential Moving Average).
     *
     * @param prices      Historical price data
     * @param period      WEMA period
     * @param futureSteps Number of future points to project
     * @return List of prediction points
     */
    public static List<PredictionPoint> generateWEMAPrediction(
            double[] prices,
            long[] timestamps,
            int period,
            int futureSteps) {
        if (prices.length < period) {
            return new ArrayList<>();
        }

        List<PredictionPoint> result = new ArrayList<>();

        // Calculate WEMA
        double k = 2.0 / (period + 1);
        double wema = prices[0];
        double variance = 0;

        for (int i = 1; i < prices.length; i++) {
            wema = prices[i] * k + wema * (1 - k);
            variance += Math.pow(prices[i] - wema, 2);
        }

        double stdDev = Math.sqrt(variance / prices.length);

        // Calculate trend slope using linear regression on last `period` points
        double slope = calculateSlope(prices, Math.min(period, prices.length));

        // Generate future points
        long lastTime = timestamps[timestamps.length - 1];
        long timeStep = timestamps.length > 1 ? timestamps[1] - timestamps[0] : 300000; // Default 5min

        for (int i = 1; i <= futureSteps; i++) {
            long futureTime = lastTime + (timeStep * i);

            // Project WEMA forward with slope
            double projectedMid = wema + (slope * i);

            // Widen bands as we project further (uncertainty grows)
            double uncertaintyFactor = 1.0 + (i * 0.1);
            double upper = projectedMid + (stdDev * uncertaintyFactor);
            double lower = projectedMid - (stdDev * uncertaintyFactor);

            // Confidence decreases with distance
            double confidence = Math.max(0.2, 1.0 - (i * 0.15));

            result.add(new PredictionPoint(futureTime, upper, lower, projectedMid, confidence));
        }

        return result;
    }

    private static double calculateSlope(double[] data, int period) {
        int n = Math.min(data.length, period);
        int start = data.length - n;

        double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (int i = 0; i < n; i++) {
            sumX += i;
            sumY += data[start + i];
            sumXY += i * data[start + i];
            sumX2 += i * i;
        }

        double denominator = n * sumX2 - sumX * sumX;
        if (Math.abs(denominator) < 0.0001)
            return 0;

        return (n * sumXY - sumX * sumY) / denominator;
    }
}
