import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

type TradeMode = 'live' | 'paper';

interface TradeModeContextType {
  mode: TradeMode;
  toggleMode: () => void;
  isPaper: boolean;
}

const TradeModeContext = createContext<TradeModeContextType | undefined>(undefined);

export const TradeModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<TradeMode>(() => {
    // Check if window is defined (for safety, though this is SPA)
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('tradeMode') as TradeMode) || 'live';
    }
    return 'live';
  });

  useEffect(() => {
    localStorage.setItem('tradeMode', mode);
    if (mode === 'paper') {
      document.body.classList.add('paper-mode');
    } else {
      document.body.classList.remove('paper-mode');
    }
  }, [mode]);

  const toggleMode = () => {
    const newMode = mode === 'live' ? 'paper' : 'live';
    setMode(newMode);
    toast.info(`Switched to ${newMode === 'live' ? 'Live' : 'Paper'} Trading`);
  };

  return (
    <TradeModeContext.Provider value={{ mode, toggleMode, isPaper: mode === 'paper' }}>
      {children}
    </TradeModeContext.Provider>
  );
};

export const useTradeMode = () => {
  const context = useContext(TradeModeContext);
  if (context === undefined) {
    throw new Error('useTradeMode must be used within a TradeModeProvider');
  }
  return context;
};