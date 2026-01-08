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
import { usePriceMonitorContext } from '@/context/usePriceMonitor';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isPaper, toggleMode } = useTradeMode();
  const { signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { alerts, clearAlerts, removeAlert } = usePriceMonitorContext();

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const NavLinks = () => (
    <div className="flex flex-col md:flex-row gap-1 md:gap-2">
      {[
        { to: "/", icon: <BarChart2 size={18} />, label: "Dashboard" },
        { to: "/scanner", icon: <Radar size={18} />, label: "Scanner" },
        { to: "/history", icon: <History size={18} />, label: "History" },
        { to: "/tools", icon: <Calculator size={18} />, label: "Tools" },
        { to: "/slots", icon: <TrendingUp size={18} />, label: "Slots" },
      ].map((link) => (
        <Link
          key={link.to}
          to={link.to}
          onClick={() => setMobileMenuOpen(false)}
          className={cn(
            "nav-link flex items-center gap-2",
            isActive(link.to) && "nav-link-active"
          )}
        >
          {link.icon}
          <span className="font-medium">{link.label}</span>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen font-sans selection:bg-emerald-500/30 flex flex-col bg-slate-950 text-slate-100 overflow-x-hidden">
      {/* Dynamic Background Glow */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 blur-[120px] rounded-full animate-float" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 blur-[120px] rounded-full animate-float" style={{ animationDelay: '-3s' }} />
      </div>

      <CommandMenu />

      <nav className="border-b border-white/5 bg-slate-950/60 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3 group">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-slate-950 shadow-xl transition-all duration-500 group-hover:rotate-12 group-hover:scale-110",
                isPaper ? "bg-amber-500 shadow-amber-500/20" : "bg-emerald-500 shadow-emerald-500/20"
              )}>
                <Terminal size={22} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className={cn(
                  "font-black text-xl tracking-tight leading-none transition-colors",
                  isPaper ? "text-amber-500" : "text-white"
                )}>
                  FlipTo5B
                </span>
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">
                  Terminal v2.0
                </span>
              </div>
            </Link>

            <div className="hidden lg:block ml-4">
              <NavLinks />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Desktop Mode Toggle */}
            <div className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/5">
              <span className={cn(
                "text-[10px] font-black tracking-widest uppercase transition-colors",
                isPaper ? "text-amber-400" : "text-slate-500"
              )}>
                {isPaper ? "Simulation" : "Live"}
              </span>
              <Switch
                checked={isPaper}
                onCheckedChange={toggleMode}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>

            <div className="h-8 w-px bg-white/5 mx-2 hidden md:block" />

            {/* Notification Center */}
            <NotificationCenter
              alerts={alerts}
              onClear={clearAlerts}
              onRemove={removeAlert}
            />

            <div className="flex items-center gap-2">
              <Link to="/profile">
                <Button variant="ghost" size="icon" className={cn(
                  "w-10 h-10 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all",
                  isActive('/profile') && "text-emerald-400 bg-emerald-400/10"
                )}>
                  <User size={20} />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="w-10 h-10 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
              >
                <LogOut size={20} />
              </Button>

              {/* Mobile Menu Trigger */}
              <div className="lg:hidden ml-2">
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-slate-400 hover:bg-white/5">
                      <Menu size={24} />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="bg-slate-950/95 backdrop-blur-2xl border-l border-white/5 text-slate-100 p-0">
                    <div className="flex flex-col h-full p-8">
                      <div className="flex items-center gap-3 mb-10">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-slate-950", isPaper ? "bg-amber-500" : "bg-emerald-500")}>
                          <Terminal size={22} />
                        </div>
                        <span className="font-black text-2xl tracking-tight">FlipTo5B</span>
                      </div>

                      <nav className="flex-1">
                        <NavLinks />
                      </nav>

                      <div className="mt-auto space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                          <Label className={cn("text-xs font-black tracking-widest uppercase", isPaper ? "text-amber-400" : "text-slate-500")}>
                            {isPaper ? "Simulation Mode" : "Live Trading"}
                          </Label>
                          <Switch
                            checked={isPaper}
                            onCheckedChange={toggleMode}
                            className="data-[state=checked]:bg-amber-500"
                          />
                        </div>
                        <Button
                          onClick={handleSignOut}
                          variant="outline"
                          className="w-full h-14 rounded-2xl border-rose-500/20 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all font-bold uppercase tracking-widest text-xs"
                        >
                          <LogOut className="mr-2" size={18} /> Exit Terminal
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 relative z-10 w-full">
        <div className="container mx-auto px-4 md:px-6 py-8">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-white/5 py-10 mt-20 relative z-10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-40 grayscale group hover:grayscale-0 transition-all duration-500">
            <Terminal size={14} />
            <span className="text-[10px] uppercase font-bold tracking-[0.3em]">FlipTo5B OS v2.0</span>
          </div>
          <div className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em] flex gap-8">
            <span className="hover:text-emerald-400 transition-colors cursor-default">Wiki Data API</span>
            <span className="hover:text-emerald-400 transition-colors cursor-default">Realtime Engine</span>
            <span className="hover:text-emerald-400 transition-colors cursor-default">Privacy</span>
          </div>
          <div className="text-slate-600 text-[10px] uppercase font-bold tracking-[0.1em] text-center md:text-right">
            <p>Alt+D (Dashboard) • Alt+S (Scanner) • Alt+H (History) • Alt+T (Tools)</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
