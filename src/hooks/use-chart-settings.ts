import { useState, useEffect, useCallback } from 'react';

export interface ChartSettings {
    showChartLines: boolean;
    showPointMarkers: boolean;
    scrollEnabled: boolean;
    scaleEnabled: boolean;
    priceRounding: boolean;
    showRecentPriceLine: boolean;
    pulseRecentPrice: boolean;
    lineType: 'default' | 'stepped' | 'curved';
    priceMode: 'highlow' | 'weighted';
}

const DEFAULT_SETTINGS: ChartSettings = {
    showChartLines: true,
    showPointMarkers: false,
    scrollEnabled: true,
    scaleEnabled: true,
    priceRounding: true,
    showRecentPriceLine: true,
    pulseRecentPrice: true,
    lineType: 'default',
    priceMode: 'highlow',
};

const STORAGE_KEY = 'flipto5b-chart-settings';

export function useChartSettings() {
    const [settings, setSettings] = useState<ChartSettings>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.warn('Failed to parse chart settings from localStorage:', e);
        }
        return DEFAULT_SETTINGS;
    });

    // Persist to localStorage whenever settings change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {
            console.warn('Failed to save chart settings to localStorage:', e);
        }
    }, [settings]);

    const updateSettings = useCallback((updates: Partial<ChartSettings>) => {
        setSettings(prev => ({ ...prev, ...updates }));
    }, []);

    const resetSettings = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
    }, []);

    const toggleSetting = useCallback((key: keyof ChartSettings) => {
        setSettings(prev => {
            const value = prev[key];
            if (typeof value === 'boolean') {
                return { ...prev, [key]: !value };
            }
            return prev;
        });
    }, []);

    return {
        settings,
        updateSettings,
        resetSettings,
        toggleSetting,
    };
}

export type { ChartSettings as ChartSettingsType };
