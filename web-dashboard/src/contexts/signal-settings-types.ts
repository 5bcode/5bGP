// Signal settings types and constants

export type RiskLevel = 'low' | 'medium' | 'high';

export interface FrequencyOption {
    label: string;
    minutes: number;
}

export const FREQUENCY_OPTIONS: FrequencyOption[] = [
    { label: '5m', minutes: 5 },
    { label: '30m', minutes: 30 },
    { label: '2h', minutes: 120 },
    { label: '8h', minutes: 480 },
];

export interface SignalSettings {
    frequencyMinutes: number;
    riskLevel: RiskLevel;
}

export const STORAGE_KEY = 'flipto5b-signal-settings';

export const DEFAULT_SETTINGS: SignalSettings = {
    frequencyMinutes: 5,
    riskLevel: 'medium',
};
