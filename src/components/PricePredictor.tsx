import React, { useMemo } from 'react';
import { useTimeseries } from '@/hooks/use-osrs-query';
import { calculateRSI, calculateBollingerBands } from '@/lib/technical-analysis';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatGP } from '@/lib/osrs-math';
import { TrendingUp, TrendingDown, Minus, Activity, Gauge } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Loader2 } from 'lucide-react';

interface PricePredictorProps {
  itemId: number;
}

const PricePredictor = ({ itemId }: PricePredictorProps) => {
  // We use 5m data for short-term flipping predictions
  const { data: timeseries, isLoading } = useTimeseries(itemId, '5m');

  const analysis = useMemo(() => {
    if (!timeseries || timeseries.length < 30) return null;

    // Extract valid closing prices
    const prices = timeseries
        .map(t => t.avgHighPrice || t.avgLowPrice || 0)
        .filter(p => p > 0);

    if (prices.length < 20) return null;

    const currentPrice = prices[prices.length - 1];
    
    // 1. Calculate RSI (14) series
    const rsiSeries = calculateRSI(prices, 14);
    const rsi = rsiSeries[rsiSeries.length - 1];

    // 2. Calculate Bollinger Bands (20, 2) series
    const bbSeries = calculateBollingerBands(prices, 20, 2);

    if (!bbSeries) return null;

    const upper = bbSeries.upper[bbSeries.upper.length - 1];
    const lower = bbSeries.lower[bbSeries.lower.length - 1];
    const middle = bbSeries.middle[bbSeries.middle.length - 1];
    const bandwidth = (upper - lower) / middle;

    // 3. Logic Engine
    let signal = "Neutral";
    let signalStrength = 0; // 0 to 100
    let sentiment = "Hold";
    let color = "text-slate-400";
    let icon = <Minus />;
    let description = "Market is in equilibrium.";

    // RSI Logic
    const isOversold = rsi < 30;
    const isOverbought = rsi > 70;
    
    // %B calculation: Where is price relative to bands? 0 = Lower, 1 = Upper
    const percentB = (currentPrice - lower) / (upper - lower);

    if (isOversold && percentB < 0.1) {
        signal = "Strong Buy";
        signalStrength = 90;
        sentiment = "Rebound Likely";
        color = "text-emerald-400";
        icon = <TrendingUp />;
        description = "Price is statistically oversold and hitting lower volatility band. Mean reversion expected.";
    } else if (isOverbought && percentB > 0.9) {
        signal = "Strong Sell";
        signalStrength = 90;
        sentiment = "Correction Likely";
        color = "text-rose-500";
        icon = <TrendingDown />;
        description = "Price is statistically overbought and hitting upper volatility band. Pullback expected.";
    } else if (rsi < 40 && percentB < 0.3) {
        signal = "Buy";
        signalStrength = 65;
        sentiment = "Bullish Divergence";
        color = "text-emerald-500/80";
        icon = <TrendingUp />;
        description = "Momentum is building upwards from lows.";
    } else if (rsi > 60 && percentB > 0.7) {
        signal = "Sell";
        signalStrength = 65;
        sentiment = "Bearish Divergence";
        color = "text-rose-400";
        icon = <TrendingDown />;
        description = "Momentum is fading at highs.";
    } else if (bandwidth < 0.05) {
        // Squeeze
        signal = "Watch";
        signalStrength = 50;
        sentiment = "Volatility Squeeze";
        color = "text-amber-500";
        icon = <Activity />;
        description = "Volatility is unusually low. Prepare for a massive breakout move soon.";
    }

    return {
        rsi,
        upper,
        lower,
        currentPrice,
        signal,
        signalStrength,
        sentiment,
        color,
        icon,
        description,
        percentB
    };
  }, [timeseries]);

  if (isLoading) return (
      <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6 flex justify-center">
              <Loader2 className="animate-spin text-slate-500" />
          </CardContent>
      </Card>
  );

  if (!analysis) return null;

  const { rsi, upper, lower, signal, sentiment, color, icon, description, percentB } = analysis;

  return (
    <Card className="bg-slate-900 border-slate-800 mb-6">
      <CardHeader className="pb-2 border-b border-slate-800/50">
        <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Gauge size={16} className="text-cyan-400" /> Algorithmic Forecast (Technical)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-6 items-center">
            
            {/* Main Signal */}
            <div className="flex-1 text-center md:text-left">
                <div className={`text-2xl font-bold flex items-center justify-center md:justify-start gap-2 ${color}`}>
                    {icon} {sentiment}
                </div>
                <p className="text-sm text-slate-500 mt-1">{description}</p>
                
                <div className="flex gap-4 mt-4 justify-center md:justify-start">
                    <div className="bg-slate-950 p-2 rounded border border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase">RSI (14)</div>
                        <div className={`font-mono font-bold ${rsi < 30 || rsi > 70 ? color : 'text-slate-300'}`}>
                            {rsi.toFixed(1)}
                        </div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800">
                         <div className="text-[10px] text-slate-500 uppercase">Est. Support</div>
                         <div className="font-mono font-bold text-emerald-400/70">
                            {formatGP(lower)}
                        </div>
                    </div>
                     <div className="bg-slate-950 p-2 rounded border border-slate-800">
                         <div className="text-[10px] text-slate-500 uppercase">Est. Resist</div>
                         <div className="font-mono font-bold text-rose-400/70">
                            {formatGP(upper)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Visual Gauge */}
            <div className="w-full md:w-1/3 space-y-4">
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>Oversold</span>
                        <span>Neutral</span>
                        <span>Overbought</span>
                    </div>
                    <Progress value={rsi} max={100} className="h-2 bg-slate-950 [&>div]:bg-cyan-500" />
                    <div className="flex justify-center">
                        <span className="text-[10px] text-slate-500">Momentum (RSI)</span>
                    </div>
                </div>

                <div className="space-y-1">
                     <div className="flex justify-between text-xs text-slate-400">
                        <span>Low Band</span>
                        <span>Mid</span>
                        <span>High Band</span>
                    </div>
                    <Progress value={percentB * 100} max={100} className="h-2 bg-slate-950 [&>div]:bg-purple-500" />
                     <div className="flex justify-center">
                        <span className="text-[10px] text-slate-500">Price Position (BB)</span>
                    </div>
                </div>
            </div>

        </div>
      </CardContent>
    </Card>
  );
};

export default PricePredictor;