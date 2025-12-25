import React from 'react';
import { useLatestPrices } from '@/hooks/use-osrs-query';
import { formatGP } from '@/lib/osrs-math';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const TICKER_ITEMS = [
  { id: 13190, name: 'Bond' },
  { id: 20997, name: 'T-Bow' },
  { id: 22481, name: 'Scythe' },
  { id: 27275, name: 'Shadow' },
  { id: 12817, name: 'Ely' },
  { id: 22324, name: 'Ghrazi' },
  { id: 21000, name: 'Buckler' },
  { id: 12926, name: 'Blowpipe' },
  { id: 4151,  name: 'Whip' },
  { id: 5698,  name: 'DDS' },
];

const MarketTicker = () => {
  // Use the shared hook. This will dedup requests with Dashboard/other pages.
  // We don't control the interval here directly, the hook handles it (default 60s).
  const { data: prices, isLoading } = useLatestPrices();

  if (isLoading || !prices) {
      return (
        <div className="w-full bg-slate-950 border-b border-slate-900 h-8 flex items-center justify-center">
            <Loader2 className="h-3 w-3 animate-spin text-slate-600" />
        </div>
      );
  }

  return (
    <div className="w-full bg-slate-950 border-b border-slate-900 overflow-hidden h-8 flex items-center relative group">
      {/* 
         We duplicate the list to ensure the marquee has enough content to scroll seamlessly 
         even on wide screens.
      */}
      <div className="flex animate-scroll whitespace-nowrap gap-8 min-w-full px-4 group-hover:[animation-play-state:paused]">
        {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => {
            const price = prices[item.id];
            if (!price) return null;

            return (
                <Link 
                    to={`/item/${item.id}`} 
                    key={`${item.id}-${idx}`} 
                    className="flex items-center gap-2 text-xs font-mono hover:bg-slate-900 px-2 py-0.5 rounded transition-colors"
                >
                    <span className="text-slate-500 font-bold uppercase">{item.name}</span>
                    <span className="text-emerald-400">{formatGP(price.high)}</span>
                </Link>
            );
        })}
      </div>
      
      {/* Gradient masks for smooth fade effect at edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-950 to-transparent pointer-events-none"></div>
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none"></div>

      <style>{`
        .animate-scroll {
            animation: scroll 40s linear infinite;
        }
        @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-33.33%); } /* Move 1/3 since we tripled the list */
        }
      `}</style>
    </div>
  );
};

export default MarketTicker;