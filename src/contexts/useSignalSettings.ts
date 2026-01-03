import { useContext } from 'react';
import { SignalSettingsContext, SignalSettingsContextType } from './signal-settings-context';

export function useSignalSettings(): SignalSettingsContextType {
    const context = useContext(SignalSettingsContext);
    if (!context) {
        throw new Error('useSignalSettings must be used within SignalSettingsProvider');
    }
    return context;
}
