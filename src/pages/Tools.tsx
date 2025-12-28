import React from 'react';
import AverageDownCalc from '@/components/tools/AverageDownCalc';
import CutLossCalc from '@/components/tools/CutLossCalc';
import { Calculator } from 'lucide-react';

const Tools = () => {
  return (
    <div className="max-w-4xl mx-auto">
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
                <Calculator className="text-blue-500" /> Risk Management Tools
            </h1>
            <p className="text-slate-500 mt-2">
                Calculators to help you manage bad trades and plan recoveries.
            </p>
        </div>

        <div className="grid grid-cols-1 gap-8">
            <AverageDownCalc />
            <CutLossCalc />
        </div>
    </div>
  );
};

export default Tools;