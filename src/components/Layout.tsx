import React, { useEffect, useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { Terminal, BarChart2, TrendingUp, Command, History, Radar, ScrollText, Calculator, LogOut, User, Menu, X } from 'lucide-react';
import MarketTicker from './MarketTicker';
import CommandMenu from './CommandMenu';
import { cn } from '@/lib/utils';
import { useTradeMode } from '@/context/TradeModeContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import NotificationCenter from '@/components/NotificationCenter';
import { usePriceMonitorContext } from '@/context/PriceMonitorContext';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isPaper, toggleMode } = useTradeMode();
  const { signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Get Global Alerts
  const { alerts, clearAlerts, removeAlert } = usePriceMonitorContext();

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const NavLinks = () => (
    <>
        <Link 
            to="/" 
            onClick={() => setMobileMenuOpen(false)}
            className={cn("hover:text-emerald-400 transition-colors flex items-center gap-2 py-2", isActive('/') && (isPaper ? "text-amber-400" : "text-emerald-400"))}
        >
          <BarChart2 size={18} /> Dashboard
        </Link>
        
        <Link 
            to="/scanner" 
            onClick={() => setMobileMenuOpen(false)}
            className={cn("hover:text-emerald-400 transition-colors flex items-center gap-2 py-2", isActive('/scanner') && (isPaper ? "text-amber-400" : "text-emerald-400"))}
        >
          <Radar size={18} /> Scanner
        </Link>

        <Link 
            to="/history" 
            onClick={() => setMobileMenuOpen(false)}
            className={cn("hover:text-emerald-400 transition-colors flex items-center gap-2 py-2", isActive('/history') && (isPaper ? "text-amber-400" : "text-emerald-400"))}
        >
          <History size={18} /> History
        </Link>

         <Link 
            to="/tools" 
            onClick={() => setMobileMenuOpen(false)}
            className={cn("hover:text-emerald-400 transition-colors flex items-center gap-2 py-2", isActive('/tools') && (isPaper ? "text-amber-400" : "text-emerald-400"))}
        >
          <Calculator size={18} /> Tools
        </Link>
    </>
  );

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
          <div className="flex items-center gap-4">
              {/* Mobile Menu Trigger */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden text-slate-400">
                        <Menu />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="bg-slate-950 border-r border-slate-800 text-slate-100 w-[280px]">
                    <SheetHeader className="mb-6 text-left">
                        <SheetTitle className="flex items-center gap-2 text-slate-100">
                            <div className={cn("w-8 h-8 rounded flex items-center justify-center text-slate-950", isPaper ? "bg-amber-500" : "bg-emerald-500")}>
                                <Terminal size={20} />
                            </div>
                            FlipTo5B
                        </SheetTitle>
                    </SheetHeader>
                    <div className="flex flex-col gap-2 text-lg font-medium">
                        <NavLinks />
                        
                        <div className="h-px bg-slate-800 my-4" />
                        
                        <Link 
                            to="/profile" 
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn("hover:text-emerald-400 transition-colors flex items-center gap-2 py-2", isActive('/profile') && "text-emerald-400")}
                        >
                            <User size={18} /> Profile
                        </Link>
                        
                         <button 
                            onClick={() => {
                                setMobileMenuOpen(false);
                                handleSignOut();
                            }}
                            className="hover:text-rose-500 transition-colors flex items-center gap-2 py-2 text-slate-400 text-left"
                        >
                            <LogOut size={18} /> Sign Out
                        </button>
                    </div>
                    
                    <div className="absolute bottom-8 left-6 right-6">
                        <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-800">
                             <Label className={cn("text-xs font-mono font-bold", isPaper ? "text-amber-400" : "text-slate-500")}>
                                {isPaper ? "SIMULATION" : "LIVE MODE"}
                            </Label>
                            <Switch 
                                checked={isPaper} 
                                onCheckedChange={toggleMode}
                                className="data-[state=checked]:bg-amber-500"
                            />
                        </div>
                    </div>
                </SheetContent>
              </Sheet>

              <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tighter hover:opacity-80 transition-opacity">
                <div className={cn("w-8 h-8 rounded flex items-center justify-center text-slate-950 shadow-lg transition-colors hidden sm:flex", isPaper ? "bg-amber-500 shadow-amber-500/20" : "bg-emerald-500 shadow-emerald-500/20")}>
                  <Terminal size={20} />
                </div>
                <span className={cn("bg-clip-text text-transparent bg-gradient-to-r", isPaper ? "from-amber-400 to-amber-600" : "from-emerald-400 to-emerald-600")}>
                  {isPaper ? "FlipTo5B [SIM]" : "FlipTo5B"}
                </span>
              </Link>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <NavLinks />

            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-800">
                <Switch 
                    checked={isPaper} 
                    onCheckedChange={toggleMode}
                    className="data-[state=checked]:bg-amber-500"
                />
                <Label className={cn("text-xs font-mono", isPaper ? "text-amber-400 font-bold" : "text-slate-500")}>
                    {isPaper ? "PAPER" : "LIVE"}
                </Label>
            </div>

            {/* Notification Center */}
            <NotificationCenter 
                alerts={alerts}
                onClear={clearAlerts}
                onRemove={removeAlert}
            />

            <div className="flex items-center gap-1 border-l border-slate-800 ml-4 pl-4">
              <Link to="/profile">
                <Button variant="ghost" size="icon" className={cn("text-slate-500 hover:text-emerald-400", isActive('/profile') && "text-emerald-400 bg-emerald-500/10")} title="Profile">
                    <User size={16} />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-slate-500 hover:text-rose-500 hover:bg-rose-500/10" title="Sign Out">
                  <LogOut size={16} />
              </Button>
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
            <p className="mt-1 opacity-50 hidden sm:block">Alt+D (Dashboard) • Alt+S (Scanner) • Alt+H (History) • Alt+T (Tools)</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;