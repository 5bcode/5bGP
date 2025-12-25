import React, { useMemo } from 'react';
import { Item, PriceData, Stats24h } from '@/services/osrs-api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, CheckCircle2, XCircle, AlertTriangle, TrendingUp, Anchor } from 'lucide-react';
import { formatGP } from '@/lib/osrs-math';

interface SmartAnalysisProps {
  item: Item;
  price: PriceData;
  stats?: Stats24h;
  roi: number;
  volatility: number;
}

export const SmartAnalysis = ({ item, price, stats, roi, volatility }: SmartAnalysisProps) => {
  const analysis = useMemo(() => {
    const factors = [];
    let score = 50; // Base score
    let riskLevel = "Moderate";
    let strategy = "Standard Undercut";

    if (!stats) return null;

    const dailyVolume = stats.highPriceVolume + stats.lowPriceVolume;
    const avgPrice = (stats.avgHighPrice + stats.avgLowPrice) / 2;
    
    // 1. ROI Analysis
    if (roi > 5) {
        score += 20;
        factors.push({ type: 'good', text: `Excellent ROI of ${roi.toFixed(2)}%` });
    } else if (roi > 2) {
        score += 10;
        factors.push({ type: 'good', text: `Solid ROI of ${roi.toFixed(2)}%` });
    } else if (roi < 0.5) {
        score -= 20;
        factors.push({ type: 'bad', text: "Margins are extremely thin (< 0.5%)" });
    }

    // 2. Volume / Liquidity Analysis
    if (dailyVolume > 1_000_000) {
        score += 10;
        factors.push({ type: 'good', text: "Ultra High Liquidity - Instant Fills" });
    } else if (dailyVolume < 100) {
        score -= 15;
        factors.push({ type: 'bad', text: "Very Low Volume - Risk of getting stuck" });
        strategy = "Patient limit orders only";
    } else if (dailyVolume < 1000) {
        score -= 5;
        factors.push({ type: 'neutral', text: "Low Volume - Expect slow fills" });
    }

    // 3. Price vs Daily Average (Buying Opportunity?)
    // Are we buying below the daily average?
    if (price.low < stats.avgLowPrice) {
        const discount = ((stats.avgLowPrice - price.low) / stats.avgLowPrice) * 100;
        if (discount > 5) {
             score += 15;
             factors.push({ type: 'good', text: `Buying ${discount.toFixed(1)}% below daily average` });
             strategy = "Buy & Hold for recovery";
        } else {
             score += 5;
             factors.push({ type: 'good', text: "Price is slightly below daily average" });
        }
    } else {
        score -= 10;
        factors.push({ type: 'bad', text: "Current buy price is above daily average" });
    }

    // 4. Volatility / Risk
    if (volatility > 100) {
        riskLevel = "Extreme";
        score -= 10; // Penalize for safety, but could be good for risky flips
        factors.push({ type: 'warning', text: "Extreme Volatility - Price moves violently" });
        strategy = "Scalp quickly, do not hold";
    } else if (volatility > 40) {
        riskLevel = "High";
        factors.push({ type: 'neutral', text: "High Volatility - Good profit potential" });
    } else if (volatility < 5) {
        riskLevel = "Low";
        factors.push({ type: 'neutral', text: "Very Stable - Low risk, low reward" });
    }

    // 5. High Ticket Penalty/Bonus
    if (price.low > 100_000_000) {
        // High ticket items need higher margins to justify tax risk
        if (roi < 1) {
            score -= 10;
            factors.push({ type: 'warning', text: "High capital tie-up for low ROI" });
        }
    }

    // Clamp Score
    score = Math.max(0, Math.min(100, score));

    // Determine Verdict
    let verdict = "Hold";
    let verdictColor = "text-slate-400";
    if (score >= 80) { verdict = "Strong Buy"; verdictColor = "text-emerald-400"; }
    else if (score >= 60) { verdict = "Buy"; verdictColor = "text-emerald-500/80"; }
    else if (score >= 40) { verdict = "Neutral"; verdictColor = "text-amber-500"; }
    else { verdict = "Avoid"; verdictColor = "text-rose-500"; }

    return { score, factors, riskLevel, strategy, verdict, verdictColor };
  }, [item, price, stats, roi, volatility]);

  if (!analysis) return null;

  return (
    <Card className="bg-slate-900 border-slate-800 mb-6 overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-blue-500"></div>
      <CardHeader className="pb-2 border-b border-slate-800/50">
        <div className="flex justify-between items-center">
             <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Brain size={16} className="text-purple-400" /> Smart Trade Analysis
            </CardTitle>
            <Badge variant="outline" className={`${analysis.verdictColor} border-slate-700 bg-slate-950`}>
                {analysis.verdict}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* SCORE SECTION */}
        <div className="flex flex-col items-center justify-center p-4 bg-slate-950/50 rounded-lg border border-slate-800 text-center">
            <div className="relative flex items-center justify-center w-24 h-24 mb-2">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="50%" cy="50%" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                    <circle 
                        cx="50%" cy="50%" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                        className={analysis.score > 70 ? "text-emerald-500" : analysis.score > 40 ? "text-amber-500" : "text-rose-500"}
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * analysis.score) / 100}
                        strokeLinecap="round"
                    />
                </svg>
                <span className="absolute text-2xl font-bold text-slate-200">{Math.round(analysis.score)}</span>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Confidence Score</p>
        </div>

        {/* FACTORS LIST */}
        <div className="md:col-span-2 space-y-3">
            <div className="grid grid-cols-2 gap-4 mb-2">
                 <div className="bg-slate-950/30 p-2 rounded border border-slate-800/50">
                    <p className="text-[10px] text-slate-500 uppercase">Suggested Strategy</p>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                        <Anchor size={14} className="text-blue-400" /> {analysis.strategy}
                    </div>
                 </div>
                 <div className="bg-slate-950/30 p-2 rounded border border-slate-800/50">
                    <p className="text-[10px] text-slate-500 uppercase">Risk Level</p>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                        <AlertTriangle size={14} className={analysis.riskLevel === 'Extreme' || analysis.riskLevel === 'High' ? "text-rose-500" : "text-emerald-500"} /> 
                        {analysis.riskLevel}
                    </div>
                 </div>
            </div>

            <div className="space-y-1">
                {analysis.factors.map((factor, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                        {factor.type === 'good' && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                        {factor.type === 'bad' && <XCircle size={14} className="text-rose-500 shrink-0" />}
                        {factor.type === 'warning' && <AlertTriangle size={14} className="text-amber-500 shrink-0" />}
                        {factor.type === 'neutral' && <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-600 shrink-0" />}
                        <span className="text-slate-300">{factor.text}</span>
                    </div>
                ))}
            </div>
        </div>
      </CardContent>
    </Card>
  );
};