import React, { useState, useEffect, ReactNode } from 'react';
import { SignalSettingsContext } from './signal-settings-context';
import {
    SignalSettings,
    RiskLevel,
    DEFAULT_SETTINGS,
    STORAGE_KEY,
    FREQUENCY_OPTIONS
} from './signal-settings-types';

// ============================================================================
// HELPERS
// ============================================================================

function loadSettings(): SignalSettings {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                frequencyMinutes: parsed.frequencyMinutes ?? DEFAULT_SETTINGS.frequencyMinutes,
                riskLevel: parsed.riskLevel ?? DEFAULT_SETTINGS.riskLevel,
            };
        }
    } catch (e) {
        console.warn('Failed to load signal settings:', e);
    }
    return DEFAULT_SETTINGS;
}

function saveSettings(settings: SignalSettings): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
        console.warn('Failed to save signal settings:', e);
    }
}

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function SignalSettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<SignalSettings>(loadSettings);

    // Persist on change
    useEffect(() => {
        saveSettings(settings);
    }, [settings]);

    const setFrequency = (minutes: number) => {
        setSettings(prev => ({ ...prev, frequencyMinutes: minutes }));
    };

    const setRiskLevel = (level: RiskLevel) => {
        setSettings(prev => ({ ...prev, riskLevel: level }));
    };

    // Get label for current frequency
    const frequencyLabel = FREQUENCY_OPTIONS.find(o => o.minutes === settings.frequencyMinutes)?.label
        ?? `${settings.frequencyMinutes}m`;

    return (
        <SignalSettingsContext.Provider value={{ settings, setFrequency, setRiskLevel, frequencyLabel }}>
            {children}
        </SignalSettingsContext.Provider>
    );
}
