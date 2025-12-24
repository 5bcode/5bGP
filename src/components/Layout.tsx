import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Terminal, BarChart2, TrendingUp, Command, History, Radar } from 'lucide-react';
import MarketTicker from './MarketTicker';
import CommandMenu from './CommandMenu';
import { cn } from '@/lib/utils';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 flex flex-col">
      <MarketTicker />
      <CommandMenu />
      
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tighter hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
              <Terminal size={20} />
            </div>
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              FlipTo5B
            </span>
          </Link>
          
          <div className="flex items-center gap-6 text-sm font-medium text-slate-400">
            <Link 
                to="/" 
                className={cn("hover:text-emerald-400 transition-colors flex items-center gap-2", isActive('/') && "text-emerald-400")}
            >
              <BarChart2 size={16} /> Dashboard
            </Link>
            
            <Link 
                to="/scanner" 
                className={cn("hover:text-emerald-400 transition-colors flex items-center gap-2", isActive('/scanner') && "text-emerald-400")}
            >
              <Radar size={16} /> Scanner
            </Link>

            <Link 
                to="/history" 
                className={cn("hover:text-emerald-400 transition-colors flex items-center gap-2", isActive('/history') && "text-emerald-400")}
            >
              <History size={16} /> History
            </Link>

            <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded bg-slate-800/50 border border-slate-800 text-xs text-slate-500 ml-4">
                <Command size={10} />
                <span>Ctrl + J</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 flex-1">
        {children}
      </main>

      <footer className="border-t border-slate-900 py-6 mt-auto bg-slate-950">
        <div className="container mx-auto px-4 text-center text-slate-600 text-xs">
            <p>OSRS FlipTo5B Terminal • Data provided by OSRS Wiki</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;