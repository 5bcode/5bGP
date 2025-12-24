import React from 'react';
import { Item, PriceData, Stats24h } from '@/services/osrs-api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, DollarSign } from 'lucide-react';
import { formatGP } from '@/lib/osrs-math';

interface VolumeAnalysisProps {
  item: Item;
  price: PriceData;
  stat?: Stats24h;
  volume: number;
  buyPressure: number;
  net: number;
}

export const VolumeAnalysis = ({ item, price, stat, volume, buyPressure, net }: VolumeAnalysisProps) => {
  return (
    <div className="space-y-6">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
            <BarChart3 className="text-blue-500" size={16} /> Volume & Demand
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stat ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Daily Turnover</span>
                  <span className="text-slate-200 font-mono">{formatGP(volume)}</span>
                </div>

                {/* Buy vs Sell Pressure Bar */}
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Sell Pressure</span>
                    <span>Buy Pressure</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className="bg-blue-500 transition-all duration-500"
                      style={{ width: `${100 - buyPressure}%` }}
                    ></div>
                    <div
                      className="bg-emerald-500 transition-all duration-500"
                      style={{ width: `${buyPressure}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {item.limit && (
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Limit Saturation</span>
                    <span className="text-slate-200 font-mono">
                      {((volume / item.limit) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {volume > item.limit ? "High liquidity item." : "Low liquidity, easy to hit limit."}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500 italic">No volume data available.</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
            <DollarSign className="text-amber-500" size={16} /> Capital Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">For 1 Limit</span>
            <span className="text-slate-200 font-mono">
              {item.limit ? formatGP(item.limit * price.low) : '--'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Max Potential Profit</span>
            <span className="text-emerald-400 font-mono font-bold">
              {item.limit ? formatGP(item.limit * net) : '--'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};