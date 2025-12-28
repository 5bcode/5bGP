import React, { useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { Terminal, BarChart2, TrendingUp, Command, History, Radar, ScrollText, Calculator } from 'lucide-react';
import MarketTicker from './MarketTicker';
import CommandMenu from './CommandMenu';
import { cn } from '@/lib/utils';
import { useTradeMode } from '@/context/TradeModeContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isPaper, toggleMode } = useTradeMode();

  const isActive = (path: string) => location.pathname === path;

  // Global Hotkeys
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // Alt+S for Scanner
          if (e.altKey && e.code === 'KeyS') {
              e.preventDefault();
              navigate('/scanner');
          }
          // Alt+D for Dashboard
          if (e.altKey && e.code === 'KeyD') {
              e.preventDefault();
              navigate('/');
          }
          // Alt+H for History
          if (e.altKey && e.code === 'KeyH') {
              e.preventDefault();
              navigate('/history');
          }
          // Alt+T for Tools
          if (e.altKey && e.code === 'KeyT') {
              e.preventDefault();
              navigate('/tools');
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 flex flex-col">
      <div className={cn("transition-colors duration-300", isPaper ? "border-b-4 border-amber-500" : "")}>
        <MarketTicker />
      </div>
      <CommandMenu />
      
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tighter hover:opacity-80 transition-opacity">
            <div className={cn("w-8 h-8 rounded flex items-center justify-center text-slate-950 shadow-lg transition-colors", isPaper ? "bg-amber-500 shadow-amber-500/20" : "bg-emerald-500 shadow-emerald-500/20")}>
              <Terminal size={20} />
            </div>
            <span className={cn("bg-clip-text text-transparent bg-gradient-to-r", isPaper ? "from-amber-400 to-amber-600" : "from-emerald-400 to-emerald-600")}>
              {isPaper ? "FlipTo5B [SIM]" : "FlipTo5B"}
            </span>
          </Link>
          
          <div className="flex items-center gap-6 text-sm font-medium text-slate-400">
            <Link 
                to="/" 
                className={cn("hover:text-emerald-400 transition-colors flex items-center gap-2", isActive('/') && (isPaper ? "text-amber-400" : "text-emerald-400"))}
            >
              <BarChart2 size={16} /> Dashboard
            </Link>
            
            <Link 
                to="/scanner" 
                className={cn("hover:text-emerald-400 transition-colors flex items-center gap-2", isActive('/scanner') && (isPaper ? "text-amber-400" : "text-emerald-400"))}
            >
              <Radar size={16} /> Scanner
            </Link>

            <Link 
                to="/history" 
                className={cn("hover:text-emerald-400 transition-colors flex items-center gap-2", isActive('/history') && (isPaper ? "text-amber-400" : "text-emerald-400"))}
            >
              <History size={16} /> History
            </Link>

             <Link 
                to="/tools" 
                className={cn("hover:text-emerald-400 transition-colors flex items-center gap-2", isActive('/tools') && (isPaper ? "text-amber-400" : "text-emerald-400"))}
            >
              <Calculator size={16} /> Tools
            </Link>

            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-800">
                <Switch 
                    checked={isPaper} 
                    onCheckedChange={toggleMode}
                    className="data-[state=checked]:bg-amber-500"
                />
                <Label className={cn("text-xs font-mono", isPaper ? "text-amber-400 font-bold" : "text-slate-500")}>
                    {isPaper ? "PAPER TRADING" : "LIVE"}
                </Label>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-900 py-6 mt-auto bg-slate-950">
        <div className="container mx-auto px-4 text-center text-slate-600 text-xs">
            <p>OSRS FlipTo5B Terminal • Data provided by OSRS Wiki</p>
            <p className="mt-1 opacity-50">Alt+D (Dashboard) • Alt+S (Scanner) • Alt+H (History) • Alt+T (Tools)</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;