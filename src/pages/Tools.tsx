import React from 'react';
import AverageDownCalc from '@/components/tools/AverageDownCalc';
import CutLossCalc from '@/components/tools/CutLossCalc';
import ApiKeyManager from '@/components/ApiKeyManager';
import { Calculator, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Tools = () => {
  return (
    <div className="max-w-4xl mx-auto">
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
                <Settings className="text-blue-500" /> Trader Toolkit
            </h1>
            <p className="text-slate-500 mt-2">
                Utilities for risk management and plugin configuration.
            </p>
        </div>

        <Tabs defaultValue="keys" className="w-full">
            <TabsList className="bg-slate-900 border border-slate-800 mb-6">
                <TabsTrigger value="keys" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">API Keys</TabsTrigger>
                <TabsTrigger value="calcs" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Calculators</TabsTrigger>
            </TabsList>

            <TabsContent value="keys">
                <ApiKeyManager />
            </TabsContent>

            <TabsContent value="calcs" className="space-y-8">
                <AverageDownCalc />
                <CutLossCalc />
            </TabsContent>
        </Tabs>
    </div>
  );
};

export default Tools;