import React, { useState, useMemo } from 'react';
import { Modal } from './ui/Modal';
import { useAlertStore } from '../store/alertStore';
import { useMarketData } from '../hooks/useMarketData';
import type { AlertThresholds } from '../types';
import { Search, Bell, TrendingUp, Volume2, Percent, Star, AlertTriangle, Check } from 'lucide-react';
import { formatNumber } from '../utils/formatters';

interface CreateAlertRuleModalProps {
    isOpen: boolean;
    onClose: () => void;
    preselectedItemId?: number;
}

export function CreateAlertRuleModal({ isOpen, onClose, preselectedItemId }: CreateAlertRuleModalProps) {
    const { items } = useMarketData();
    const { createRule, settings } = useAlertStore();

    // Form state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItemId, setSelectedItemId] = useState<number | null>(preselectedItemId ?? null);
    const [ruleName, setRuleName] = useState('');
    const [thresholds, setThresholds] = useState<AlertThresholds>({
        priceChangePercent: settings.defaultThresholds.priceChangePercent,
        volumeSpikeMultiplier: settings.defaultThresholds.volumeSpikeMultiplier,
        marginIncreasePercent: settings.defaultThresholds.marginIncreasePercent,
        newFlipperScoreMin: settings.defaultThresholds.newFlipperScoreMin
    });
    const [step, setStep] = useState<'select-item' | 'configure'>('select-item');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter items based on search
    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return items.slice(0, 20);
        const query = searchQuery.toLowerCase().trim();
        return items.filter(item =>
            item.name.toLowerCase().includes(query)
        ).slice(0, 20);
    }, [items, searchQuery]);

    // Get selected item details
    const selectedItem = useMemo(() => {
        if (!selectedItemId) return null;
        return items.find(item => item.id === selectedItemId) ?? null;
    }, [items, selectedItemId]);

    // Handle item selection
    const handleSelectItem = (itemId: number) => {
        const item = items.find(i => i.id === itemId);
        if (item) {
            setSelectedItemId(itemId);
            setRuleName(`${item.name} Alerts`);
            setStep('configure');
        }
    };

    // Reset form
    const resetForm = () => {
        setSearchQuery('');
        setSelectedItemId(preselectedItemId ?? null);
        setRuleName('');
        setThresholds({
            priceChangePercent: settings.defaultThresholds.priceChangePercent,
            volumeSpikeMultiplier: settings.defaultThresholds.volumeSpikeMultiplier,
            marginIncreasePercent: settings.defaultThresholds.marginIncreasePercent,
            newFlipperScoreMin: settings.defaultThresholds.newFlipperScoreMin
        });
        setStep('select-item');
        setIsSubmitting(false);
    };

    // Handle close
    const handleClose = () => {
        resetForm();
        onClose();
    };

    // Handle submit
    const handleSubmit = async () => {
        if (!selectedItem) return;

        setIsSubmitting(true);
        try {
            createRule({
                name: ruleName || `${selectedItem.name} Alerts`,
                itemId: selectedItem.id,
                itemName: selectedItem.name,
                itemIcon: selectedItem.icon,
                thresholds,
                enabled: true
            });
            handleClose();
        } catch (error) {
            console.error('Failed to create rule:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle threshold change
    const updateThreshold = (key: keyof AlertThresholds, value: number) => {
        setThresholds(prev => ({ ...prev, [key]: value }));
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Create Alert Rule">
            <div className="space-y-6">
                {/* Step 1: Select Item */}
                {step === 'select-item' && (
                    <div className="space-y-4">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search for an item..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                autoFocus
                            />
                        </div>

                        {/* Item List */}
                        <div className="max-h-64 overflow-y-auto space-y-1 rounded-lg border border-slate-700 bg-slate-800/50 p-2">
                            {filteredItems.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                                    <p>No items found</p>
                                </div>
                            ) : (
                                filteredItems.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelectItem(item.id)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                                            selectedItemId === item.id
                                                ? 'bg-yellow-600/20 border border-yellow-500/50'
                                                : 'hover:bg-slate-700 border border-transparent'
                                        }`}
                                    >
                                        <img
                                            src={item.icon}
                                            alt={item.name}
                                            className="w-8 h-8 rounded bg-slate-700 p-0.5"
                                        />
                                        <div className="flex-1 text-left">
                                            <div className="font-medium text-white">{item.name}</div>
                                            <div className="text-xs text-slate-400 flex items-center gap-2">
                                                <span>Margin: {formatNumber(item.margin)} gp</span>
                                                <span>•</span>
                                                <span>Score: {item.flipperScore?.toFixed(0) ?? 'N/A'}</span>
                                            </div>
                                        </div>
                                        {selectedItemId === item.id && (
                                            <Check className="h-4 w-4 text-yellow-500" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Info text */}
                        <p className="text-sm text-slate-400 text-center">
                            Select an item to monitor for price and volume changes
                        </p>
                    </div>
                )}

                {/* Step 2: Configure Thresholds */}
                {step === 'configure' && selectedItem && (
                    <div className="space-y-5">
                        {/* Selected Item Display */}
                        <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
                            <img
                                src={selectedItem.icon}
                                alt={selectedItem.name}
                                className="w-10 h-10 rounded"
                            />
                            <div className="flex-1">
                                <div className="font-semibold text-white">{selectedItem.name}</div>
                                <div className="text-sm text-slate-400">
                                    Current: {formatNumber(selectedItem.buyPrice)} gp • Margin: {formatNumber(selectedItem.margin)} gp
                                </div>
                            </div>
                            <button
                                onClick={() => setStep('select-item')}
                                className="text-sm text-yellow-500 hover:text-yellow-400"
                            >
                                Change
                            </button>
                        </div>

                        {/* Rule Name */}
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Rule Name</label>
                            <input
                                type="text"
                                value={ruleName}
                                onChange={(e) => setRuleName(e.target.value)}
                                placeholder="Enter a name for this rule"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            />
                        </div>

                        {/* Threshold Settings */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-white flex items-center gap-2">
                                <Bell className="h-4 w-4 text-yellow-500" />
                                Alert Thresholds
                            </h4>

                            {/* Price Change */}
                            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
                                <div className="flex items-center gap-2 text-white">
                                    <TrendingUp className="h-4 w-4 text-orange-500" />
                                    <span className="font-medium">Price Change</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="1"
                                        max="25"
                                        step="1"
                                        value={thresholds.priceChangePercent}
                                        onChange={(e) => updateThreshold('priceChangePercent', parseInt(e.target.value))}
                                        className="flex-1 accent-yellow-500"
                                    />
                                    <div className="w-20 text-right">
                                        <span className="text-lg font-bold text-orange-500">{thresholds.priceChangePercent}%</span>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400">Alert when price changes by this percentage</p>
                            </div>

                            {/* Volume Spike */}
                            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
                                <div className="flex items-center gap-2 text-white">
                                    <Volume2 className="h-4 w-4 text-blue-500" />
                                    <span className="font-medium">Volume Spike</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="1.5"
                                        max="10"
                                        step="0.5"
                                        value={thresholds.volumeSpikeMultiplier}
                                        onChange={(e) => updateThreshold('volumeSpikeMultiplier', parseFloat(e.target.value))}
                                        className="flex-1 accent-yellow-500"
                                    />
                                    <div className="w-20 text-right">
                                        <span className="text-lg font-bold text-blue-500">{thresholds.volumeSpikeMultiplier}x</span>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400">Alert when volume exceeds this multiplier</p>
                            </div>

                            {/* Margin Improvement */}
                            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
                                <div className="flex items-center gap-2 text-white">
                                    <Percent className="h-4 w-4 text-green-500" />
                                    <span className="font-medium">Margin Improvement</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="5"
                                        max="50"
                                        step="5"
                                        value={thresholds.marginIncreasePercent}
                                        onChange={(e) => updateThreshold('marginIncreasePercent', parseInt(e.target.value))}
                                        className="flex-1 accent-yellow-500"
                                    />
                                    <div className="w-20 text-right">
                                        <span className="text-lg font-bold text-green-500">{thresholds.marginIncreasePercent}%</span>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400">Alert when margin improves by this percentage</p>
                            </div>

                            {/* Flipper Score */}
                            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
                                <div className="flex items-center gap-2 text-white">
                                    <Star className="h-4 w-4 text-purple-500" />
                                    <span className="font-medium">Flipper Score Minimum</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="50"
                                        max="100"
                                        step="5"
                                        value={thresholds.newFlipperScoreMin}
                                        onChange={(e) => updateThreshold('newFlipperScoreMin', parseInt(e.target.value))}
                                        className="flex-1 accent-yellow-500"
                                    />
                                    <div className="w-20 text-right">
                                        <span className="text-lg font-bold text-purple-500">{thresholds.newFlipperScoreMin}</span>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400">Alert when Flipper Score reaches this level</p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setStep('select-item')}
                                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Bell className="h-4 w-4" />
                                        Create Rule
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
