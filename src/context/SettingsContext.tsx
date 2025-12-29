import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
  const { user } = useAuth();
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window !== 'undefined') {
      // Load non-sensitive settings from localStorage
      const localSaved = localStorage.getItem('appSettings');
      const localData = localSaved ? JSON.parse(localSaved) : {};
      
      // Initialize with defaults + local storage
      return { ...DEFAULT_SETTINGS, ...localData, discordWebhookUrl: '' };
    }
    return DEFAULT_SETTINGS;
  });

  // Load sensitive settings (Webhook) from DB when user logs in
  useEffect(() => {
    if (!user) {
        setSettings(prev => ({ ...prev, discordWebhookUrl: '' }));
        return;
    }

    const loadProfileSettings = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('discord_webhook')
            .eq('id', user.id)
            .single();
        
        if (!error && data) {
            setSettings(prev => ({ 
                ...prev, 
                discordWebhookUrl: data.discord_webhook || '' 
            }));
        }
    };

    loadProfileSettings();
  }, [user]);

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    // 1. Update State immediately for responsiveness
    setSettings(prev => ({ ...prev, ...newSettings }));

    // 2. Separate persistence logic
    // LocalStorage for UI preferences
    const { discordWebhookUrl, ...publicSettings } = { ...settings, ...newSettings };
    localStorage.setItem('appSettings', JSON.stringify(publicSettings));

    // Database for sensitive/cloud settings (only if changed and user exists)
    if (newSettings.discordWebhookUrl !== undefined && user) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ discord_webhook: newSettings.discordWebhookUrl })
                .eq('id', user.id);
            
            if (error) throw error;
        } catch (err) {
            console.error("Failed to sync webhook to profile", err);
            toast.error("Failed to save webhook to cloud profile");
        }
    }
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