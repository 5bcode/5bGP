import { createContext } from 'react';
import { SignalSettings, RiskLevel } from './signal-settings-types';

export interface SignalSettingsContextType {
    settings: SignalSettings;
    setFrequency: (minutes: number) => void;
    setRiskLevel: (level: RiskLevel) => void;
    frequencyLabel: string;
}

export const SignalSettingsContext = createContext<SignalSettingsContextType | null>(null);
