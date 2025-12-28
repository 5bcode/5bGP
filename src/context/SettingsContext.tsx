import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AppSettings {
  alertThreshold: number; // Percentage
  refreshInterval: number; // Seconds
  soundEnabled: boolean;
  discordWebhookUrl: string;
  compactMode: boolean;
  showFavoritesOnly: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  alertThreshold: 5,
  refreshInterval: 60,
  soundEnabled: true,
  discordWebhookUrl: '',
  compactMode: false,
  showFavoritesOnly: false,
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window !== 'undefined') {
      // Load public settings from localStorage
      const localSaved = localStorage.getItem('appSettings');
      // Load secrets from sessionStorage (cleared on tab close)
      const sessionSaved = sessionStorage.getItem('appSettings_secrets');
      
      const localData = localSaved ? JSON.parse(localSaved) : {};
      const sessionData = sessionSaved ? JSON.parse(sessionSaved) : {};
      
      return { ...DEFAULT_SETTINGS, ...localData, ...sessionData };
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    // Separate sensitive data from public settings
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { discordWebhookUrl, ...publicSettings } = settings;
    
    // Store non-sensitive settings persistently
    localStorage.setItem('appSettings', JSON.stringify(publicSettings));
    
    // Store secrets only for the session
    sessionStorage.setItem('appSettings_secrets', JSON.stringify({ discordWebhookUrl: settings.discordWebhookUrl }));
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};