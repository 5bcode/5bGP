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
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emaArray: number[] = [];
  
  if (data.length < period) return emaArray;

  // Start with SMA
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  emaArray.push(ema);

  for (let i = period; i < data.length; i++) {
    ema = (data[i] * k) + (ema * (1 - k));
    emaArray.push(ema);
  }
  return emaArray;
}

/**
 * Calculates MACD (Moving Average Convergence Divergence)
 * Standard: 12 EMA, 26 EMA, 9 Signal
 */
export function calculateMACD(data: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (data.length < slowPeriod) return null;

  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  // Fast EMA array will be longer than Slow EMA array because it starts calculating earlier.
  // We need to align them. The Slow EMA starts at index `slowPeriod - 1` relative to data.
  // The Fast EMA starts at index `fastPeriod - 1`.
  
  // MACD Line: (12-day EMA - 26-day EMA)
  const macdLine: number[] = [];
  
  // Align logic:
  // Data Index: 0 1 ... 11 (Fast Start) ... 25 (Slow Start)
  // We can only calculate MACD starting from where Slow EMA exists.
  
  // Offset for fast array to match slow array start
  const offset = slowPeriod - fastPeriod; 
  
  for (let i = 0; i < slowEMA.length; i++) {
      // The i-th element of slowEMA corresponds to data index (slowPeriod - 1 + i)
      // The corresponding fastEMA element is at (offset + i)
      const val = fastEMA[i + offset] - slowEMA[i];
      macdLine.push(val);
  }

  // Signal Line: 9-day EMA of MACD Line
  const signalLine = calculateEMA(macdLine, signalPeriod);
  
  // Histogram: MACD Line - Signal Line
  // We align again. Signal line starts later.
  const histogram: number[] = [];
  const signalOffset = signalPeriod - 1;

  for (let i = 0; i < signalLine.length; i++) {
      const macdVal = macdLine[i + signalOffset];
      histogram.push(macdVal - signalLine[i]);
  }
  
  // Return the latest values
  return {
      macd: macdLine[macdLine.length - 1],
      signal: signalLine[signalLine.length - 1],
      histogram: histogram[histogram.length - 1]
  };
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

  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

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