import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Bell, X, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarketAlert } from '@/components/LiveFeed';
import { formatGP } from '@/lib/osrs-math';
import { Link } from 'react-router-dom';

interface NotificationCenterProps {
  alerts: MarketAlert[];
  onClear: () => void;
  onRemove: (id: string) => void;
}

const NotificationCenter = ({ alerts, onClear, onRemove }: NotificationCenterProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-slate-100">
          <Bell className="h-5 w-5" />
          {alerts.length > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 animate-pulse ring-2 ring-slate-950" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-slate-950 border-slate-800 text-slate-200 shadow-xl">
        <DropdownMenuLabel className="flex items-center justify-between">
            <span>Notifications</span>
            {alerts.length > 0 && (
                <button 
                    onClick={(e) => { e.preventDefault(); onClear(); }}
                    className="text-xs text-slate-500 hover:text-rose-500 font-normal"
                >
                    Clear All
                </button>
            )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-800" />
        
        <ScrollArea className="h-[300px]">
            {alerts.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                    <Bell className="mx-auto h-8 w-8 mb-2 opacity-20" />
                    No recent alerts
                </div>
            ) : (
                <div className="flex flex-col">
                    {alerts.map(alert => (
                        <div key={alert.id} className="p-3 hover:bg-slate-900 border-b border-slate-900 relative group">
                            <Link to={`/item/${alert.itemId}`} className="block">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-sm text-slate-200">{alert.itemName}</span>
                                    <span className="text-xs text-slate-500">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    {alert.dropPercent > 0 ? (
                                        <div className="flex items-center text-rose-500 gap-1">
                                            <TrendingDown size={12} />
                                            <span>-{alert.dropPercent.toFixed(1)}%</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center text-emerald-500 gap-1">
                                            <TrendingUp size={12} />
                                            <span>Opportunity</span>
                                        </div>
                                    )}
                                    <span className="text-slate-400 font-mono">
                                        {formatGP(alert.price)}
                                    </span>
                                </div>
                            </Link>
                            <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(alert.id); }}
                                className="absolute top-2 right-2 p-1 text-slate-600 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationCenter;