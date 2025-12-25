/**
 * Calculates the Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  if (data.length < period) return sma;

  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

/**
 * Calculates Standard Deviation for a dataset
 */
export function calculateStdDev(data: number[]): number {
  if (data.length === 0) return 0;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const squareDiffs = data.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Calculates Bollinger Bands (Upper, Middle, Lower)
 * Standard settings: 20-period SMA, 2 std dev
 */
export function calculateBollingerBands(data: number[], period: number = 20, multiplier: number = 2) {
  if (data.length < period) return null;
  
  // We only need the latest band for prediction usually, but let's calc for the window
  const slice = data.slice(-period);
  const sma = slice.reduce((a, b) => a + b, 0) / period;
  const stdDev = calculateStdDev(slice);

  return {
    upper: sma + (stdDev * multiplier),
    middle: sma,
    lower: sma - (stdDev * multiplier),
    bandwidth: (sma + (stdDev * multiplier) - (sma - (stdDev * multiplier))) / sma
  };
}

/**
 * Calculates Relative Strength Index (RSI)
 * Standard setting: 14 periods
 */
export function calculateRSI(data: number[], period: number = 14): number {
  if (data.length <= period) return 50; // Not enough data

  let gains = 0;
  let losses = 0;

  // Calculate initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Smooth averages for the rest of the data
  // RSI step: ((Previous Avg Gain * 13) + Current Gain) / 14
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    const currentGain = change > 0 ? change : 0;
    const currentLoss = change < 0 ? Math.abs(change) : 0;

    avgGain = ((avgGain * (period - 1)) + currentGain) / period;
    avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;
  }

  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}