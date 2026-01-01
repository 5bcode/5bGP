export const TAX_RATE = 0.02; // 2% tax as of May 2025 update

export function calculateTax(sellPrice: number): number {
  // Items sold for below 50 coins have no tax obligation (2% of 49 is 0.98, floor is 0)
  if (sellPrice < 50) return 0;

  const tax = Math.floor(sellPrice * TAX_RATE);
  // Cap at 5 million coins
  return tax > 5_000_000 ? 5_000_000 : tax;
}

export function calculateVolatility(high: number, low: number): number {
  if (low <= 0) return 0;
  const spreadRatio = (high - low) / low;
  // Scaled 0-100: 1% spread = 10, 10% = 100
  return Math.min(100, spreadRatio * 1000);
}

export function formatGP(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 10_000) return `${(amount / 1_000).toFixed(1)}k`;
  return new Intl.NumberFormat('en-US').format(amount);
}

export function calculateMargin(buy: number, sell: number) {
  const tax = calculateTax(sell);
  const net = sell - buy - tax;
  const roi = buy > 0 ? (net / buy) * 100 : 0;
  return { tax, net, roi };
}

/**
 * Calculates a 'Dump Score' indicating how severe a price drop is.
 * Based on deviation from 24h average.
 */
export function calculateDumpScore(currentLow: number, avgLow24h: number): number {
  if (!avgLow24h || avgLow24h === 0) return 0;
  const drop = (avgLow24h - currentLow) / avgLow24h;
  // Score is basically percentage drop * 100. e.g. 50% drop = 50.
  return drop > 0 ? drop * 100 : 0;
}

/**
 * Calculates an 'Opportunity Score' for finding good flips.
 * Factors: ROI, Absolute Profit, Volume, and Risk (Volatility).
 * 
 * We want: High ROI, High Profit, High Volume, Moderate Volatility.
 */
export function calculateOpportunityScore(
  netProfit: number,
  roi: number,
  volume24h: number,
  volatility: number
): number {
  if (netProfit <= 0 || volume24h < 10) return 0;

  // Log scale volume to prevent cheap high-vol items from dominating
  const volScore = Math.log10(volume24h);

  // ROI score (capped at reasonable amount to filter outliers)
  const roiScore = Math.min(roi, 50);

  // Risk penalty: if volatility is too extreme (>50), penalize
  const riskPenalty = volatility > 50 ? (volatility - 50) * 2 : 0;

  return (netProfit * 0.0001) + (roiScore * 10) + (volScore * 5) - riskPenalty;
}

// --- TECHNICAL ANALYSIS HELPERS ---

export function calculateSMA(data: number[], period: number): number[] {
  if (data.length < period) return [];
  const sma = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

export function calculateEMA(data: number[], period: number): number[] {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  const ema = [data[0]]; // Start with first point to approximate
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  // Trim to match data length minus initial warmup if needed, 
  // but for simplicity we return aligned with data indices roughly
  return ema;
}

export function calculateRSI(data: number[], period: number = 14): number[] {
  if (data.length < period + 1) return [];

  const changes = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i] - data[i - 1]);
  }

  const rsi = [];
  let avgGain = 0;
  let avgLoss = 0;

  // First period
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }

  avgGain /= period;
  avgLoss /= period;

  const firstRS = avgGain / (avgLoss || 1); // Avoid div by zero
  rsi.push(100 - (100 / (1 + firstRS)));

  // Subsequent periods (Smoothed)
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;

    const rs = avgGain / (avgLoss || 0.00001);
    rsi.push(100 - (100 / (1 + rs)));
  }

  return rsi;
}