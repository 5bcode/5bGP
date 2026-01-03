"use client";

import React from 'react';
import AverageDownCalc from '@/components/tools/AverageDownCalc';
import { usePriceMonitorContext } from '@/context/usePriceMonitor';
import CutLossCalc from '@/components/tools/CutLossCalc';
import ApiKeyManager from '@/components/ApiKeyManager';
import { Calculator, Settings, Activity, ShieldCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Tools = () => {
    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-slate-100 tracking-tight flex items-center gap-3">
                    <Settings className="text-blue-500" size={32} /> Trader Toolkit
                </h1>
                <p className="text-slate-500">
                    Configuration settings and risk management utilities for elite flippers.
                </p>
            </div>

            <Tabs defaultValue="keys" className="w-full">
                <TabsList className="bg-slate-900/50 border border-slate-800 mb-8 p-1">
                    <TabsTrigger value="keys" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all">
                        <ShieldCheck size={16} className="mr-2" /> API Keys
                    </TabsTrigger>
                    <TabsTrigger value="calcs" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                        <Calculator size={16} className="mr-2" /> Financial Tools
                    </TabsTrigger>
                    <TabsTrigger value="debug" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-all">
                        <Activity size={16} className="mr-2" /> Diagnostics
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="keys" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <ApiKeyManager />
                </TabsContent>

                <TabsContent value="calcs" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <AverageDownCalc />
                    <CutLossCalc />
                </TabsContent>

                <TabsContent value="debug" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <SystemHealth />
                </TabsContent>
            </Tabs>
        </div>
    );
};

const SystemHealth = () => {
    const { testSystem } = usePriceMonitorContext();
    return (
        <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-slate-800/60 bg-slate-950/20 backdrop-blur-sm">
                <h3 className="text-lg font-bold text-slate-100">System Diagnostics</h3>
            </div>
            <div className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <button
                        onClick={testSystem}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-purple-900/20"
                    >
                        Test Price Alert
                    </button>
                    <div className="text-xs text-slate-500 max-w-md leading-relaxed">
                        Trigger a simulated **"Panic Wick"** alert. This verifies your notification settings, browser permissions, and audio drivers are functioning correctly.
                    </div>
                </div>
                
                <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                     <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-center">
                        <p className="text-[10px] text-slate-600 uppercase font-bold">API Connection</p>
                        <p className="text-emerald-400 font-bold text-sm">ONLINE</p>
                     </div>
                     <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-center">
                        <p className="text-[10px] text-slate-600 uppercase font-bold">Latency</p>
                        <p className="text-slate-300 font-mono text-sm">~42ms</p>
                     </div>
                     <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-center">
                        <p className="text-[10px] text-slate-600 uppercase font-bold">Wiki Cache</p>
                        <p className="text-emerald-400 font-bold text-sm">ACTIVE</p>
                     </div>
                     <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-center">
                        <p className="text-[10px] text-slate-600 uppercase font-bold">Engine</p>
                        <p className="text-blue-400 font-bold text-sm">READY</p>
                     </div>
                </div>
            </div>
        </div>
    )
}

export default Tools;