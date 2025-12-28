import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

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
      const saved = localStorage.getItem('appSettings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    // Optional: Toast on significant changes could go here
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