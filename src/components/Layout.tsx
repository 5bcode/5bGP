import React from 'react';
import { Link } from 'react-router-dom';
import { Terminal, BarChart2, TrendingUp } from 'lucide-react';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tighter">
            <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center text-slate-950">
              <Terminal size={20} />
            </div>
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              FlipTo5B
            </span>
          </Link>
          
          <div className="flex items-center gap-6 text-sm font-medium text-slate-400">
            <Link to="/" className="hover:text-emerald-400 transition-colors flex items-center gap-2">
              <BarChart2 size={16} /> Dashboard
            </Link>
            <div className="flex items-center gap-2 px-3 py-1 bg-rose-500/10 text-rose-400 rounded-full border border-rose-500/20 text-xs animate-pulse">
              <TrendingUp size={12} /> Live API
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;