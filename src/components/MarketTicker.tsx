import React, { useEffect, useState } from 'react';
import { osrsApi, PriceData, Item } from '@/services/osrs-api';
import { formatGP } from '@/lib/osrs-math';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';

const TICKER_ITEMS = [
  { id: 13190, name: 'Bond' },
  { id: 20997, name: 'Twisted Bow' },
  { id: 22481, name: 'Scythe' },
  { id: 27275, name: 'Shadow' },
  { id: 12817, name: 'Ely' },
  { id: 22324, name: 'Ghrazi' },
  { id: 21000, name: 'Buckler' },
  { id: 12926, name: 'Blowpipe' },
];

const MarketTicker = () => {
  const [prices, setPrices] = useState<Record<number, PriceData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTicker = async () => {
      try {
        const allPrices = await osrsApi.getLatestPrices();
        const tickerData: Record<number, PriceData> = {};
        
        TICKER_ITEMS.forEach(item => {
          if (allPrices[item.id]) {
            tickerData[item.id] = allPrices[item.id];
          }
        });
        
        setPrices(tickerData);
      } catch (error) {
        console.error("Ticker failed", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTicker();
    const interval = setInterval(fetchTicker, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) return null;

  return (
    <div className="w-full bg-slate-950 border-b border-slate-900 overflow-hidden h-8 flex items-center">
      <div className="flex animate-scroll whitespace-nowrap gap-8 min-w-full px-4">
        {/* Duplicate list for seamless scrolling effect if needed, 
            but for simplicity just a flex row. Ideally this should use a marquee lib or CSS animation.
            We'll stick to a simple scrollable overflow or marquee if CSS allows.
        */}
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => {
            const price = prices[item.id];
            if (!price) return null;

            // Simple trend logic (High vs Low as a proxy for volatility/movement direction is hard without history, 
            // so we just show the Active Traded Price (usually approx between high/low or just high))
            // Let's show the High (Sell) price.
            
            return (
                <Link to={`/item/${item.id}`} key={`${item.id}-${idx}`} className="flex items-center gap-2 text-xs font-mono hover:bg-slate-900 px-2 py-0.5 rounded transition-colors">
                    <span className="text-slate-400 font-bold">{item.name}</span>
                    <span className="text-emerald-400">{formatGP(price.high)}</span>
                    {/* Placeholder trend icon since we don't have 24h delta in this specific view easily available without joining stats */}
                </Link>
            );
        })}
      </div>
      <style>{`
        .animate-scroll {
            animation: scroll 30s linear infinite;
        }
        @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        .animate-scroll:hover {
            animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default MarketTicker;