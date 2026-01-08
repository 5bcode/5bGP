/**
 * Calculates the Simple Moving Average (SMA) series
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
 * Calculates Exponential Moving Average (EMA) series
 */
export function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emaArray: number[] = [];
  
  if (data.length === 0) return emaArray;

  // Start with first value as initial EMA
  let ema = data[0];
  emaArray.push(ema);

  for (let i = 1; i < data.length; i++) {
    ema = (data[i] * k) + (ema * (1 - k));
    emaArray.push(ema);
  }
  return emaArray;
}

/**
 * Calculates MACD series
 */
export function calculateMACD(data: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (data.length < slowPeriod) return null;

  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  const macdLine: number[] = [];
  // EMA arrays are same length as input data
  for (let i = 0; i < data.length; i++) {
      macdLine.push(fastEMA[i] - slowEMA[i]);
  }

  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram = macdLine.map((val, i) => val - signalLine[i]);
  
  return { macd: macdLine, signal: signalLine, histogram };
}

/**
 * Calculates Standard Deviation for a window
 */
export function calculateStdDev(data: number[]): number {
  if (data.length === 0) return 0;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const squareDiffs = data.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Calculates Bollinger Bands series
 */
export function calculateBollingerBands(data: number[], period: number = 20, multiplier: number = 2) {
  if (data.length < period) return null;
  
  const upper: number[] = [];
  const middle: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(data[i]);
      middle.push(data[i]);
      lower.push(data[i]);
      continue;
    }

    const slice = data.slice(i - period + 1, i + 1);
    const sma = slice.reduce((a, b) => a + b, 0) / period;
    const stdDev = calculateStdDev(slice);

    upper.push(sma + (stdDev * multiplier));
    middle.push(sma);
    lower.push(sma - (stdDev * multiplier));
  }

  return { upper, middle, lower };
}

/**
 * Calculates Relative Strength Index (RSI) series
 */
export function calculateRSI(data: number[], period: number = 14): number[] {
  if (data.length <= period) return new Array(data.length).fill(50);

  const rsi: number[] = new Array(period).fill(50);
  let gains = 0;
  let losses = 0;

  // First RSI value
  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi.push(100 - (100 / (1 + (avgGain / (avgLoss || 1)))));

  // Smoothed RSI for rest
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    const currentGain = change > 0 ? change : 0;
    const currentLoss = change < 0 ? Math.abs(change) : 0;

    avgGain = ((avgGain * (period - 1)) + currentGain) / period;
    avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;

    const rs = avgGain / (avgLoss || 1);
    rsi.push(100 - (100 / (1 + rs)));
  }

  return rsi;
}